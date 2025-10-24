use std::fs;
use std::path::PathBuf;
use dirs;
use serde_json;

fn storage_path() -> Result<PathBuf, String> {
    let config_dir =
        dirs::config_dir().ok_or_else(|| "Could not find config directory".to_string())?;
    let app_dir = config_dir.join("codepulse");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    Ok(app_dir)
}

pub fn read_storage<T: serde::de::DeserializeOwned>(key: &str) -> Result<T, String> {
    let path = storage_path()?;
    let content = fs::read_to_string(path.join(key.to_owned() + ".json"))
        .map_err(|e| format!("Failed to read storage: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage: {}", e))
}

pub fn write_storage<T: serde::ser::Serialize>(key: &str, value: T) -> Result<(), String> {
    let path = storage_path()?;
    let content = serde_json::to_string_pretty(&value)
        .map_err(|e| format!("Failed to serialize storage: {}", e))?;
    fs::write(path.join(key.to_owned() + ".json"), content)
        .map_err(|e| format!("Failed to write storage: {}", e))?;
    Ok(())
}
