use crate::git;
use crate::scan_settings::ScanSettings;
use crate::scanner::{detect_language, LanguageStats, ScanResult};
use git2::{ObjectType, Oid, Repository, TreeWalkMode, TreeWalkResult};
use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::Window;

#[derive(Debug, Clone, Serialize)]
pub struct CommitScan {
    pub commit: git::GitCommitInfo,
    pub result: ScanResult,
}

fn decode_to_string_lossy(bytes: &[u8]) -> String {
    match std::str::from_utf8(bytes) {
        Ok(s) => s.to_string(),
        Err(_) => {
            let (decoded, _, _) = encoding_rs::WINDOWS_1252.decode(bytes);
            decoded.to_string()
        }
    }
}

fn should_descend_dir(dir_name: &str, settings: &ScanSettings) -> bool {
    // Exclude directories by exact name or pattern (case-insensitive)
    let name = dir_name;
    if settings.excluded_dirs.iter().any(|d| d == name) {
        return false;
    }
    let name_ci = name.to_lowercase();
    for p in &settings.excluded_patterns {
        let p = p.to_lowercase();
        if wildcard_match(&p, &name_ci) {
            return false;
        }
    }
    true
}

fn wildcard_match(pattern: &str, text: &str) -> bool {
    let p: Vec<char> = pattern.chars().collect();
    let t: Vec<char> = text.chars().collect();

    let (mut i, mut j) = (0usize, 0usize);
    let mut star_j: Option<usize> = None;
    let mut match_i: usize = 0;

    while i < t.len() {
        if j < p.len() && (p[j] == '?' || p[j] == t[i]) {
            i += 1;
            j += 1;
        } else if j < p.len() && p[j] == '*' {
            star_j = Some(j);
            j += 1;
            match_i = i;
        } else if let Some(sj) = star_j {
            j = sj + 1;
            match_i += 1;
            i = match_i;
        } else {
            return false;
        }
    }
    while j < p.len() && p[j] == '*' {
        j += 1;
    }
    j == p.len()
}

fn should_include_file(path: &str, settings: &ScanSettings) -> bool {
    let filename = match Path::new(path).file_name().and_then(|s| s.to_str()) {
        Some(n) => n,
        None => return false,
    };
    // pattern exclusion
    let filename_ci = filename.to_lowercase();
    for p in &settings.excluded_patterns {
        let p = p.to_lowercase();
        if wildcard_match(&p, &filename_ci) {
            return false;
        }
    }
    // extension exclusion
    if let Some(ext) = Path::new(path).extension().and_then(|s| s.to_str()) {
        if settings
            .excluded_extensions
            .iter()
            .any(|e| e.eq_ignore_ascii_case(ext))
        {
            return false;
        }
    }
    // language detection allow/deny
    let lang = detect_language(filename);
    if lang == "Unknown" {
        return false;
    }
    if !settings.allowed_languages.is_empty()
        && !settings.allowed_languages.iter().any(|l| l == &lang)
    {
        return false;
    }
    if settings.excluded_languages.iter().any(|l| l == &lang) {
        return false;
    }
    true
}

fn count_blob_lines(bytes: &[u8], filename: &str) -> (u32, u32, u32, u32, String) {
    let language = detect_language(filename);
    let content = decode_to_string_lossy(bytes);
    let (total, blank, comment, code) = super::counter::count_lines(&content, &language);
    (total, blank, comment, code, language)
}

