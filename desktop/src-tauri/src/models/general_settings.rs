use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
	#[serde(default = "default_device_id")]
	pub device_id: String,
	#[serde(default = "default_local_salt")]
	pub local_salt: String,
	#[serde(default = "default_update_channel")]
	pub update_channel: String, // "stable" or "beta"
	#[serde(default = "default_last_update_check")]
	pub last_update_check: String,
}

fn ensure_ids(settings: &mut GeneralSettings) -> Result<bool, String> {
	use std::time::{SystemTime, UNIX_EPOCH};
	let mut changed = false;
	let now_ms = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map(|d| d.as_millis())
		.map_err(|e| format!("Clock error: {}", e))?;

	if settings.device_id.is_empty() {
		settings.device_id = format!("dev-{:x}", now_ms);
		changed = true;
	}
	if settings.local_salt.is_empty() {
		// Different seed for salt
		let salt_seed = now_ms.wrapping_mul(1469598103934665603u128 as u128);
		settings.local_salt = format!("salt-{:x}", salt_seed);
		changed = true;
	}
	Ok(changed)
}

fn default_device_id() -> String {
	String::new()
}
fn default_local_salt() -> String {
	String::new()
}
fn default_update_channel() -> String {
	"stable".to_string()
}
fn default_last_update_check() -> String {
	String::new()
}

impl Default for GeneralSettings {
	fn default() -> Self {
		Self {
			device_id: default_device_id(),
			local_salt: default_local_salt(),
			update_channel: default_update_channel(),
			last_update_check: default_last_update_check(),
		}
	}
}

fn get_general_settings_path() -> Result<PathBuf, String> {
	let config_dir =
		dirs::config_dir().ok_or_else(|| "Could not find config directory".to_string())?;

	let app_dir = config_dir.join("codepulse");
	if !app_dir.exists() {
		fs::create_dir_all(&app_dir)
			.map_err(|e| format!("Failed to create config directory: {}", e))?;
	}

	Ok(app_dir.join("general_settings.json"))
}

pub fn load_general_settings() -> Result<GeneralSettings, String> {
	let settings_path = get_general_settings_path()?;

	if !settings_path.exists() {
		let mut s = GeneralSettings::default();
		ensure_ids(&mut s)?;
		// Persist initial file
		save_general_settings(&s)?;
		return Ok(s);
	}

	let content = fs::read_to_string(settings_path)
		.map_err(|e| format!("Failed to read general settings: {}", e))?;

	let mut settings: GeneralSettings = serde_json::from_str(&content)
		.map_err(|e| format!("Failed to parse general settings: {}", e))?;

	// Ensure identifiers are present and persist if mutated
	if ensure_ids(&mut settings)? {
		save_general_settings(&settings)?;
	}

	Ok(settings)
}

pub fn save_general_settings(settings: &GeneralSettings) -> Result<(), String> {
	let settings_path = get_general_settings_path()?;

	let content = serde_json::to_string_pretty(settings)
		.map_err(|e| format!("Failed to serialize general settings: {}", e))?;

	fs::write(settings_path, content)
		.map_err(|e| format!("Failed to write general settings: {}", e))?;

	Ok(())
}
