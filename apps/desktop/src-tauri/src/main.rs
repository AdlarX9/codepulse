// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;

use scanner::{scan_path, ScanOptions, ScanResult};
use tauri::Manager;

#[tauri::command]
async fn scan_directory(
    path: String,
    options: ScanOptions,
    window: tauri::Window,
) -> Result<ScanResult, String> {
    scanner::scan_path(&path, options, window).await
}

#[tauri::command]
fn select_directory() -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    Ok(FileDialogBuilder::new()
        .set_title("Select Directory to Analyze")
        .pick_folder())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            select_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
