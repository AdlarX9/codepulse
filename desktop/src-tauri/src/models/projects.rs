use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::models::general_settings::load_general_settings;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProjectBindings {
	pub bindings: HashMap<String, String>, // project_id -> base_path
}

fn bindings_path() -> Result<PathBuf, String> {
	let config_dir =
		dirs::config_dir().ok_or_else(|| "Could not find config directory".to_string())?;
	let app_dir = config_dir.join("codepulse");
	if !app_dir.exists() {
		fs::create_dir_all(&app_dir)
			.map_err(|e| format!("Failed to create config directory: {}", e))?;
	}
	Ok(app_dir.join("projects.json"))
}

pub fn load_bindings() -> Result<ProjectBindings, String> {
	let path = bindings_path()?;
	if !path.exists() {
		let b = ProjectBindings::default();
		save_bindings(&b)?;
		return Ok(b);
	}
	let content =
		fs::read_to_string(&path).map_err(|e| format!("Failed to read project bindings: {}", e))?;

	match serde_json::from_str::<ProjectBindings>(&content) {
		Ok(parsed) => Ok(parsed),
		Err(err) => {
			// Attempt to salvage malformed data (e.g. legacy null values)
			let value: JsonValue = serde_json::from_str(&content)
				.map_err(|_| format!("Failed to parse project bindings: {}", err))?;

			let mut sanitized = ProjectBindings::default();
			if let Some(bindings_obj) = value.get("bindings").and_then(|b| b.as_object()) {
				for (project_id, base_path_val) in bindings_obj {
					if let Some(base_path) = base_path_val.as_str() {
						sanitized.bindings.insert(project_id.to_string(), base_path.to_string());
					}
				}
			}

			save_bindings(&sanitized)?;
			Ok(sanitized)
		}
	}
}

pub fn save_bindings(b: &ProjectBindings) -> Result<(), String> {
	let path = bindings_path()?;
	let content = serde_json::to_string_pretty(b)
		.map_err(|e| format!("Failed to serialize project bindings: {}", e))?;
	fs::write(path, content).map_err(|e| format!("Failed to write project bindings: {}", e))?;
	Ok(())
}

pub fn get_binding(project_id: &str) -> Result<Option<String>, String> {
	let b = load_bindings()?;
	Ok(b.bindings.get(project_id).cloned())
}

pub fn set_binding(project_id: &str, base_path: &str) -> Result<(), String> {
	let mut b = load_bindings()?;
	b.bindings.insert(project_id.to_string(), base_path.to_string());
	save_bindings(&b)
}

pub fn clear_binding(project_id: &str) -> Result<(), String> {
	let mut b = load_bindings()?;
	b.bindings.remove(project_id);
	save_bindings(&b)
}

pub fn compute_project_key_hash(base_path: &str) -> Result<String, String> {
	let settings = load_general_settings()?;
	let combined = format!("{}::{}", base_path, settings.local_salt);
	let mut hasher = Sha256::new();
	hasher.update(combined.as_bytes());
	let result = hasher.finalize();
	Ok(hex::encode(result))
}
