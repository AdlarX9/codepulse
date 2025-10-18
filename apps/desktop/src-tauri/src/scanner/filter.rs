use walkdir::{DirEntry};
use crate::scan_settings::ScanSettings;
use crate::scanner::detect_language;

/// Examples:
/// - pattern `*lib*` matches `mylib`, `my_lib.rs`, `lib`
/// - pattern `*lock.*` matches `package-lock.json`, but NOT `yarn.lock` (because nothing after the dot)
fn matches_any(name: &str, patterns: &[impl AsRef<str>]) -> bool {
    patterns.iter().any(|p| wildcard_match(p.as_ref(), name))
}

/// Case-insensitive variant (simple Unicode lowercase comparison).
fn matches_any_ci(name: &str, patterns: &[impl AsRef<str>]) -> bool {
    let name = name.to_lowercase();
    patterns
        .iter()
        .map(|p| p.as_ref().to_lowercase())
        .any(|p| wildcard_match(&p, &name))
}

/// Wildcard matcher supporting `*` and `?`.
/// Greedy algorithm with backtracking on `*` (classic approach).
fn wildcard_match(pattern: &str, text: &str) -> bool {
    // Work with chars to be Unicode-safe w.r.t. character boundaries.
    let p: Vec<char> = pattern.chars().collect();
    let t: Vec<char> = text.chars().collect();

    let (mut i, mut j) = (0usize, 0usize);       // i for text, j for pattern
    let mut star_j: Option<usize> = None;        // last position of '*' in pattern
    let mut match_i: usize = 0;                  // position in text to backtrack to after a '*'

    while i < t.len() {
        if j < p.len() && (p[j] == '?' || p[j] == t[i]) {
            // single-char match
            i += 1;
            j += 1;
        } else if j < p.len() && p[j] == '*' {
            // record star position, and try to match zero chars first
            star_j = Some(j);
            j += 1;
            match_i = i;
        } else if let Some(sj) = star_j {
            // backtrack: let '*' match one more char
            j = sj + 1;
            match_i += 1;
            i = match_i;
        } else {
            return false;
        }
    }

    // Skip trailing '*' in pattern
    while j < p.len() && p[j] == '*' {
        j += 1;
    }
    j == p.len()
}

fn is_excluded_dir(entry: &DirEntry, excluded_dirs: &[String], excluded_patterns: &[String]) -> bool {
    if let Some(name) = entry.file_name().to_str() {
        // Exact name exclusion
        if excluded_dirs.iter().any(|d| d == name) {
            return true;
        }
        // Wildcard patterns (case-insensitive)
        if matches_any_ci(name, excluded_patterns) {
            return true;
        }
    }
    false
}

pub fn count_files(entry: &DirEntry, settings: ScanSettings) -> bool {
    if entry.path().is_dir() {
        // Directory is counted/traversed only if NOT excluded by name or pattern
        return !is_excluded_dir(entry, &settings.excluded_dirs, &settings.excluded_patterns);
    } else {
        if let Some(filename) = entry.path().file_name().and_then(|s| s.to_str()) {
            // Pattern-based exclusion on full filename
            if matches_any_ci(filename, &settings.excluded_patterns) {
                return false;
            }

            // Extension-based exclusion (case-insensitive), use raw extension (no dot)
            if let Some(ext) = entry
                .path()
                .extension()
                .and_then(|s| s.to_str())
            {
                if settings
                    .excluded_extensions
                    .iter()
                    .any(|e| e.eq_ignore_ascii_case(ext))
                {
                    return false;
                }
            }

            // Language detection based inclusion/exclusion
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
        } else {
            // Non-UTF8 filename: skip to be safe
            false
        }
    }
}
