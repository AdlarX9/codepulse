use git2::{Error, ObjectType, Repository, Sort, Tree};
use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

use ignore::gitignore::GitignoreBuilder;
use ignore::WalkBuilder;
use serde::Serialize;

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

#[derive(Serialize)]
pub struct CommitActivity {
	pub commit_oid: String,
	pub timestamp: i64,
	pub date: String,
	pub additions: i64,
	pub deletions: i64,
	pub total_loc: u64,
	pub loc_by_language: HashMap<String, u64>,
}

#[derive(Serialize, Clone)]
pub struct ContributorStats {
	pub key: String,
	pub pseudo: String,
	pub name: String,
	pub email: String,
	pub commits: u64,
	pub commit_percentage: f64,
	pub lines: u64,
	pub line_percentage: f64,
	pub lines_per_commit: f64,
	pub first_commit_date: String,
	pub last_commit_date: String,
}

#[derive(Serialize)]
pub struct ContributorsDashboardData {
	pub total_commits: u64,
	pub total_lines: u64,
	pub contributors: Vec<ContributorStats>,
}

#[derive(Clone)]
struct ContributorAccumulator {
	key: String,
	pseudo: String,
	name: String,
	email: String,
	commits: u64,
	lines: i64,
	first_commit_ts: Option<i64>,
	last_commit_ts: Option<i64>,
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

		// Build an additional root-scoped gitignore matcher from ScanSettings.
		let mut settings_ignore_builder = GitignoreBuilder::new(root);
		for pat in &settings.excluded_expressions {
			let trimmed = pat.trim();
			if trimmed.is_empty() || trimmed.starts_with('#') {
				continue;
			}
			let _ = settings_ignore_builder.add_line(None, trimmed);
		}
		let settings_ignore = settings_ignore_builder.build().ok();

		// Use ignore::WalkBuilder so nested .gitignore files are respected with local scope.
		let walker = WalkBuilder::new(root)
			.follow_links(settings.follow_symlinks)
			.hidden(false)
			.git_ignore(true)
			.git_global(false)
			.git_exclude(true)
			.parents(true)
			.build();

		for entry in walker.filter_map(|e| e.ok()) {
			if !entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
				continue;
			}

			let path = entry.path();

