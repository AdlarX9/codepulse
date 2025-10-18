// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;
mod settings;
mod sync;
mod categories;
mod updater;
mod auth;
mod projects;

use scanner::{ScanResult, to_snapshot};
use settings::{UserSettings, load_settings, save_settings};
use auth::{get_token, set_token, clear_token};
use tauri::{Window, State};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc};


struct AppState {
    cancel_flag: Arc<AtomicBool>,
}

#[tauri::command]
async fn scan_and_maybe_enqueue(
    path: &str,
    settings: UserSettings,
    window: Window,
    state: State<'_, AppState>,
) -> Result<ScanResult, String> {
    // Reset cancel flag
    state.cancel_flag.store(false, Ordering::Relaxed);

    let result = scanner::scan_path(&path, settings.clone(), window, state.cancel_flag.clone())
        .await
        .map_err(|e| e.to_string())?;

    if settings.sync_enabled {
        let snapshot = to_snapshot(&result);
        if let Err(e) = crate::sync::enqueue_snapshot(path, &settings, &snapshot) {
            eprintln!("enqueue_snapshot failed: {}", e);
        }
    }

    Ok(result)
}

#[tauri::command]
async fn scan_directory(
    path: &str,
    settings: UserSettings,
    window: Window,
    state: State<'_, AppState>,
) -> Result<ScanResult, String> {
    // Reset cancel flag
    state.cancel_flag.store(false, Ordering::Relaxed);
    
    scanner::scan_path(&path, settings, window, state.cancel_flag.clone())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn cancel_scan(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
async fn get_settings() -> Result<UserSettings, String> {
    load_settings()
}

#[tauri::command]
async fn update_settings(settings: UserSettings) -> Result<(), String> {
    save_settings(&settings)
}

#[tauri::command]
async fn check_for_updates() -> Result<updater::UpdateCheck, String> {
    let mut settings = load_settings()?;
    updater::check_for_updates(&mut settings).await
}

#[tauri::command]
async fn get_auth_token() -> Result<Option<String>, String> {
    get_token()
}

#[tauri::command]
async fn set_auth_token(token: Option<String>) -> Result<(), String> {
    set_token(token)
}

#[tauri::command]
async fn clear_auth_token() -> Result<(), String> {
    clear_token()
}

#[tauri::command]
async fn get_project_binding(projectId: &str) -> Result<Option<String>, String> {
    projects::get_binding(projectId)
}

#[tauri::command]
async fn set_project_binding(projectId: &str, basePath: &str) -> Result<(), String> {
    projects::set_binding(projectId, basePath)
}

#[tauri::command]
async fn clear_project_binding(projectId: &str) -> Result<(), String> {
    projects::clear_binding(projectId)
}

#[tauri::command]
async fn compute_project_key_hash(basePath: &str) -> Result<String, String> {
    projects::compute_project_key_hash(basePath)
}

fn main() {
    // Load settings for background tasks
    let settings = load_settings().expect("Failed to load settings");

    // Start sync worker in background (will be spawned within Tauri runtime)
    // TODO: Make API base URL configurable
    let api_url = settings.api_base_url.clone();

    // Start update checker in background
    let settings_clone = settings.clone();

    tauri::Builder::default()
        .manage(AppState {
            cancel_flag: Arc::new(AtomicBool::new(false)),
        })
        .setup(move |app| {
            // Spawn background tasks within Tauri runtime
            // let app_handle = app.handle(); // Unused for now

            // Sync worker
            let sync_api_url = api_url.clone();
            tauri::async_runtime::spawn(async move {
                crate::sync::start_sync_worker(sync_api_url).await;
            });

            // Update checker
            tauri::async_runtime::spawn(async move {
                crate::updater::start_update_checker(settings_clone).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            scan_and_maybe_enqueue,
            cancel_scan,
            get_settings,
            update_settings,
            check_for_updates,
            get_auth_token,
            set_auth_token,
            clear_auth_token,
            get_project_binding,
            set_project_binding,
            clear_project_binding,
            compute_project_key_hash,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
