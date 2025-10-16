use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken {
    pub token: Option<String>,
}

impl Default for AuthToken {
    fn default() -> Self {
        Self { token: None }
    }
}

fn get_auth_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?;

    let app_dir = config_dir.join("codepulse");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    Ok(app_dir.join("auth.json"))
}

pub fn load_auth() -> Result<AuthToken, String> {
    let auth_path = get_auth_path()?;

    if !auth_path.exists() {
        let auth = AuthToken::default();
        save_auth(&auth)?;
        return Ok(auth);
    }

    let content = fs::read_to_string(auth_path)
        .map_err(|e| format!("Failed to read auth: {}", e))?;

    let auth: AuthToken = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse auth: {}", e))?;

    Ok(auth)
}

pub fn save_auth(auth: &AuthToken) -> Result<(), String> {
    let auth_path = get_auth_path()?;

    let content = serde_json::to_string_pretty(auth)
        .map_err(|e| format!("Failed to serialize auth: {}", e))?;

    fs::write(auth_path, content)
        .map_err(|e| format!("Failed to write auth: {}", e))?;

    Ok(())
}

pub fn get_token() -> Result<Option<String>, String> {
    let auth = load_auth()?;
    Ok(auth.token)
}

pub fn set_token(token: Option<String>) -> Result<(), String> {
    let mut auth = load_auth()?;
    auth.token = token;
    save_auth(&auth)
}

pub fn clear_token() -> Result<(), String> {
    set_token(None)
}
