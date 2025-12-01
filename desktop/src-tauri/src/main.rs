// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Core modules
mod contributors;
mod models;
mod overview;
mod productivity;
mod quality;
mod utils;

// Use statements
use models::general_settings::{load_general_settings, save_general_settings, GeneralSettings};
use models::languages;
use models::projects;
use models::scan_settings::{load_scan_settings, save_scan_settings, ScanSettings};
use overview::ScanResult;
use productivity::scan_history;
use serde_json::Value as JsonValue;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{State, Window};
use utils::{git_ops, storage, updater};

struct AppState {
	cancel_flag: Arc<AtomicBool>,
}

#[tauri::command]
async fn compute_github_metrics_for_path(
	path: String,
	weeks: usize,
	github_token: Option<String>,
) -> Result<quality::github_metrics::GitHubMetrics, String> {
	let info = git_ops::get_repo_info(&path).map_err(|e| e.to_string())?;
	let slug = match info.remote_url.and_then(|u| quality::parse_repo_slug(&u)) {
		Some(s) => s,
		None => return Err("No GitHub remote detected".into()),
	};
	quality::github_metrics::compute_metrics_for_repo(&slug, weeks, github_token.as_deref()).await
}

#[tauri::command]
async fn compute_quality_metrics(
	path: String,
	settings: ScanSettings,
) -> Result<quality::QualityMetrics, String> {
	quality::compute_quality_metrics(&path, &settings).await
}

#[tauri::command]
async fn compute_quality_metrics_for_branch(
	path: String,
	branch: String,
	settings: ScanSettings,
) -> Result<quality::QualityMetrics, String> {
	quality::compute_quality_metrics_for_branch(&path, &branch, &settings).await
}

#[tauri::command]
async fn compute_branch_quality_deltas(
	path: String,
	base_branch: String,
	branches: Vec<String>,
	settings: ScanSettings,
) -> Result<Vec<quality::BranchQualityDelta>, String> {
	quality::compute_branch_quality_deltas(&path, &base_branch, &branches, &settings).await
}

#[tauri::command]
async fn scan_repo_history_cmd(
	path: &str,
	scan_settings: ScanSettings,
	limit: usize,
	window: Window,
	state: State<'_, AppState>,
) -> Result<Vec<overview::history::CommitScan>, String> {
	state.cancel_flag.store(false, Ordering::Relaxed);
	scan_history(path, scan_settings, limit, window, state.cancel_flag.clone()).await
}

#[tauri::command]
async fn list_supported_languages() -> Result<Vec<String>, String> {
	Ok(languages::get_supported_languages())
}

#[tauri::command]
async fn get_common_excluded_languages() -> Result<Vec<String>, String> {
	Ok(languages::get_common_excluded_languages())
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

	overview::scan_path(&path, scan_settings, window, state.cancel_flag.clone())
		.await
		.map_err(|e| e.to_string())
}

#[tauri::command]
async fn cancel_scan(state: State<'_, AppState>) -> Result<(), String> {
	state.cancel_flag.store(true, Ordering::Relaxed);
	Ok(())
}

#[tauri::command]
async fn get_general_settings() -> Result<GeneralSettings, String> {
	load_general_settings()
}

#[tauri::command]
async fn update_general_settings(settings: GeneralSettings) -> Result<(), String> {
	save_general_settings(&settings)
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
	let mut settings = load_general_settings()?;
	updater::check_for_updates(&mut settings).await
}

#[tauri::command]
async fn get_project_binding(project_id: &str) -> Result<Option<String>, String> {
	projects::get_binding(project_id)
}

#[tauri::command]
async fn set_project_binding(project_id: &str, base_path: &str) -> Result<(), String> {
	projects::set_binding(project_id, base_path)
}

#[tauri::command]
async fn clear_project_binding(project_id: &str) -> Result<(), String> {
	projects::clear_binding(project_id)
}

#[tauri::command]
async fn compute_project_key_hash(base_path: &str) -> Result<String, String> {
	projects::compute_project_key_hash(base_path)
}

// Local projects storage (JSON persisted under user config dir)
const LOCAL_PROJECTS_STORAGE_KEY: &str = "local_projects";

#[tauri::command]
async fn load_projects() -> Result<Vec<JsonValue>, String> {
	match storage::read_storage::<Vec<JsonValue>>(LOCAL_PROJECTS_STORAGE_KEY) {
		Ok(list) => Ok(list),
		Err(_) => Ok(vec![]),
	}
}

