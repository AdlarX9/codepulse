use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    // Même structure et propriétés que ScanOptions
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

    // Optionnel: allowlist globale de langages. Vide => tous les langages non exclus sont autorisés.
    #[serde(default = "default_allowed_languages")]
    pub allowed_languages: Vec<String>,

    // Sync aggregates (opt-in) and local identifiers
    #[serde(default = "default_sync_enabled")]
    pub sync_enabled: bool,
    #[serde(default = "default_device_id")]
    pub device_id: String,
    #[serde(default = "default_local_salt")]
    pub local_salt: String,
    
    // Auto-update settings
    #[serde(default = "default_auto_update")]
    pub auto_update: bool,
    #[serde(default = "default_update_channel")]
    pub update_channel: String, // "stable" or "beta"
    #[serde(default = "default_last_update_check")]
    pub last_update_check: String,

    // API base URL for sync worker (e.g., http://localhost:8080)
    #[serde(default = "default_api_base_url")]
    pub api_base_url: String,
}

fn ensure_ids(settings: &mut UserSettings) -> Result<bool, String> {
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

// Par défaut: pas d'exclusions par extension (si vous préférez ignorer p.ex. ".lock", ajoutez-les ici)
fn default_excluded_extensions() -> Vec<String> {
    vec![]
}

// IMPORTANT: excluded_languages compare des NOMS DE LANGAGE (ex: "Markdown", "YAML"), pas des extensions.
// Si vous souhaitez exclure via extensions ("md", "yml", "yaml"), utilisez excluded_extensions.
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

fn default_sync_enabled() -> bool { false }
fn default_device_id() -> String { String::new() }
fn default_local_salt() -> String { String::new() }
fn default_auto_update() -> bool { true }
fn default_update_channel() -> String { "stable".to_string() }
fn default_last_update_check() -> String { String::new() }
fn default_api_base_url() -> String { "http://localhost:8080".to_string() }

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            excluded_dirs: default_excluded_dirs(),
            excluded_extensions: default_excluded_extensions(),
            excluded_languages: default_excluded_languages(),
            excluded_patterns: default_excluded_patterns(),
            follow_symlinks: default_follow_symlinks(),
            allowed_languages: default_allowed_languages(),
            sync_enabled: default_sync_enabled(),
            device_id: default_device_id(),
            local_salt: default_local_salt(),
            auto_update: default_auto_update(),
            update_channel: default_update_channel(),
            last_update_check: default_last_update_check(),
            api_base_url: default_api_base_url(),
        }
    }
}

fn get_settings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?;

    let app_dir = config_dir.join("codepulse");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    Ok(app_dir.join("settings.json"))
}

pub fn load_settings() -> Result<UserSettings, String> {
    let settings_path = get_settings_path()?;

    if !settings_path.exists() {
        let mut s = UserSettings::default();
        ensure_ids(&mut s)?;
        // Persist initial file
        save_settings(&s)?;
        return Ok(s);
    }

    let content = fs::read_to_string(settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let mut settings: UserSettings = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    // Ensure identifiers are present and persist if mutated
    if ensure_ids(&mut settings)? {
        save_settings(&settings)?;
    }

    Ok(settings)
}

pub fn save_settings(settings: &UserSettings) -> Result<(), String> {
    let settings_path = get_settings_path()?;

    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}