fn aggregate_files(files: &[(String, u32, u32, u32, u32, String)]) -> (ScanResult, HashMap<String, LanguageStats>) {
    let mut languages: HashMap<String, LanguageStats> = HashMap::new();
    let mut total_lines = 0u32;
    let mut total_code = 0u32;
    let mut total_comments = 0u32;
    let mut total_blank = 0u32;

    for (_path, total, blank, comment, code, lang) in files.iter() {
        total_lines += *total;
        total_code += *code;
        total_comments += *comment;
        total_blank += *blank;
        let entry = languages.entry(lang.clone()).or_insert(LanguageStats {
            files: 0,
            total: 0,
            blank: 0,
            comment: 0,
            code: 0,
            percentage: 0.0,
        });
        entry.files += 1;
        entry.total += *total;
        entry.blank += *blank;
        entry.comment += *comment;
        entry.code += *code;
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

    // mean/median/std_dev are computed on per-file totals
    let mut totals: Vec<u32> = files.iter().map(|f| f.1).collect();
    totals.sort_unstable();
    let mean = if totals.is_empty() { 0.0 } else { totals.iter().sum::<u32>() as f64 / totals.len() as f64 };
    let median = if totals.is_empty() {
        0.0
    } else if totals.len() % 2 == 0 {
        let mid = totals.len() / 2;
        (totals[mid - 1] + totals[mid]) as f64 / 2.0
    } else {
        totals[totals.len() / 2] as f64
    };
    let variance = if totals.is_empty() {
        0.0
    } else {
        totals
            .iter()
            .map(|&x| {
                let diff = x as f64 - mean;
                diff * diff
            })
            .sum::<f64>()
            / totals.len() as f64
    };
    let std_dev = variance.sqrt();

    let res = ScanResult {
        total_files: files.len() as u32,
        total_lines,
        total_code,
        total_comments,
        total_blank,
        comment_percentage,
        code_percentage,
        languages: languages.clone(),
        files: vec![],
        duration_ms: 0,
        mean,
        median,
        std_dev,
    };

    (res, languages)
}

pub async fn scan_repo_history(
    repo_path: &str,
    settings: ScanSettings,
    limit: usize,
    window: Window,
    cancel_flag: Arc<AtomicBool>,
) -> Result<Vec<CommitScan>, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    // Get commits from existing helper
    let commits = git::commits::get_commits(repo_path, None, limit).map_err(|e| e.to_string())?;

    let mut results: Vec<CommitScan> = Vec::with_capacity(commits.len());

    for (idx, c) in commits.iter().enumerate() {
        if cancel_flag.load(Ordering::Relaxed) { return Err("Scan cancelled".into()); }

        let start = Instant::now();
        let oid = Oid::from_str(&c.sha).map_err(|_| "Invalid commit id".to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        let tree = commit.tree().map_err(|e| e.to_string())?;

        // Collect eligible file paths in this tree
        let mut paths: Vec<String> = Vec::new();
        tree.walk(TreeWalkMode::PreOrder, |root, entry| {
            if cancel_flag.load(Ordering::Relaxed) { return TreeWalkResult::Abort; }
            let name = match entry.name() { Some(n) => n, None => return TreeWalkResult::Ok };
            let full_path = if root.is_empty() { name.to_string() } else { format!("{}{}", root, name) };

            match entry.kind() {
                Some(ObjectType::Tree) => {
                    // Directory: decide whether to descend
                    if should_descend_dir(name, &settings) {
                        TreeWalkResult::Ok
                    } else {
                        TreeWalkResult::Skip
                    }
                }
                Some(ObjectType::Blob) => {
                    if should_include_file(&full_path, &settings) {
                        paths.push(full_path);
                    }
                    TreeWalkResult::Ok
                }
                _ => TreeWalkResult::Ok,
            }
        })
        .map_err(|e| e.to_string())?;

        // Extract blob contents sequentially to avoid sharing non-Send git2 types across threads
        let blobs: Vec<(String, String, Vec<u8>)> = paths
            .iter()
            .filter_map(|p| {
                let entry = tree.get_path(Path::new(p)).ok()?;
                let obj = entry.to_object(&repo).ok()?;
                let blob = obj.as_blob()?;
                let filename = Path::new(p).file_name()?.to_str()?.to_string();
                Some((p.clone(), filename, blob.content().to_vec()))
            })
            .collect();

        // Process files in parallel using owned bytes
        let files_stats: Vec<(String, u32, u32, u32, u32, String)> = blobs
            .par_iter()
            .filter_map(|(path_str, filename, bytes)| {
                if cancel_flag.load(Ordering::Relaxed) { return None; }
                let (total, blank, comment, code, lang) = count_blob_lines(bytes, filename);
                Some((path_str.clone(), total, blank, comment, code, lang))
            })
            .collect();

        if cancel_flag.load(Ordering::Relaxed) { return Err("Scan cancelled".into()); }

        let (mut res, _langs) = aggregate_files(&files_stats);
        res.duration_ms = start.elapsed().as_millis() as u64;

        results.push(CommitScan { commit: c.clone(), result: res });

        // emit progress
        let _ = window.emit("scan_history:progress", serde_json::json!({
            "index": idx + 1,
            "total": commits.len(),
            "sha": c.sha,
        }));
    }

    Ok(results)
}
