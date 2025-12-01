use crate::models::general_settings::{save_general_settings, GeneralSettings};
use reqwest::Client;
use serde::{Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize)]
pub struct UpdateCheck {
	pub available: bool,
	pub version: Option<String>,
	pub current_version: String,
	pub notes: Option<String>,
	pub url: Option<String>,
}

const UPDATE_CHECK_INTERVAL: u64 = 24 * 60 * 60; // 24 hours in seconds

pub async fn check_for_updates(settings: &mut GeneralSettings) -> Result<UpdateCheck, String> {
	let current_version = env!("CARGO_PKG_VERSION");

	// Check if we should skip this check based on interval
	if !should_check_for_updates(settings) {
		return Ok(UpdateCheck {
			available: false,
			version: None,
			current_version: current_version.to_string(),
			notes: None,
			url: None,
		});
	}

	let client = Client::new();
	let api_url = match settings.update_channel.as_str() {
		"beta" => "https://api.github.com/repos/AdlarX9/code-pulse/releases",
		_ => "https://api.github.com/repos/AdlarX9/code-pulse/releases/latest",
	};

	let response = client
		.get(api_url)
		.header("User-Agent", format!("CodePulse/{}", current_version))
		.send()
		.await
		.map_err(|e| format!("Failed to check for updates: {}", e))?;

	if !response.status().is_success() {
		return Err("Update check failed".to_string());
	}

	// Update last check time
	let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs().to_string();
	settings.last_update_check = now;

	// Save updated settings
	if let Err(e) = save_general_settings(settings) {
		eprintln!("Failed to save update check time: {}", e);
	}

	if settings.update_channel == "beta" {
		// For beta channel, get all releases and find the latest prerelease
		let releases: Vec<serde_json::Value> =
			response.json().await.map_err(|e| format!("Failed to parse releases: {}", e))?;

		let latest_beta = releases
			.iter()
			.find(|r| r["prerelease"].as_bool().unwrap_or(false))
			.or_else(|| releases.first());

		if let Some(release) = latest_beta {
			let version = release["tag_name"].as_str().unwrap_or("").trim_start_matches('v');
			let is_newer = is_version_newer(current_version, version);

			return Ok(UpdateCheck {
				available: is_newer,
				version: if is_newer { Some(version.to_string()) } else { None },
				current_version: current_version.to_string(),
				notes: if is_newer {
					Some(release["body"].as_str().unwrap_or("").to_string())
				} else {
					None
				},
				url: if is_newer {
					release["html_url"].as_str().map(|s| s.to_string())
				} else {
					None
				},
			});
		}
	} else {
		// For stable channel, use the latest release
		let release: serde_json::Value =
			response.json().await.map_err(|e| format!("Failed to parse release: {}", e))?;

		let version = release["tag_name"].as_str().unwrap_or("").trim_start_matches('v');
		let is_newer = is_version_newer(current_version, version);

		return Ok(UpdateCheck {
			available: is_newer,
			version: if is_newer { Some(version.to_string()) } else { None },
			current_version: current_version.to_string(),
			notes: if is_newer {
				Some(release["body"].as_str().unwrap_or("").to_string())
			} else {
				None
			},
			url: if is_newer { release["html_url"].as_str().map(|s| s.to_string()) } else { None },
		});
	}

	Ok(UpdateCheck {
		available: false,
		version: None,
		current_version: current_version.to_string(),
		notes: None,
		url: None,
	})
}

fn should_check_for_updates(settings: &GeneralSettings) -> bool {
	if settings.last_update_check.is_empty() {
		return true;
	}

	let last_check = settings.last_update_check.parse::<u64>().unwrap_or(0);
	let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();

	(now - last_check) >= UPDATE_CHECK_INTERVAL
}

fn is_version_newer(current: &str, new: &str) -> bool {
	// Simple version comparison - assumes semantic versioning
	let current_parts: Vec<u32> = current.split('.').filter_map(|s| s.parse().ok()).collect();
	let new_parts: Vec<u32> = new.split('.').filter_map(|s| s.parse().ok()).collect();

	// Pad with zeros if needed
	let max_len = current_parts.len().max(new_parts.len());
	let mut current_padded = current_parts;
	let mut new_padded = new_parts;

	current_padded.resize(max_len, 0);
	new_padded.resize(max_len, 0);

	for (c, n) in current_padded.iter().zip(new_padded.iter()) {
		if n > c {
			return true;
		} else if n < c {
			return false;
		}
	}

	false
}

pub async fn start_update_checker(mut settings: GeneralSettings) {
	let mut interval = tokio::time::interval(std::time::Duration::from_secs(60 * 60)); // Check every hour

	loop {
		interval.tick().await;

		match check_for_updates(&mut settings).await {
			Ok(update_check) => {
				if update_check.available {
					// In a real implementation, this would trigger the Tauri updater
					// or show a notification to the user
					println!(
						"Update available: {} -> {}",
						update_check.current_version,
						update_check.version.unwrap_or_default()
					);

					// Emit event to frontend
					// window.emit("update-available", &update_check).ok();
				}
			}
			Err(e) => {
				eprintln!("Update check failed: {}", e);
			}
		}
	}
}
