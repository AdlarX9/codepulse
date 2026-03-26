use lazy_static::lazy_static;
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

pub struct Storage;

lazy_static! {
	static ref STORAGE: Storage = Storage;
}

pub fn storage() -> &'static Storage {
	&STORAGE
}

impl Storage {
	pub fn app_config_dir(&self) -> Result<PathBuf, String> {
		let config_dir =
			dirs::config_dir().ok_or_else(|| "Could not find config directory".to_string())?;
		let app_dir = config_dir.join("codepulse");
		if !app_dir.exists() {
			fs::create_dir_all(&app_dir)
				.map_err(|e| format!("Failed to create config directory: {}", e))?;
		}
		Ok(app_dir)
	}

	pub fn file_path_for_key(&self, key: &str) -> Result<PathBuf, String> {
		Ok(self.app_config_dir()?.join(format!("{}.json", key)))
	}

	pub fn read_json<T: DeserializeOwned>(&self, key: &str) -> Result<T, String> {
		let path = self.file_path_for_key(key)?;
		let content =
			fs::read_to_string(path).map_err(|e| format!("Failed to read storage: {}", e))?;
		serde_json::from_str(&content).map_err(|e| format!("Failed to parse storage: {}", e))
	}

	pub fn write_json<T: Serialize>(&self, key: &str, value: &T) -> Result<(), String> {
		let path = self.file_path_for_key(key)?;
		let content = serde_json::to_string_pretty(value)
			.map_err(|e| format!("Failed to serialize storage: {}", e))?;
		fs::write(path, content).map_err(|e| format!("Failed to write storage: {}", e))?;
		Ok(())
	}
}
