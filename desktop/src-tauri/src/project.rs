use git2::{ObjectType, Repository, Sort, Tree, Error};
use std::collections::{BTreeSet, HashMap};
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

use regex::Regex;
use serde::Serialize;
use walkdir::WalkDir;

use crate::languages::languages;
use crate::user::{user, ScanSettings};
use chrono::{Datelike, Duration, TimeZone, Utc};
use git2::Oid;

#[derive(Serialize)]
pub struct FileStats {
	pub language: String,
	pub lines: u64,
	pub comments: u64,
	pub blank: u64,
	pub path: String,
}

#[allow(dead_code)]
pub struct Project {
	name: String,
	path: String,
}

impl Project {
	pub fn new(name: String, path: String) -> Self {
		Self { name, path }
	}

	// Given compiled patterns in order (regex, is_negation), determine if path is excluded
	fn is_path_excluded(&self, path: &str, compiled: &[(Regex, bool)]) -> bool {
		let mut matched = false;
		for (re, neg) in compiled {
			if re.is_match(path) {
				if *neg {
					matched = false;
				} else {
					matched = true;
				}
			}
		}
		matched
	}

	// Collect commit oids and timestamps in chronological order (oldest -> newest)
    fn collect_commit_oids(&self, repo: &Repository) -> Result<Vec<(Oid, i64)>, Error> {
        let mut revwalk = repo.revwalk()?;
        
        // 1. Commencer l'itération à partir de HEAD (le bout de la branche principale)
        revwalk.push_head()?;
        
        // 2. LA CORRECTION : Ignorer l'historique des branches fusionnées
        // En activant ceci, on reste uniquement sur la ligne temporelle principale.
        revwalk.simplify_first_parent()?;
        
        // 3. Trier topologiquement et inverser (REVERSE) 
        // pour avoir l'évolution chronologique (du plus vieux commit au plus récent)
        revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::REVERSE)?;
        
        let mut commits = Vec::new();
        
        // Parcourir les OIDs trouvés
        for id_result in revwalk {
            let oid = id_result?;
            
            // Si vous avez besoin du timestamp, récupérez le commit
            if let Ok(commit) = repo.find_commit(oid) {
                let ts = commit.time().seconds();
                commits.push((oid, ts));
            }
        }
        
