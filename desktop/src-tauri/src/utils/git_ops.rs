// Git operations utilities
// Consolidated from git module for cleaner architecture

use git2::{BranchType, Delta, DiffOptions, Oid, Patch, Repository};
use serde::{Deserialize, Serialize};
use std::path::Path;

// ===== Types =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommitInfo {
	pub sha: String,
	pub author_name: String,
	pub author_email: String,
	pub message: String,
	pub timestamp: i64,
	pub branch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiffStats {
	pub files_changed: usize,
	pub insertions: usize,
	pub deletions: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileChange {
	pub path: String,
	pub status: String,
	pub insertions: usize,
	pub deletions: usize,
}

#[derive(Debug)]
pub enum GitError {
	NotARepository,
	InvalidPath,
	CommitNotFound,
	GitOperationFailed(String),
}

impl std::fmt::Display for GitError {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			GitError::NotARepository => write!(f, "Not a Git repository"),
			GitError::InvalidPath => write!(f, "Invalid path"),
			GitError::CommitNotFound => write!(f, "Commit not found"),
			GitError::GitOperationFailed(msg) => write!(f, "Git operation failed: {}", msg),
		}
	}
}

impl From<git2::Error> for GitError {
	fn from(err: git2::Error) -> Self {
		GitError::GitOperationFailed(err.to_string())
	}
}

// ===== Repository Operations =====

fn open_repository(path: &str) -> Result<Repository, GitError> {
	let path = Path::new(path);
	if !path.exists() {
		return Err(GitError::InvalidPath);
	}
	Repository::open(path).map_err(|_| GitError::NotARepository)
}

pub fn is_git_repository(path: &str) -> bool {
	let path = Path::new(path);
	path.join(".git").exists() || Repository::open(path).is_ok()
}

pub fn get_branches(path: &str) -> Result<Vec<String>, GitError> {
	let repo = open_repository(path)?;
	let branches = repo.branches(Some(BranchType::Local))?;

	let mut branch_names = Vec::new();
	for branch in branches {
		let (branch, _) = branch?;
		if let Some(name) = branch.name()? {
			branch_names.push(name.to_string());
		}
	}

	Ok(branch_names)
}

// ===== Commit Operations =====

pub fn get_commits(
	repo_path: &str,
	branch: Option<&str>,
	limit: usize,
) -> Result<Vec<GitCommitInfo>, GitError> {
	let repo = open_repository(repo_path)?;

	let revspec = branch.unwrap_or("HEAD");
	let obj = repo.revparse_single(revspec)?;
	let commit = obj.peel_to_commit()?;

	let mut revwalk = repo.revwalk()?;
	revwalk.push(commit.id())?;
	revwalk.set_sorting(git2::Sort::TIME)?;

	let mut commits = Vec::new();
	for oid in revwalk.take(limit) {
		let oid = oid?;
		let commit = repo.find_commit(oid)?;

		let author = commit.author();
		commits.push(GitCommitInfo {
			sha: commit.id().to_string(),
			author_name: author.name().unwrap_or("Unknown").to_string(),
			author_email: author.email().unwrap_or("unknown").to_string(),
			message: commit.message().unwrap_or("").trim().to_string(),
			timestamp: commit.time().seconds(),
			branch: branch.map(String::from),
		});
	}

	Ok(commits)
}

// ===== Diff Operations =====

fn delta_status_to_string(status: Delta) -> String {
	match status {
		Delta::Added => "added",
		Delta::Deleted => "deleted",
		Delta::Modified => "modified",
		Delta::Renamed => "renamed",
		Delta::Copied => "copied",
		_ => "unknown",
	}
	.to_string()
}

pub fn get_commit_diff_stats(repo_path: &str, commit_sha: &str) -> Result<GitDiffStats, GitError> {
	let repo = open_repository(repo_path)?;
	let oid = Oid::from_str(commit_sha).map_err(|_| GitError::CommitNotFound)?;
	let commit = repo.find_commit(oid)?;
	let tree = commit.tree()?;

	let parent_tree =
		if commit.parent_count() > 0 { Some(commit.parent(0)?.tree()?) } else { None };

	let mut diff_opts = DiffOptions::new();
	let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

	let stats = diff.stats()?;

	Ok(GitDiffStats {
		files_changed: stats.files_changed(),
		insertions: stats.insertions(),
		deletions: stats.deletions(),
	})
}

pub fn get_commit_file_changes(
	repo_path: &str,
	commit_sha: &str,
) -> Result<Vec<GitFileChange>, GitError> {
	let repo = open_repository(repo_path)?;
	let oid = Oid::from_str(commit_sha).map_err(|_| GitError::CommitNotFound)?;
	let commit = repo.find_commit(oid)?;
	let tree = commit.tree()?;

	let parent_tree =
		if commit.parent_count() > 0 { Some(commit.parent(0)?.tree()?) } else { None };

	let mut diff_opts = DiffOptions::new();
	let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

	let mut file_changes = Vec::new();

	for (idx, delta) in diff.deltas().enumerate() {
		let path = delta
			.new_file()
			.path()
			.or_else(|| delta.old_file().path())
			.and_then(|p| p.to_str())
			.unwrap_or("unknown")
			.to_string();

		let status = delta_status_to_string(delta.status());

		let patch = Patch::from_diff(&diff, idx)?;
		let mut insertions = 0usize;
		let mut deletions = 0usize;

		if let Some(p) = patch {
			for hunk_idx in 0..p.num_hunks() {
				let line_count = p.num_lines_in_hunk(hunk_idx)?;
				for line_idx in 0..line_count {
					if let Ok(line) = p.line_in_hunk(hunk_idx, line_idx) {
						match line.origin() {
							'+' => insertions += 1,
							'-' => deletions += 1,
							_ => {}
						}
					}
				}
			}
		}

		file_changes.push(GitFileChange { path, status, insertions, deletions });
	}

	Ok(file_changes)
}
