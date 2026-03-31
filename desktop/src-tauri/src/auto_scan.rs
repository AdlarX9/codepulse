use dirs::home_dir;
use git2::{Config, Repository, Sort};
use rayon::prelude::*;
use std::collections::HashSet;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct ContributedRepository {
	pub path: String,
	pub name: String,
	pub last_contribution_ts: i64,
}

#[derive(Debug, Clone)]
struct GitIdentity {
	email: String,
}

impl GitIdentity {
	fn load() -> Result<Self, String> {
		let config = Config::open_default()
			.map_err(|error| format!("Cannot read Git configuration: {error}"))?;

		let email = normalize_identity(config.get_string("user.email").ok().as_deref())
			.ok_or_else(|| {
				"Auto Scan requires Git user.email to be configured for precise author matching."
					.to_string()
			})?;

		Ok(Self { email })
	}

	fn matches(&self, name: Option<&str>, email: Option<&str>) -> bool {
		let _ = name;
		normalize_identity(email).as_deref() == Some(self.email.as_str())
	}
}

fn normalize_identity(value: Option<&str>) -> Option<String> {
	value.map(str::trim).filter(|value| !value.is_empty()).map(|value| value.to_lowercase())
}

fn should_skip_dir(name: &OsStr) -> bool {
	// to_str() renvoie Some(&str) si le nom est valide en UTF-8.
	// C'est très rapide et ne fait aucune allocation mémoire.
	if let Some(name_str) = name.to_str() {
		matches!(
			name_str,
			"node_modules"
				| "target" | "dist"
				| "build" | "out"
				| ".cache" | ".npm"
				| ".pnpm-store"
				| ".yarn" | ".next"
				| ".nuxt" | ".venv"
				| "venv" | "__pycache__"
		)
	} else {
		// Si le nom du dossier contient des caractères invalides (non-UTF8),
		// il ne correspondra de toute façon pas à nos dossiers cibles.
		false
	}
}

fn normalize_path(path: &Path) -> PathBuf {
	fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
}

fn inspect_directory(dir: &Path) -> (bool, Vec<PathBuf>) {
	let entries = match fs::read_dir(dir) {
		Ok(entries) => entries,
		Err(_) => return (false, Vec::new()),
	};

	let mut child_dirs = Vec::new();
	for entry in entries.flatten() {
		let file_name = entry.file_name();
		if file_name == OsStr::new(".git") {
			return (true, Vec::new());
		}

		let file_type = match entry.file_type() {
			Ok(file_type) => file_type,
			Err(_) => continue,
		};

		if !file_type.is_dir() || should_skip_dir(&file_name) {
			continue;
		}

		child_dirs.push(entry.path());
	}

	(false, child_dirs)
}

fn discover_repository_roots_in_subtree(start: &Path) -> Vec<PathBuf> {
	let mut roots = Vec::new();
	let mut stack = vec![start.to_path_buf()];

	while let Some(dir) = stack.pop() {
		if let Some(name) = dir.file_name() {
			if should_skip_dir(name) {
				continue;
			}
		}

		let (is_repo_root, children) = inspect_directory(&dir);
		if is_repo_root {
			roots.push(normalize_path(&dir));
			continue;
		}

		stack.extend(children);
	}

	roots
}

fn discover_repository_roots(home: &Path) -> Vec<PathBuf> {
	let (home_is_repo, top_level_dirs) = inspect_directory(home);
	let mut roots = Vec::new();

	if home_is_repo {
		roots.push(normalize_path(home));
	}

	let mut nested_roots: Vec<PathBuf> = top_level_dirs
		.par_iter()
		.flat_map_iter(|dir| discover_repository_roots_in_subtree(dir))
		.collect();
	roots.append(&mut nested_roots);

	let mut unique = HashSet::new();
	roots.retain(|path| unique.insert(path.clone()));
	roots
}

fn project_name_from_path(path: &Path) -> String {
	path.file_name()
		.and_then(|name| name.to_str())
		.filter(|name| !name.is_empty())
		.unwrap_or("Project")
		.to_string()
}

fn get_latest_contribution(repo_path: &Path, identity: &GitIdentity) -> Option<i64> {
	let repository = Repository::open(repo_path).ok()?;
	let mut revwalk = repository.revwalk().ok()?;
	revwalk.push_head().ok()?;
	revwalk.set_sorting(Sort::TIME).ok()?;

	for oid_result in revwalk {
		let oid = match oid_result {
			Ok(oid) => oid,
			Err(_) => continue,
		};

		let commit = match repository.find_commit(oid) {
			Ok(commit) => commit,
			Err(_) => continue,
		};

		let author = commit.author();
		if identity.matches(author.name(), author.email()) {
			return Some(commit.time().seconds());
		}
	}

	None
}

pub fn scan_contributed_repositories() -> Result<Vec<ContributedRepository>, String> {
	let identity = GitIdentity::load()?;
	let home =
		home_dir().ok_or_else(|| "Cannot resolve your home directory for Auto Scan".to_string())?;

	let roots = discover_repository_roots(&home);
	let mut repositories: Vec<ContributedRepository> = roots
		.par_iter()
		.filter_map(|root| {
			let last_contribution_ts = get_latest_contribution(root, &identity)?;
			Some(ContributedRepository {
				path: root.to_string_lossy().to_string(),
				name: project_name_from_path(root),
				last_contribution_ts,
			})
		})
		.collect();

	repositories.sort_by(|left, right| {
		right
			.last_contribution_ts
			.cmp(&left.last_contribution_ts)
			.then_with(|| left.name.cmp(&right.name))
	});

	Ok(repositories)
}