        Ok(commits)
    }

	fn pattern_to_regex(&self, pat: &str) -> Result<Regex, regex::Error> {
		let p = pat.replace('\\', "/");
		let is_dir = p.ends_with('/');
		let core = if is_dir { p.trim_end_matches('/').to_string() } else { p };

		let mut regex = String::new();
		let mut chars = core.chars().peekable();
		while let Some(c) = chars.next() {
			if c == '*' {
				if chars.peek() == Some(&'*') {
					chars.next();
					regex.push_str(".*");
				} else {
					regex.push_str("[^/]*");
				}
			} else if c == '?' {
				regex.push('.');
			} else if "^$.+()[]{}|\\".contains(c) {
				regex.push('\\');
				regex.push(c);
			} else {
				regex.push(c);
			}
		}

		let final_re = if core.contains('/') {
			format!("^{}{}$", regex, if is_dir { "(/.*)?" } else { "" })
		} else {
			format!("(^|.*/){}{}$", regex, if is_dir { "(/.*)?" } else { "" })
		};

		Regex::new(&final_re)
	}

	// Return list of files to scan, respecting .gitignore-like patterns,
	// the persisted ScanSettings.excluded_expressions and the settingsOverride.
	fn get_files_to_scan(&self) -> Vec<String> {
		let mut files: Vec<String> = Vec::new();

		let root = Path::new(&self.path);
		if !root.exists() {
			return files;
		}

		// load user settings (fall back to default)
		let settings = match user().load_scan_settings() {
			Ok(s) => s,
			Err(_) => ScanSettings::default(),
		};

		// collect patterns: .gitignore first (if present), then ScanSettings, then settingsOverride
		let mut patterns: Vec<String> = Vec::new();
		let gitignore_path = root.join(".gitignore");
		if let Ok(content) = fs::read_to_string(&gitignore_path) {
			for line in content.lines() {
				let t = line.trim();
				if t.is_empty() || t.starts_with('#') {
					continue;
				}
				patterns.push(t.to_string());
			}
		}

		patterns.extend(settings.excluded_expressions.iter().cloned());

		// compile patterns into regex + negation flag using the existing pattern_to_regex()
		let compiled: Vec<(Regex, bool)> = patterns
			.into_iter()
			.filter_map(|pat| {
				let pat = pat.trim().to_string();
				if pat.is_empty() {
					return None;
				}
				let neg = pat.starts_with('!');
				let core = if neg { pat[1..].trim().to_string() } else { pat.clone() };
				match (&self).pattern_to_regex(&core) {
					Ok(re) => Some((re, neg)),
					Err(_) => None,
				}
			})
			.collect();

		// Use WalkDir filter_entry to avoid descending into excluded directories
		let walker = WalkDir::new(root)
			.follow_links(settings.follow_symlinks)
			.into_iter()
			.filter_entry(|e| {
				// determine relative path for the entry
				let rel = match e.path().strip_prefix(root) {
					Ok(p) => p.to_string_lossy().to_string(),
					Err(_) => return true,
				};
				// if the entry itself is excluded (dir), filter it out to prevent descent
				!(&self).is_path_excluded(&rel, &compiled)
			});

		for entry in walker.filter_map(|e| e.ok()) {
			if !entry.file_type().is_file() {
				continue;
			}

			let path = entry.path();
			let rel = match path.strip_prefix(root) {
				Ok(p) => p.to_string_lossy().to_string(),
				Err(_) => continue,
			};

			// final exclusion check for files
			if (&self).is_path_excluded(&rel, &compiled) {
				continue;
			}

			if let Some(s) = path.to_str() {
				files.push(s.to_string());
			}
		}

		files
	}

	fn scan_file(&self, file_path: String) -> Result<FileStats, String> {
		let path = PathBuf::from(&file_path);
		let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
		let language = languages().detect_language(filename);

		if language == "Unknown".to_string() {
			return Err(format!("Unknown file type: {}", filename));
		}

		let content =
			fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

		let (total, blank, comment, _code) = languages().count_lines(&content, &language);

		Ok(FileStats {
			language,
			lines: total as u64,
			comments: comment as u64,
			blank: blank as u64,
			path: file_path,
		})
	}

	pub async fn scan_directory(&self) -> Vec<FileStats> {
		let root = Path::new(&self.path);
		if !root.exists() {
			return vec![];
		}

		let files = self.get_files_to_scan();
		let mut stats = Vec::new();

		for f in files {
			let stat = self.scan_file(f);
			if let Ok(stat) = stat {
				stats.push(stat);
			} else {
			}
		}

		stats
	}

	fn count_tree_loc(&self, repo: &Repository, tree: &Tree) -> HashMap<String, u64> {
		let mut map: HashMap<String, u64> = HashMap::new();

		fn process_tree(repo: &Repository, tree: &Tree, map: &mut HashMap<String, u64>) {
			for entry in tree.iter() {
				match entry.kind() {
					Some(ObjectType::Tree) => {
						if let Ok(sub) = repo.find_tree(entry.id()) {
							process_tree(repo, &sub, map);
						}
					}
					Some(ObjectType::Blob) => {
						// Try to get file name
						if let Some(name) = entry.name() {
							// Determine language from extension
							let lang = Path::new(name)
								.extension()
								.and_then(OsStr::to_str)
								.map(|s| languages().ext_to_language(&s.to_lowercase()))
								.unwrap_or("Other")
								.to_string();

							// Skip unsupported and documentation languages
							let is_documentation = matches!(
								lang.as_str(),
								"Markdown"
									| "MDX" | "LaTeX" | "reStructuredText"
									| "HTML" | "XML" | "YAML" | "TOML"
									| "JSON"
							);
							if lang == "Other" || is_documentation {
								continue;
							}

							// Read blob content and count lines (safe UTF-8 lossy)
							if let Ok(blob) = repo.find_blob(entry.id()) {
								let text = String::from_utf8_lossy(blob.content());
								// count number of lines; empty file -> 0
								let lines = if text.is_empty() {
									0u64
								} else {
									text.lines().count() as u64
								};
								*map.entry(lang).or_insert(0) += lines;
							}
						} else {
							// Ignore files without valid name
							continue;
						}
					}
					// skip submodules (Commit / Gitlink) and other kinds
					_ => {}
				}
			}
		}

		process_tree(repo, tree, &mut map);
		map
	}

	pub async fn get_loc_evolution(&self) -> Vec<HashMap<String, u64>> {
		let mut result: Vec<HashMap<String, u64>> = Vec::new();

		let repo = match Repository::open(&self.path) {
			Ok(r) => r,
			Err(_) => return result,
		};

		let commits = match self.collect_commit_oids(&repo) {
			Ok(c) => c,
			Err(_) => return result,
		};

		for (oid, _ts) in commits {
			if let Ok(commit) = repo.find_commit(oid) {
				if let Ok(tree) = commit.tree() {
					let lang_map = self.count_tree_loc(&repo, &tree);
					result.push(lang_map);
				}
			}
		}

		// Collect all languages across all commits to normalize keys
		let mut all_languages: BTreeSet<String> = BTreeSet::new();
		for lang_map in &result {
			for lang in lang_map.keys() {
				all_languages.insert(lang.clone());
			}
		}

		// Ensure every commit has every language, filling missing ones with 0
		for lang_map in &mut result {
			for lang in &all_languages {
				lang_map.entry(lang.clone()).or_insert(0);
			}
		}

		result
	}

	pub async fn get_loc_diff(&self) -> HashMap<String, [i64; 2]> {
		let mut week_map: HashMap<String, [i64; 2]> = HashMap::new();

		let repo = match Repository::open(&self.path) {
			Ok(r) => r,
			Err(_) => return week_map,
		};

		let commits = match self.collect_commit_oids(&repo) {
			Ok(c) => c,
			Err(_) => return week_map,
		};

		for (oid, ts) in commits.iter() {
			if let Ok(commit) = repo.find_commit(*oid) {
				let parent = if commit.parent_count() > 0 { commit.parent(0).ok() } else { None };

				let tree = commit.tree().ok();
				let parent_tree = parent.and_then(|p| p.tree().ok());

				// compute diff stats between parent_tree and tree
				let mut insertions: i64 = 0;
				let mut deletions: i64 = 0;
				if let Some(t) = tree {
					let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&t), None).ok();
					if let Some(d) = diff {
						if let Ok(stats) = d.stats() {
							insertions = stats.insertions() as i64;
							deletions = stats.deletions() as i64;
						}
					}
				}

				// week key as Monday date
				let ndt = match Utc.timestamp_opt(*ts, 0).single() {
					Some(d) => d,
					None => Utc.timestamp_opt(0, 0).single().unwrap(),
				};
				let date = ndt.date_naive();
				let days_from_monday = date.weekday().num_days_from_monday() as i64;
				let monday = date - Duration::days(days_from_monday);
				let key = monday.format("%Y-%m-%d").to_string();

				let e = week_map.entry(key).or_insert([0, 0]);
				e[0] += insertions;
				e[1] += deletions;
			}
		}

		week_map
	}
}

impl Default for Project {
	fn default() -> Self {
		Self::new(String::new(), String::new())
	}
}
