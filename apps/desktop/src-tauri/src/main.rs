// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;

use scanner::{ScanOptions, ScanResult};
use tauri::api::dialog::FileDialogBuilder;
use std::sync::mpsc;
use std::thread;
use tauri::Window;


#[tauri::command]
async fn scan_directory(
    path: String,
    options: ScanOptions,
    window: Window,
) -> Result<ScanResult, String> {
    scanner::scan_path(&path, options, window)
        .await
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
