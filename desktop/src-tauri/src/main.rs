// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auto_scan;
mod languages;
mod project;
mod storage;
mod user;

use crate::auto_scan::scan_contributed_repositories;
use crate::languages::{languages, LanguageDef};
use crate::project::{CommitActivity, ContributorsDashboardData, FileStats, Project};
use crate::user::{user, ScanSettings};
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{LogicalPosition, LogicalSize, Manager, Position, Size, State};

struct AppState {
	cancel_flag: Arc<AtomicBool>,
}

#[tauri::command]
async fn get_all_languages() -> Result<Vec<LanguageDef>, String> {
	Ok(languages().get_all_languages().to_vec())
}

#[tauri::command]
async fn scan_directory(path: &str, state: State<'_, AppState>) -> Result<Vec<FileStats>, String> {
	state.cancel_flag.store(false, Ordering::Relaxed);
	let project = Project::new(String::new(), path.to_string());
	Ok(project.scan_directory().await)
}

#[tauri::command]
async fn get_loc_evolution(path: String) -> Result<Vec<HashMap<String, u64>>, String> {
	let project = Project::new(String::new(), path);
	Ok(project.get_loc_evolution().await)
}

#[tauri::command]
async fn get_loc_diff(path: String) -> Result<HashMap<String, [i64; 2]>, String> {
	let project = Project::new(String::new(), path);
	Ok(project.get_loc_diff().await)
}

#[tauri::command]
async fn get_commit_activity(path: String) -> Result<Vec<CommitActivity>, String> {
	let project = Project::new(String::new(), path);
	Ok(project.get_commit_activity().await)
}

#[tauri::command]
async fn get_contributor_count(path: String) -> Result<u64, String> {
	let project = Project::new(String::new(), path);
	Ok(project.get_contributor_count().await)
}

#[tauri::command]
async fn get_contributors_dashboard_data(
	path: String,
) -> Result<ContributorsDashboardData, String> {
	let project = Project::new(String::new(), path);
	Ok(project.get_contributors_dashboard_data().await)
}

#[tauri::command]
async fn get_scan_settings() -> Result<ScanSettings, String> {
	user().load_scan_settings()
}

#[tauri::command]
async fn update_scan_settings(settings: ScanSettings) -> Result<(), String> {
	user().save_scan_settings(&settings)
}

#[tauri::command]
async fn load_projects() -> Result<Vec<JsonValue>, String> {
	user().list_projects()
}

#[tauri::command]
async fn get_project(id: &str) -> Result<Option<JsonValue>, String> {
	user().get_project(id)
}

#[tauri::command]
async fn upsert_project(project: JsonValue) -> Result<(), String> {
	user().upsert_project(project)
}

#[tauri::command]
async fn delete_project(id: &str) -> Result<(), String> {
	user().delete_project(id)
}

#[tauri::command]
async fn set_projects_order(projects: Vec<JsonValue>) -> Result<(), String> {
	user().set_projects_order(projects)
}

#[tauri::command]
async fn auto_scan_projects() -> Result<Vec<JsonValue>, String> {
	let discovered = scan_contributed_repositories()?;
	let projects: Vec<JsonValue> = discovered
		.into_iter()
		.map(|repository| {
			json!({
				"id": repository.path,
				"name": repository.name,
				"path": repository.path
			})
		})
		.collect();

	user().merge_auto_scan_projects(projects)
}

#[tauri::command]
async fn load_home_hq_cache(cache_key: String) -> Result<Option<JsonValue>, String> {
	user().load_home_hq_cache(&cache_key)
}

#[tauri::command]
async fn save_home_hq_cache(cache_key: String, payload: JsonValue) -> Result<(), String> {
	user().save_home_hq_cache(&cache_key, payload)
}

fn main() {
	tauri::Builder::default()
		.setup(|app| {
			if let Some(window) = app.get_window("main") {
				let monitor = match window.current_monitor() {
					Ok(current) => current,
					Err(_) => None,
				};

				if let Some(monitor) = monitor {
					let monitor_size = monitor.size();
					let scale_factor = monitor.scale_factor();

					let screen_width = monitor_size.width as f64 / scale_factor;
					let screen_height = monitor_size.height as f64 / scale_factor;

					let target_width = (screen_width * 0.84).clamp(900.0, 1800.0);
					let target_height = (screen_height * 0.84).clamp(650.0, 1300.0);

					let _ = window
						.set_size(Size::Logical(LogicalSize::new(target_width, target_height)));

					let pos_x = ((screen_width - target_width) / 2.0).max(0.0);
					let pos_y = ((screen_height - target_height) / 2.0).max(0.0);

					let _ =
						window.set_position(Position::Logical(LogicalPosition::new(pos_x, pos_y)));
				}
			}

			Ok(())
		})
		.manage(AppState { cancel_flag: Arc::new(AtomicBool::new(false)) })
		.invoke_handler(tauri::generate_handler![
			// Project
			// Actual features
			scan_directory,
			get_loc_evolution,
			get_loc_diff,
			get_commit_activity,
			get_contributor_count,
			get_contributors_dashboard_data,
			// Languages
			// Facilitators
			get_all_languages,
			// User
			// CRUD Projects
			load_projects,
			get_project,
			upsert_project,
			delete_project,
			set_projects_order,
			auto_scan_projects,
			load_home_hq_cache,
			save_home_hq_cache,
			// CRUD Scan Settings
			update_scan_settings,
			get_scan_settings,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
