use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use sha2::{Digest, Sha256};

use crate::user_settings::load_user_settings;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProjectBindings {
    pub bindings: HashMap<String, String>, // project_id -> base_path
}

fn bindings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?;
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
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read project bindings: {}", e))?;
    let parsed: ProjectBindings = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse project bindings: {}", e))?;
    Ok(parsed)
}

pub fn save_bindings(b: &ProjectBindings) -> Result<(), String> {
    let path = bindings_path()?;
    let content = serde_json::to_string_pretty(b)
        .map_err(|e| format!("Failed to serialize project bindings: {}", e))?;
    fs::write(path, content)
        .map_err(|e| format!("Failed to write project bindings: {}", e))?;
    Ok(())
}

pub fn get_binding(projectId: &str) -> Result<Option<String>, String> {
    let b = load_bindings()?;
    Ok(b.bindings.get(projectId).cloned())
}

pub fn set_binding(projectId: &str, basePath: &str) -> Result<(), String> {
    let mut b = load_bindings()?;
    b.bindings.insert(projectId.to_string(), basePath.to_string());
    save_bindings(&b)
}

pub fn clear_binding(projectId: &str) -> Result<(), String> {
    let mut b = load_bindings()?;
    b.bindings.remove(projectId);
    save_bindings(&b)
}

pub fn compute_project_key_hash(basePath: &str) -> Result<String, String> {
    let settings = load_user_settings()?;
    let combined = format!("{}::{}", basePath, settings.local_salt);
    let mut hasher = Sha256::new();
    hasher.update(combined.as_bytes());
    let result = hasher.finalize();
    Ok(hex::encode(result))
}