#[tauri::command]
async fn save_projects(projects: Vec<JsonValue>) -> Result<(), String> {
	storage::write_storage(LOCAL_PROJECTS_STORAGE_KEY, projects)
}

#[tauri::command]
async fn get_project(id: &str) -> Result<Option<JsonValue>, String> {
	let list = load_projects().await.unwrap_or_default();
	let found = list.into_iter().find(|p| p.get("id").and_then(|v| v.as_str()).unwrap_or("") == id);
	Ok(found)
}

#[tauri::command]
async fn upsert_project(project: JsonValue) -> Result<(), String> {
	let mut list = load_projects().await.unwrap_or_default();
	let pid = project.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
	if pid.is_empty() {
		return Err("project.id required".into());
	}
	let mut replaced = false;
	for p in &mut list {
		let id = p.get("id").and_then(|v| v.as_str()).unwrap_or("");
		if id == pid {
			*p = project.clone();
			replaced = true;
			break;
		}
	}
	if !replaced {
		list.push(project);
	}
	save_projects(list).await
}

#[tauri::command]
async fn delete_project(id: &str) -> Result<(), String> {
	let list = load_projects().await.unwrap_or_default();
	let next: Vec<JsonValue> = list
		.into_iter()
		.filter(|p| p.get("id").and_then(|v| v.as_str()).unwrap_or("") != id)
		.collect();
	save_projects(next).await
}

// Git commands
#[tauri::command]
async fn git_is_repository(path: String) -> Result<bool, String> {
	Ok(git_ops::is_git_repository(&path))
}

#[tauri::command]
async fn git_get_repo_info(path: String) -> Result<git_ops::GitRepoInfo, String> {
	git_ops::get_repo_info(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_branches(path: String) -> Result<Vec<String>, String> {
	git_ops::get_branches(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commits(
	path: String,
	branch: Option<String>,
	limit: usize,
) -> Result<Vec<git_ops::GitCommitInfo>, String> {
	git_ops::get_commits(&path, branch.as_deref(), limit).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commits_since(
	path: String,
	since_sha: String,
	branch: Option<String>,
) -> Result<Vec<git_ops::GitCommitInfo>, String> {
	git_ops::get_commits_since(&path, &since_sha, branch.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commit_by_sha(
	path: String,
	sha: String,
) -> Result<git_ops::GitCommitInfo, String> {
	git_ops::get_commit_by_sha(&path, &sha).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commit_diff_stats(
	path: String,
	commit_sha: String,
) -> Result<git_ops::GitDiffStats, String> {
	git_ops::get_commit_diff_stats(&path, &commit_sha).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_get_commit_file_changes(
	path: String,
	commit_sha: String,
) -> Result<Vec<git_ops::GitFileChange>, String> {
	git_ops::get_commit_file_changes(&path, &commit_sha).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_fetch_from_remote(path: String, remote_name: String) -> Result<(), String> {
	git_ops::fetch_from_remote(&path, &remote_name).map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_has_uncommitted_changes(path: String) -> Result<bool, String> {
	git_ops::has_uncommitted_changes(&path).map_err(|e| e.to_string())
}

fn main() {
	// Load general settings for background tasks
	let general_settings = load_general_settings().expect("Failed to load general settings");

	// Start update checker in background
	let general_settings_clone = general_settings.clone();

	tauri::Builder::default()
		.manage(AppState { cancel_flag: Arc::new(AtomicBool::new(false)) })
		.setup(move |_app| {
			// Spawn background tasks within Tauri runtime
			// let app_handle = _app.handle(); // Unused for now

			// Update checker
			tauri::async_runtime::spawn(async move {
				updater::start_update_checker(general_settings_clone).await;
			});

			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			// Scan
			scan_directory,
			cancel_scan,
			scan_repo_history_cmd,              // Overview
			compute_github_metrics_for_path,    // Productivity
			compute_quality_metrics,            // Quality
			compute_quality_metrics_for_branch, // Quality
			compute_branch_quality_deltas,      // Quality
			// Storage
			get_general_settings,
			update_general_settings,
			get_scan_settings,
			update_scan_settings,
			list_supported_languages,
			get_common_excluded_languages,
			// Auth
			check_for_updates,
			// Projects
			get_project_binding,
			set_project_binding,
			clear_project_binding,
			compute_project_key_hash,
			// Local projects storage
			load_projects,
			save_projects,
			get_project,
			upsert_project,
			delete_project,
			// Git
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
