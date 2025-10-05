mod language;
mod counter;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::time::Instant;
use walkdir::{DirEntry, WalkDir};

pub use language::detect_language;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanOptions {
    #[serde(default)]
    pub exclude_dirs: Vec<String>,
    #[serde(default)]
    pub exclude_extensions: Vec<String>,
    #[serde(default)]
    pub follow_symlinks: bool,
}

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

const EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "dist",
    "build",
    "out",
    "target",
    ".next",
    ".nuxt",
    ".turbo",
    "coverage",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    "vendor",
    "bin",
    "obj",
];

fn is_excluded_dir(entry: &DirEntry, exclude_dirs: &[String]) -> bool {
    if let Some(name) = entry.file_name().to_str() {
        if EXCLUDED_DIRS.contains(&name) || exclude_dirs.contains(&name.to_string()) {
            return true;
        }
    }
    false
}

pub async fn scan_path(
    path: &str,
    options: ScanOptions,
    window: tauri::Window,
) -> Result<ScanResult, String> {
    let start = Instant::now();
    let root = Path::new(path);

    if !root.exists() {
        return Err("Path does not exist".to_string());
    }

    let mut files: Vec<FileStats> = Vec::new();
    let mut files_scanned = 0u32;

    // Walk directory
    let walker = WalkDir::new(root)
        .follow_links(options.follow_symlinks)
        .into_iter()
        .filter_entry(|e| {
            if e.path().is_dir() {
                !is_excluded_dir(e, &options.exclude_dirs)
            } else {
                true
            }
        });

    for entry in walker {
        match entry {
            Ok(entry) => {
                if entry.path().is_file() {
                    if let Some(stats) = process_file(entry.path(), &options) {
                        files.push(stats);
                        files_scanned += 1;

                        // Emit progress every 10 files
                        if files_scanned % 10 == 0 {
                            let _ = window.emit(
                                "scan:progress",
                                ProgressEvent {
                                    files_scanned,
                                    current_file: entry.path().display().to_string(),
                                },
                            );
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("Error walking directory: {}", e);
            }
        }
    }

    // Aggregate by language
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

    // Calculate percentages
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

    // Calculate stats
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

fn process_file(path: &Path, _options: &ScanOptions) -> Option<FileStats> {
    let filename = path.file_name()?.to_str()?;
    let language = detect_language(filename);

    // Read file with encoding fallback
    let content = match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(_) => {
            // Fallback to latin-1 encoding
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