			if let Some(ignore_matcher) = &settings_ignore {
				if ignore_matcher.matched_path_or_any_parents(path, false).is_ignore() {
					continue;
				}
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

	fn contributor_key(name: Option<&str>, email: Option<&str>) -> String {
		if let Some(e) = email {
			let normalized = e.trim().to_lowercase();
			if !normalized.is_empty() {
				return normalized;
			}
		}

		if let Some(n) = name {
			let normalized = n.trim().to_lowercase();
			if !normalized.is_empty() {
				return normalized;
			}
		}

		"unknown".to_string()
	}

	fn pseudo_from_signature(name: Option<&str>, email: Option<&str>) -> String {
		if let Some(n) = name {
			let candidate = n.trim();
			if !candidate.is_empty() {
				return candidate.to_string();
			}
		}

		if let Some(e) = email {
			let trimmed = e.trim();
			if !trimmed.is_empty() {
				if let Some((local, _)) = trimmed.split_once('@') {
					if !local.trim().is_empty() {
						return local.trim().to_string();
					}
				}
				return trimmed.to_string();
			}
		}

		"Unknown".to_string()
	}

	fn format_date_from_timestamp(ts: i64) -> String {
		match Utc.timestamp_opt(ts, 0).single() {
			Some(d) => d.format("%Y-%m-%d").to_string(),
			None => "1970-01-01".to_string(),
		}
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
							// Determine language from full filename (supports special files)
							let lang = languages().detect_language(name);
							if lang == "Unknown"
								|| languages().get_language_category(&lang) != "code"
							{
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

	pub async fn get_commit_activity(&self) -> Vec<CommitActivity> {
		let mut result: Vec<CommitActivity> = Vec::new();

		let repo = match Repository::open(&self.path) {
			Ok(r) => r,
			Err(_) => return result,
		};

		let commits = match self.collect_commit_oids(&repo) {
			Ok(c) => c,
			Err(_) => return result,
		};

		for (oid, ts) in commits {
			if let Ok(commit) = repo.find_commit(oid) {
				let parent = if commit.parent_count() > 0 { commit.parent(0).ok() } else { None };

				let tree = commit.tree().ok();
				let parent_tree = parent.and_then(|p| p.tree().ok());

				let mut additions: i64 = 0;
				let mut deletions: i64 = 0;
				let mut loc_by_language: HashMap<String, u64> = HashMap::new();

				if let Some(t) = tree.as_ref() {
					let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(t), None).ok();
					if let Some(d) = diff {
						if let Ok(stats) = d.stats() {
							additions = stats.insertions() as i64;
							deletions = stats.deletions() as i64;
						}
					}

					loc_by_language = self.count_tree_loc(&repo, t);
				}

				let total_loc = loc_by_language.values().sum();

				let date = match Utc.timestamp_opt(ts, 0).single() {
					Some(d) => d.format("%Y-%m-%d").to_string(),
					None => "1970-01-01".to_string(),
				};

				result.push(CommitActivity {
					commit_oid: oid.to_string(),
					timestamp: ts,
					date,
					additions,
					deletions,
					total_loc,
					loc_by_language,
				});
			}
		}

		result
	}

	pub async fn get_contributor_count(&self) -> u64 {
		let repo = match Repository::open(&self.path) {
			Ok(r) => r,
			Err(_) => return 0,
		};

		let commits = match self.collect_commit_oids(&repo) {
			Ok(c) => c,
			Err(_) => return 0,
		};

		let mut contributors: HashSet<String> = HashSet::new();
		for (oid, _) in commits {
			if let Ok(commit) = repo.find_commit(oid) {
				let author = commit.author();
				contributors.insert(Self::contributor_key(author.name(), author.email()));
			}
		}

		contributors.len() as u64
	}

	pub async fn get_contributors_dashboard_data(&self) -> ContributorsDashboardData {
		let mut data = ContributorsDashboardData {
			total_commits: 0,
			total_lines: 0,
			contributors: Vec::new(),
		};

		let repo = match Repository::open(&self.path) {
			Ok(r) => r,
			Err(_) => return data,
		};

		let commits = match self.collect_commit_oids(&repo) {
			Ok(c) => c,
			Err(_) => return data,
		};

		let mut by_contributor: HashMap<String, ContributorAccumulator> = HashMap::new();

		for (oid, ts) in commits {
			if let Ok(commit) = repo.find_commit(oid) {
				let parent = if commit.parent_count() > 0 { commit.parent(0).ok() } else { None };

				let tree = commit.tree().ok();
				let parent_tree = parent.and_then(|p| p.tree().ok());

				let mut additions: i64 = 0;
				let mut deletions: i64 = 0;
				if let Some(t) = tree {
					let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&t), None).ok();
					if let Some(d) = diff {
						if let Ok(stats) = d.stats() {
							additions = stats.insertions() as i64;
							deletions = stats.deletions() as i64;
						}
					}
				}

				let author = commit.author();
				let key = Self::contributor_key(author.name(), author.email());
				let pseudo = Self::pseudo_from_signature(author.name(), author.email());
				let name = author.name().unwrap_or("Unknown").trim().to_string();
				let email = author.email().unwrap_or("").trim().to_string();

				let entry =
					by_contributor.entry(key.clone()).or_insert_with(|| ContributorAccumulator {
						key,
						pseudo,
						name,
						email,
						commits: 0,
						lines: 0,
						first_commit_ts: None,
						last_commit_ts: None,
					});

				entry.commits += 1;
				entry.lines += additions - deletions;
				entry.first_commit_ts = Some(match entry.first_commit_ts {
					Some(prev) => prev.min(ts),
					None => ts,
				});
				entry.last_commit_ts = Some(match entry.last_commit_ts {
					Some(prev) => prev.max(ts),
					None => ts,
				});

				if entry.name.is_empty() {
					entry.name = author.name().unwrap_or("Unknown").trim().to_string();
				}
				if entry.email.is_empty() {
					entry.email = author.email().unwrap_or("").trim().to_string();
				}
			}
		}

		data.total_commits = by_contributor.values().map(|c| c.commits).sum();
		data.total_lines = by_contributor.values().map(|c| c.lines.max(0) as u64).sum();

		let mut contributors: Vec<ContributorStats> = by_contributor
			.into_values()
			.map(|raw| {
				let normalized_lines = raw.lines.max(0) as u64;

				let commit_percentage = if data.total_commits > 0 {
					(raw.commits as f64 / data.total_commits as f64) * 100.0
				} else {
					0.0
				};

				let line_percentage = if data.total_lines > 0 {
					(normalized_lines as f64 / data.total_lines as f64) * 100.0
				} else {
					0.0
				};

				ContributorStats {
					key: raw.key,
					pseudo: raw.pseudo,
					name: if raw.name.is_empty() { "Unknown".to_string() } else { raw.name },
					email: raw.email,
					commits: raw.commits,
					commit_percentage,
					lines: normalized_lines,
					line_percentage,
					lines_per_commit: if raw.commits > 0 {
						normalized_lines as f64 / raw.commits as f64
					} else {
						0.0
					},
					first_commit_date: raw
						.first_commit_ts
						.map(Self::format_date_from_timestamp)
						.unwrap_or_else(|| "N/A".to_string()),
					last_commit_date: raw
						.last_commit_ts
						.map(Self::format_date_from_timestamp)
						.unwrap_or_else(|| "N/A".to_string()),
				}
			})
			.collect();

		contributors.sort_by(|a, b| {
			b.lines
				.cmp(&a.lines)
				.then_with(|| b.commits.cmp(&a.commits))
				.then_with(|| a.pseudo.cmp(&b.pseudo))
		});

		data.contributors = contributors;
		data
	}
}

impl Default for Project {
	fn default() -> Self {
		Self::new(String::new(), String::new())
	}
}
