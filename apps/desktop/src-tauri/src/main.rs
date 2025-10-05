// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;
mod settings;

use scanner::{ScanResult};
use settings::{UserSettings, load_settings, save_settings};
use tauri::{Window, State};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc};


struct AppState {
    cancel_flag: Arc<AtomicBool>,
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

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            cancel_flag: Arc::new(AtomicBool::new(false)),
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            cancel_scan,
            get_settings,
            update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
