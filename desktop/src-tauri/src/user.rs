use crate::project::Project;
use crate::storage::storage;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

pub const SCAN_SETTINGS_STORAGE_KEY: &str = "scan_settings";
pub const LOCAL_PROJECTS_STORAGE_KEY: &str = "local_projects";

pub struct User {
	pub projects: Mutex<Vec<Project>>,
}

lazy_static! {
	static ref USER: User = User { projects: Mutex::new(vec![]) };
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanSettings {
	#[serde(default = "default_excluded_expressions")]
	pub excluded_expressions: Vec<String>, // en plus du .gitignore si présent
	#[serde(default = "default_follow_symlinks")]
	pub follow_symlinks: bool,
}

fn default_excluded_expressions() -> Vec<String> {
	vec![
		"node_modules".to_string(),
		".git".to_string(),
		".svn".to_string(),
		".hg".to_string(),
		"dist".to_string(),
		"build".to_string(),
		"out".to_string(),
		"target".to_string(),
		".next".to_string(),
		".vite".to_string(),
		".expo".to_string(),
		".vscode".to_string(),
		".github".to_string(),
		".nuxt".to_string(),
		".turbo".to_string(),
		"coverage".to_string(),
		"__pycache__".to_string(),
		".pytest_cache".to_string(),
		".venv".to_string(),
		"var".to_string(),
		"venv".to_string(),
		"vendor".to_string(),
		"bin".to_string(),
		"obj".to_string(),
		"CMakeFiles".to_string(),
		"*lock.*".to_string(),
		"*lib*".to_string(),
	]
}

fn default_follow_symlinks() -> bool {
	false
}

impl Default for ScanSettings {
	fn default() -> Self {
		Self {
			excluded_expressions: default_excluded_expressions(),
			follow_symlinks: default_follow_symlinks(),
		}
	}
}

pub fn user() -> &'static User {
	&USER
}

impl User {
	fn json_to_project(&self, value: &JsonValue) -> Option<Project> {
		let path = value.get("path").and_then(|v| v.as_str())?.to_string();
		let name = value.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();

		Some(Project::new(name, path))
	}

	fn sync_projects_from_json(&self, items: &[JsonValue]) {
		if let Ok(mut projects) = self.projects.lock() {
			*projects = items.iter().filter_map(|p| self.json_to_project(p)).collect();
		}
	}

	pub fn load_scan_settings(&self) -> Result<ScanSettings, String> {
		let store = storage();
		match store.read_json::<ScanSettings>(SCAN_SETTINGS_STORAGE_KEY) {
			Ok(settings) => Ok(settings),
			Err(_) => {
				let defaults = ScanSettings::default();
				self.save_scan_settings(&defaults)?;
				Ok(defaults)
			}
		}
	}

	pub fn save_scan_settings(&self, settings: &ScanSettings) -> Result<(), String> {
		storage().write_json(SCAN_SETTINGS_STORAGE_KEY, settings)
	}

	pub fn list_projects(&self) -> Result<Vec<JsonValue>, String> {
		match storage().read_json::<Vec<JsonValue>>(LOCAL_PROJECTS_STORAGE_KEY) {
			Ok(list) => {
				self.sync_projects_from_json(&list);
				Ok(list)
			}
			Err(_) => {
				self.sync_projects_from_json(&[]);
				Ok(vec![])
			}
		}
	}

	pub fn get_project(&self, id: &str) -> Result<Option<JsonValue>, String> {
		let list = self.list_projects()?;
		let found =
			list.into_iter().find(|p| p.get("id").and_then(|v| v.as_str()).unwrap_or("") == id);
		Ok(found)
	}

	pub fn upsert_project(&self, project: JsonValue) -> Result<(), String> {
		let mut list = self.list_projects()?;
		let pid = project.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
		if pid.is_empty() {
			return Err("project.id required".into());
		}

		let mut replaced = false;
		for p in &mut list {
			let id = p.get("id").and_then(|v| v.as_str()).unwrap_or("");
			if id == pid {
				*p = project.clone();
				replaced = true;
				break;
			}
		}

		if !replaced {
			list.insert(0, project);
		}

		storage().write_json(LOCAL_PROJECTS_STORAGE_KEY, &list)?;
		self.sync_projects_from_json(&list);
		Ok(())
	}

	pub fn delete_project(&self, id: &str) -> Result<(), String> {
		let list = self.list_projects()?;
		let next: Vec<JsonValue> = list
			.into_iter()
			.filter(|p| p.get("id").and_then(|v| v.as_str()).unwrap_or("") != id)
			.collect();
		storage().write_json(LOCAL_PROJECTS_STORAGE_KEY, &next)?;
		self.sync_projects_from_json(&next);
		Ok(())
	}

	pub fn set_projects_order(&self, projects: Vec<JsonValue>) -> Result<(), String> {
		for project in &projects {
			let id = project.get("id").and_then(|v| v.as_str()).unwrap_or("");
			if id.is_empty() {
				return Err("project.id required".into());
			}
		}

		storage().write_json(LOCAL_PROJECTS_STORAGE_KEY, &projects)?;
		self.sync_projects_from_json(&projects);
		Ok(())
	}

	pub fn merge_auto_scan_projects(
		&self,
		projects: Vec<JsonValue>,
	) -> Result<Vec<JsonValue>, String> {
		let current = self.list_projects()?;
		let mut current_by_id: HashMap<String, &JsonValue> = HashMap::new();
		for project in &current {
			let id = project.get("id").and_then(|value| value.as_str()).unwrap_or("");
			if !id.is_empty() {
				current_by_id.insert(id.to_string(), project);
			}
		}

		let mut seen_ids: HashSet<String> = HashSet::new();
		let mut ordered: Vec<JsonValue> = Vec::with_capacity(projects.len());

		for candidate in projects {
			let id = candidate.get("id").and_then(|value| value.as_str()).unwrap_or("").to_string();
			if id.is_empty() || !seen_ids.insert(id.clone()) {
				continue;
			}

			if let Some(existing) = current_by_id.get(&id) {
				let existing_name = existing
					.get("name")
					.and_then(|value| value.as_str())
					.unwrap_or("")
					.trim()
					.to_string();
				let candidate_name = candidate
					.get("name")
					.and_then(|value| value.as_str())
					.unwrap_or("")
					.trim()
					.to_string();
				let path = candidate
					.get("path")
					.and_then(|value| value.as_str())
					.unwrap_or("")
					.to_string();

				ordered.push(serde_json::json!({
					"id": id,
					"name": if existing_name.is_empty() { candidate_name } else { existing_name },
					"path": path
				}));
			} else {
				ordered.push(candidate);
			}
		}

		storage().write_json(LOCAL_PROJECTS_STORAGE_KEY, &ordered)?;
		self.sync_projects_from_json(&ordered);
		Ok(ordered)
	}
}
