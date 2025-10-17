use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;
use walkdir::WalkDir;

use crate::language::detect_language;
use crate::categories;

#[derive(Debug, Clone, Serialize)]
pub struct FileStats {
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
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub total_files: u32,
    pub total_lines: u32,
    pub total_code: u32,
    pub total_comments: u32,
    pub total_blank: u32,
    pub languages: HashMap<String, LanguageStats>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SnapshotLang {
    pub language: String,
    pub files: u32,
    pub total: u32,
    pub code: u32,
    pub comment: u32,
    pub blank: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanSnapshot {
    pub total: u32,
    pub code: u32,
    pub comment: u32,
    pub blank: u32,
    pub comment_ratio: f64,
    pub core_code_lines: u32,
    pub info_lines: u32,
    pub per_language: Vec<SnapshotLang>,
}

pub fn scan_directory(path: &str, exclude_patterns: Vec<String>) -> Result<ScanResult, String> {
    let start = Instant::now();
    let root = Path::new(path);

    if !root.exists() {
        return Err("Path does not exist".to_string());
    }

    // Collect files
    let mut file_paths: Vec<PathBuf> = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| should_include_entry(e, &exclude_patterns))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            file_paths.push(entry.path().to_path_buf());
        }
    }

    // Scan files in parallel
    let file_stats: Vec<FileStats> = file_paths
        .par_iter()
        .filter_map(|path| scan_file(path).ok())
        .collect();

    // Aggregate by language
    let mut languages: HashMap<String, LanguageStats> = HashMap::new();
    let mut total_lines = 0;
    let mut total_code = 0;
    let mut total_comments = 0;
    let mut total_blank = 0;

    for stats in &file_stats {
        let lang_stats = languages.entry(stats.language.clone()).or_insert(LanguageStats {
            files: 0,
            total: 0,
            blank: 0,
            comment: 0,
            code: 0,
        });

        lang_stats.files += 1;
        lang_stats.total += stats.total;
        lang_stats.blank += stats.blank;
        lang_stats.comment += stats.comment;
        lang_stats.code += stats.code;

        total_lines += stats.total;
        total_code += stats.code;
        total_comments += stats.comment;
        total_blank += stats.blank;
    }

    let duration = start.elapsed();

    Ok(ScanResult {
        total_files: file_stats.len() as u32,
        total_lines,
        total_code,
        total_comments,
        total_blank,
        languages,
        duration_ms: duration.as_millis() as u64,
    })
}

fn should_include_entry(entry: &walkdir::DirEntry, exclude_patterns: &[String]) -> bool {
    let path_str = entry.path().to_string_lossy();

    for pattern in exclude_patterns {
        if path_str.contains(pattern.trim_matches('*')) {
            return false;
        }
    }

    true
}

fn scan_file(path: &Path) -> Result<FileStats, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let language = detect_language(path);

    let mut total = 0;
    let mut blank = 0;
    let mut comment = 0;
    let mut in_block_comment = false;

    for line in content.lines() {
        total += 1;
        let trimmed = line.trim();

        if trimmed.is_empty() {
            blank += 1;
            continue;
        }

        // Simple comment detection (can be improved)
        if trimmed.starts_with("//") || trimmed.starts_with("#") || trimmed.starts_with("--") {
            comment += 1;
            continue;
        }

        // Block comments
        if trimmed.starts_with("/*") || trimmed.starts_with("<!--") {
            in_block_comment = true;
            comment += 1;
            continue;
        }

        if in_block_comment {
            comment += 1;
            if trimmed.ends_with("*/") || trimmed.ends_with("-->") {
                in_block_comment = false;
            }
            continue;
        }
    }

    let code = total - blank - comment;

    Ok(FileStats {
        language: language.to_string(),
        total,
        blank,
        comment,
        code,
    })
}

pub fn to_snapshot(result: &ScanResult) -> ScanSnapshot {
    let mut per_language: Vec<SnapshotLang> = Vec::with_capacity(result.languages.len());
    let mut lang_totals: Vec<(String, u32)> = Vec::with_capacity(result.languages.len());

    for (lang, stats) in &result.languages {
        per_language.push(SnapshotLang {
            language: lang.clone(),
            files: stats.files,
            total: stats.total,
            code: stats.code,
            comment: stats.comment,
            blank: stats.blank,
        });
        lang_totals.push((lang.clone(), stats.total));
    }

    // Sort by total lines descending
    per_language.sort_by(|a, b| b.total.cmp(&a.total));

    let comment_ratio = if result.total_code > 0 {
        result.total_comments as f64 / result.total_code as f64
    } else {
        0.0
    };

    // Calculate core vs info lines
    let (core_code_lines, info_lines) = categories::aggregate_by_category(&lang_totals);

    ScanSnapshot {
        total: result.total_lines,
        code: result.total_code,
        comment: result.total_comments,
        blank: result.total_blank,
        comment_ratio,
        core_code_lines,
        info_lines,
        per_language,
    }
}
