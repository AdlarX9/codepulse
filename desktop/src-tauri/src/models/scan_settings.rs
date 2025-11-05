use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanSettings {
	#[serde(default = "default_excluded_dirs")]
	pub excluded_dirs: Vec<String>,
	#[serde(default = "default_excluded_extensions")]
	pub excluded_extensions: Vec<String>,
	#[serde(default = "default_excluded_languages")]
	pub excluded_languages: Vec<String>,
	#[serde(default = "default_excluded_patterns")]
	pub excluded_patterns: Vec<String>,
	#[serde(default = "default_follow_symlinks")]
	pub follow_symlinks: bool,
	#[serde(default = "default_allowed_languages")]
	pub allowed_languages: Vec<String>,
}

// Par défaut: pas d'exclusions de dossiers
fn default_excluded_dirs() -> Vec<String> {
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
	]
}

fn default_excluded_extensions() -> Vec<String> {
	vec![]
}

fn default_excluded_languages() -> Vec<String> {
	vec![
		"JSON".to_string(),
		"YAML".to_string(),
		"XML".to_string(),
		"SQL".to_string(),
		"GraphQL".to_string(),
		"TOML".to_string(),
		"Markdown".to_string(),
		"MDX".to_string(),
		"LaTeX".to_string(),
		"reStructuredText".to_string(),
	]
}

fn default_excluded_patterns() -> Vec<String> {
	vec!["*lib*".to_string(), "*lock.*".to_string()]
}

fn default_follow_symlinks() -> bool {
	false
}

fn default_allowed_languages() -> Vec<String> {
	vec![]
}

impl Default for ScanSettings {
	fn default() -> Self {
		Self {
			excluded_dirs: default_excluded_dirs(),
			excluded_extensions: default_excluded_extensions(),
			excluded_languages: default_excluded_languages(),
			excluded_patterns: default_excluded_patterns(),
			follow_symlinks: default_follow_symlinks(),
			allowed_languages: default_allowed_languages(),
		}
	}
}

fn get_scan_settings_path() -> Result<PathBuf, String> {
	let config_dir =
		dirs::config_dir().ok_or_else(|| "Could not find config directory".to_string())?;

	let app_dir = config_dir.join("codepulse");
	if !app_dir.exists() {
		fs::create_dir_all(&app_dir)
			.map_err(|e| format!("Failed to create config directory: {}", e))?;
	}

	Ok(app_dir.join("scan_settings.json"))
}

pub fn load_scan_settings() -> Result<ScanSettings, String> {
	let settings_path = get_scan_settings_path()?;

	if !settings_path.exists() {
		let s = ScanSettings::default();
		// Persist initial file
		save_scan_settings(&s)?;
		return Ok(s);
	}

	let content = fs::read_to_string(settings_path)
		.map_err(|e| format!("Failed to read scan settings: {}", e))?;

	let settings: ScanSettings = serde_json::from_str(&content)
		.map_err(|e| format!("Failed to parse scan settings: {}", e))?;

	Ok(settings)
}

pub fn save_scan_settings(settings: &ScanSettings) -> Result<(), String> {
	let settings_path = get_scan_settings_path()?;

	let content = serde_json::to_string_pretty(settings)
		.map_err(|e| format!("Failed to serialize scan settings: {}", e))?;

	fs::write(settings_path, content)
		.map_err(|e| format!("Failed to write scan settings: {}", e))?;

	Ok(())
}
