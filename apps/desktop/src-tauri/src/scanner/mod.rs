mod language;
mod counter;
mod filter;

use rayon::prelude::*;
use serde::{Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Instant;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use walkdir::{WalkDir};

pub use language::detect_language;
pub use crate::settings::UserSettings;
pub use filter::count_files;

#[derive(Debug, Clone, Serialize)]
pub struct FileStats {
    pub path: String,
    pub language: String,
    pub total: u32,
    pub blank: u32,
    pub comment: u32,
    pub code: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct LanguageStats {
    pub files: u32,
    pub total: u32,
    pub blank: u32,
    pub comment: u32,
    pub code: u32,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub total_files: u32,
    pub total_lines: u32,
    pub total_code: u32,
    pub total_comments: u32,
    pub total_blank: u32,
    pub comment_percentage: f64,
    pub code_percentage: f64,
    pub languages: HashMap<String, LanguageStats>,
    pub files: Vec<FileStats>,
    pub duration_ms: u64,
    pub mean: f64,
    pub median: f64,
    pub std_dev: f64,
}

#[derive(Debug, Clone, Serialize)]
struct ProgressEvent {
    files_scanned: u32,
    current_file: String,
}

pub async fn scan_path(
    path: &str,
    settings: UserSettings,
    window: tauri::Window,
    cancel_flag: Arc<AtomicBool>,
) -> Result<ScanResult, String> {
    let start = Instant::now();
    let root = Path::new(path);

    if !root.exists() {
        return Err("Path does not exist".to_string());
    }

    // Collecte des fichiers — on ne traverse que les dossiers non exclus
    let mut file_paths: Vec<PathBuf> = Vec::new();
    let walker = WalkDir::new(root)
        .follow_links(settings.follow_symlinks)
        .into_iter()
        .filter_entry(|e| {
            // Vérifier l'annulation pendant la traversée
            if cancel_flag.load(Ordering::Relaxed) {
                return false;
            }
            
            return count_files(e, settings.clone())
        });

    for entry in walker {
        if cancel_flag.load(Ordering::Relaxed) {
            return Err("Scan cancelled".to_string());
        }

        match entry {
            Ok(entry) => {
                if entry.path().is_file() {
                    // filter_entry() cannot exclude files, only controls directory descent.
                    // Re-apply file-level filter here to ensure only allowed files are queued.
                    if count_files(&entry, settings.clone()) {
                        file_paths.push(entry.path().to_path_buf());
                    }
                }
            }
            Err(e) => {
                eprintln!("Error walking directory: {}", e);
            }
        }
    }

    // Traitement en parallèle avec rayon
    // Le filtrage a déjà été fait pendant la traversée, donc ici on ne fait que lire et compter
    let files_scanned = Arc::new(Mutex::new(0u32));
    let files: Vec<FileStats> = file_paths
        .par_iter()
        .filter_map(|path| {
            // Vérifier l'annulation
            if cancel_flag.load(Ordering::Relaxed) {
                return None;
            }

            // Traiter le fichier (lecture + comptage des lignes)
            let stats = process_file(path)?;

            // Mise à jour de la progression
            let mut count = files_scanned.lock().unwrap();
            *count += 1;
            let current_count = *count;
            drop(count);

            // Émettre un événement de progression toutes les 10 fichiers
            if current_count % 10 == 0 {
                let _ = window.emit(
                    "scan:progress",
                    ProgressEvent {
                        files_scanned: current_count,
                        current_file: path.display().to_string(),
                    },
                );
            }

            Some(stats)
        })
        .collect();

    if cancel_flag.load(Ordering::Relaxed) {
        return Err("Scan cancelled".to_string());
    }

    // Agrégation
    let mut languages: HashMap<String, LanguageStats> = HashMap::new();
    let mut total_lines = 0u32;
    let mut total_code = 0u32;
    let mut total_comments = 0u32;
    let mut total_blank = 0u32;

    for file in &files {
        total_lines += file.total;
        total_code += file.code;
        total_comments += file.comment;
        total_blank += file.blank;

        let lang_stats = languages.entry(file.language.clone()).or_insert(LanguageStats {
            files: 0,
            total: 0,
            blank: 0,
            comment: 0,
            code: 0,
            percentage: 0.0,
        });

        lang_stats.files += 1;
        lang_stats.total += file.total;
        lang_stats.blank += file.blank;
        lang_stats.comment += file.comment;
        lang_stats.code += file.code;
    }

    for lang_stats in languages.values_mut() {
        lang_stats.percentage = if total_lines > 0 {
            (lang_stats.total as f64 / total_lines as f64) * 100.0
        } else {
            0.0
        };
    }

    let comment_percentage = if total_lines > 0 {
        (total_comments as f64 / total_lines as f64) * 100.0
    } else {
        0.0
    };

    let code_percentage = if total_lines > 0 {
        (total_code as f64 / total_lines as f64) * 100.0
    } else {
        0.0
    };

    let (mean, median, std_dev) = calculate_statistics(&files);
    let duration_ms = start.elapsed().as_millis() as u64;

    Ok(ScanResult {
        total_files: files.len() as u32,
        total_lines,
        total_code,
        total_comments,
        total_blank,
        comment_percentage,
        code_percentage,
        languages,
        files,
        duration_ms,
        mean,
        median,
        std_dev,
    })
}

fn process_file(path: &Path) -> Option<FileStats> {
    let filename = path.file_name()?.to_str()?;
    let language = detect_language(filename);

    // Lecture avec fallback d'encodage
    let content = match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => {
            match std::fs::read(path) {
                Ok(bytes) => {
                    let (decoded, _, _) = encoding_rs::WINDOWS_1252.decode(&bytes);
                    decoded.to_string()
                }
                Err(_) => return None,
            }
        }
    };

    let (total, blank, comment, code) = counter::count_lines(&content, &language);

    Some(FileStats {
        path: path.display().to_string(),
        language,
        total,
        blank,
        comment,
        code,
    })
}

fn calculate_statistics(files: &[FileStats]) -> (f64, f64, f64) {
    if files.is_empty() {
        return (0.0, 0.0, 0.0);
    }

    let mut totals: Vec<u32> = files.iter().map(|f| f.total).collect();
    totals.sort_unstable();

    let mean = totals.iter().sum::<u32>() as f64 / totals.len() as f64;

    let median = if totals.len() % 2 == 0 {
        let mid = totals.len() / 2;
        (totals[mid - 1] + totals[mid]) as f64 / 2.0
    } else {
        totals[totals.len() / 2] as f64
    };

    let variance = totals
        .iter()
        .map(|&x| {
            let diff = x as f64 - mean;
            diff * diff
        })
        .sum::<f64>()
        / totals.len() as f64;

    let std_dev = variance.sqrt();

    (mean, median, std_dev)
}