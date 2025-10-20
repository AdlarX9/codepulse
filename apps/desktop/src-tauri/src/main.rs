// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod scanner;
mod user_settings;
mod scan_settings;
mod sync;
mod categories;
mod updater;
mod auth;
mod projects;
mod git;

use scanner::{ScanResult, to_snapshot};
use user_settings::{UserSettings, load_user_settings, save_user_settings};
use scan_settings::{ScanSettings, load_scan_settings, save_scan_settings};
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
    scan_settings: ScanSettings,
    window: Window,
    state: State<'_, AppState>,
) -> Result<ScanResult, String> {
    // Reset cancel flag
    state.cancel_flag.store(false, Ordering::Relaxed);

    let result = scanner::scan_path(&path, scan_settings.clone(), window, state.cancel_flag.clone())
        .await
        .map_err(|e| e.to_string())?;

    let snapshot = to_snapshot(&result);
    let user_settings = load_user_settings()?;
    if let Err(e) = crate::sync::enqueue_snapshot(path, &user_settings, &snapshot) {
        eprintln!("enqueue_snapshot failed: {}", e);
    }

    Ok(result)
}

#[tauri::command]
async fn scan_directory(
    path: &str,
    scan_settings: ScanSettings,
    window: Window,
    state: State<'_, AppState>,
) -> Result<ScanResult, String> {
    // Reset cancel flag
    state.cancel_flag.store(false, Ordering::Relaxed);
    
    scanner::scan_path(&path, scan_settings, window, state.cancel_flag.clone())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn cancel_scan(state: State<'_, AppState>) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
async fn get_user_settings() -> Result<UserSettings, String> {
    load_user_settings()
}

#[tauri::command]
async fn update_user_settings(settings: UserSettings) -> Result<(), String> {
    save_user_settings(&settings)
}

#[tauri::command]
async fn get_scan_settings() -> Result<ScanSettings, String> {
    load_scan_settings()
}

#[tauri::command]
async fn update_scan_settings(settings: ScanSettings) -> Result<(), String> {
    save_scan_settings(&settings)
}

#[tauri::command]
async fn check_for_updates() -> Result<updater::UpdateCheck, String> {
    let mut settings = load_user_settings()?;
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

// Git commands
#[tauri::command]
async fn git_is_repository(path: String) -> Result<bool, String> {
    Ok(git::repo::is_git_repository(&path))
}

#[tauri::command]
async fn git_get_repo_info(path: String) -> Result<git::GitRepoInfo, String> {
    git::repo::get_repo_info(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_branches(path: String) -> Result<Vec<String>, String> {
    git::repo::get_branches(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commits(
    path: String,
    branch: Option<String>,
    limit: usize,
) -> Result<Vec<git::GitCommitInfo>, String> {
    git::commits::get_commits(&path, branch.as_deref(), limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commits_since(
    path: String,
    since_sha: String,
    branch: Option<String>,
) -> Result<Vec<git::GitCommitInfo>, String> {
    git::commits::get_commits_since(&path, &since_sha, branch.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commit_by_sha(
    path: String,
    sha: String,
) -> Result<git::GitCommitInfo, String> {
    git::commits::get_commit_by_sha(&path, &sha)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commit_diff_stats(
    path: String,
    commit_sha: String,
) -> Result<git::GitDiffStats, String> {
    git::diff::get_commit_diff_stats(&path, &commit_sha)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commit_file_changes(
    path: String,
    commit_sha: String,
) -> Result<Vec<git::GitFileChange>, String> {
    git::diff::get_commit_file_changes(&path, &commit_sha)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_fetch_from_remote(
    path: String,
    remote_name: String,
) -> Result<(), String> {
    git::repo::fetch_from_remote(&path, &remote_name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_has_uncommitted_changes(path: String) -> Result<bool, String> {
    git::repo::has_uncommitted_changes(&path)
        .map_err(|e| e.to_string())
}

fn main() {
    // Load user settings for background tasks
    let user_settings = load_user_settings().expect("Failed to load user settings");

    // Start sync worker in background (will be spawned within Tauri runtime)

    // Start update checker in background
    let user_settings_clone = user_settings.clone();

    tauri::Builder::default()
        .manage(AppState {
            cancel_flag: Arc::new(AtomicBool::new(false)),
        })
        .setup(move |_app| {
            // Spawn background tasks within Tauri runtime
            // let app_handle = _app.handle(); // Unused for now

            // Sync worker
            tauri::async_runtime::spawn(async move {
                crate::sync::start_sync_worker().await;
            });

            // Update checker
            tauri::async_runtime::spawn(async move {
                crate::updater::start_update_checker(user_settings_clone).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            scan_and_maybe_enqueue,
            cancel_scan,
            get_user_settings,
            update_user_settings,
            get_scan_settings,
            update_scan_settings,
            check_for_updates,
            get_auth_token,
            set_auth_token,
            clear_auth_token,
            get_project_binding,
            set_project_binding,
            clear_project_binding,
            compute_project_key_hash,
            git_is_repository,
            git_get_repo_info,
            git_get_branches,
            git_get_commits,
            git_get_commits_since,
            git_get_commit_by_sha,
            git_get_commit_diff_stats,
            git_get_commit_file_changes,
            git_fetch_from_remote,
            git_has_uncommitted_changes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
