// Productivity dashboard module
// Handles Git history analysis, commit metrics, and delivery KPIs

use crate::models::scan_settings::ScanSettings;
use crate::overview::history::{scan_repo_history, CommitScan};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::Window;

/// Scan repository history for productivity metrics
pub async fn scan_history(
	path: &str,
	scan_settings: ScanSettings,
	limit: usize,
	window: Window,
	cancel_flag: Arc<AtomicBool>,
) -> Result<Vec<CommitScan>, String> {
	scan_repo_history(path, scan_settings, limit, window, cancel_flag).await
}
