use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use reqwest::Client;
use tokio::time::sleep;

use crate::scanner::ScanSnapshot;
use crate::settings::UserSettings;

#[derive(Debug, Serialize, Deserialize)]
struct Totals {
    total: u32,
    code: u32,
    comment: u32,
    blank: u32,
    core_code_lines: u32,
    info_lines: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct LangItem {
    language: String,
    files: u32,
    total: u32,
    code: u32,
    comment: u32,
    blank: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncPayload {
    project_key_hash: String,
    device_id: String,
    scanned_at: String,
    totals: Totals,
    per_language: Vec<LangItem>,
    app_version: String,
}

fn queue_dir() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?;
    let app_dir = config_dir.join("codepulse").join("queue");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create queue directory: {}", e))?;
    }
    Ok(app_dir)
}

fn compute_project_key_hash(base_path: &str, salt: &str) -> String {
    let combined = format!("{}::{}", base_path, salt);
    let mut hasher = Sha256::new();
    hasher.update(combined.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

pub fn enqueue_snapshot(base_path: &str, settings: &UserSettings, snapshot: &ScanSnapshot) -> Result<(), String> {
    let project_key_hash = compute_project_key_hash(base_path, &settings.local_salt);

    let totals = Totals {
        total: snapshot.total,
        code: snapshot.code,
        comment: snapshot.comment,
        blank: snapshot.blank,
        core_code_lines: snapshot.core_code_lines,
        info_lines: snapshot.info_lines,
    };

    let per_language: Vec<LangItem> = snapshot
        .per_language
        .iter()
        .map(|l| LangItem {
            language: l.language.clone(),
            files: l.files,
            total: l.total,
            code: l.code,
            comment: l.comment,
            blank: l.blank,
        })
        .collect();

    let scanned_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());

    let payload = SyncPayload {
        project_key_hash,
        device_id: settings.device_id.clone(),
        scanned_at,
        totals,
        per_language,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    };

    let dir = queue_dir()?;
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis().to_string())
        .unwrap_or_else(|_| "0".to_string());
    let file_path = dir.join(format!("{}.json", ts));

    let content = serde_json::to_string_pretty(&payload)
        .map_err(|e| format!("Failed to serialize payload: {}", e))?;
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write queue file: {}", e))?;

    Ok(())
}

#[derive(Debug, Deserialize)]
struct QueuedPayload {
    file_path: PathBuf,
    payload: SyncPayload,
}

pub async fn process_sync_queue(api_base_url: &str) -> Result<usize, String> {
    let dir = queue_dir()?;
    
    if !dir.exists() {
        return Ok(0);
    }

    let entries = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read queue directory: {}", e))?;

    let mut processed = 0;
    let client = Client::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if !path.extension().map_or(false, |ext| ext == "json") {
            continue;
        }

        match process_queue_file(&client, api_base_url, &path).await {
            Ok(true) => {
                // Successfully synced, delete file
                if let Err(e) = fs::remove_file(&path) {
                    eprintln!("Failed to delete synced queue file: {}", e);
                }
                processed += 1;
            }
            Ok(false) => {
                // Network error or retryable error, keep file
                eprintln!("Sync failed temporarily for: {:?}", path);
            }
            Err(e) => {
                // Parse error or permanent error, delete file to prevent infinite retry
                eprintln!("Permanent sync error for {:?}: {}", path, e);
                if let Err(del_e) = fs::remove_file(&path) {
                    eprintln!("Failed to delete broken queue file: {}", del_e);
                }
            }
        }
    }

    Ok(processed)
}

async fn process_queue_file(client: &Client, api_base_url: &str, file_path: &PathBuf) -> Result<bool, String> {
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read queue file: {}", e))?;
    
    let payload: SyncPayload = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse queue file: {}", e))?;

    let url = format!("{}/api/sync/scan", api_base_url);
    
    match client
        .post(&url)
        .json(&payload)
        .timeout(Duration::from_secs(30))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                Ok(true) // Successfully synced
            } else if response.status().is_client_error() {
                // 4xx errors are permanent (bad payload, auth issues)
                Err(format!("Client error: {}", response.status()))
            } else {
                // 5xx errors are temporary (server issues)
                Ok(false)
            }
        }
        Err(e) => {
            // Network errors are temporary
            eprintln!("Network error syncing: {}", e);
            Ok(false)
        }
    }
}

pub async fn start_sync_worker(api_base_url: String) {
    let mut interval = tokio::time::interval(Duration::from_secs(30)); // Check every 30 seconds
    let mut backoff = Duration::from_secs(30);
    const MAX_BACKOFF: Duration = Duration::from_secs(300); // Max 5 minutes

    loop {
        interval.tick().await;

        match process_sync_queue(&api_base_url).await {
            Ok(processed) => {
                if processed > 0 {
                    println!("Synced {} queued snapshots", processed);
                    backoff = Duration::from_secs(30); // Reset backoff on success
                }
            }
            Err(e) => {
                eprintln!("Sync queue processing error: {}", e);
                // Exponential backoff on persistent errors
                backoff = std::cmp::min(backoff * 2, MAX_BACKOFF);
                sleep(backoff).await;
            }
        }
    }
}
