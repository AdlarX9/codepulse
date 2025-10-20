// Git operations module
pub mod repo;
pub mod commits;
pub mod diff;

// Re-export functions from submodules (unused warnings are OK)
#[allow(unused_imports)]
pub use repo::*;
#[allow(unused_imports)]
pub use commits::*;
#[allow(unused_imports)]
pub use diff::*;

use serde::{Deserialize, Serialize};

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
    pub status: String, // added, modified, deleted, renamed
    pub insertions: usize,
    pub deletions: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitRepoInfo {
    pub path: String,
    pub current_branch: String,
    pub remote_url: Option<String>,
    pub is_bare: bool,
    pub head_commit: Option<GitCommitInfo>,
}

#[derive(Debug)]
pub enum GitError {
    NotARepository,
    InvalidPath,
    CommitNotFound,
    BranchNotFound,
    RemoteError(String),
    GitOperationFailed(String),
}

impl std::fmt::Display for GitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GitError::NotARepository => write!(f, "Not a Git repository"),
            GitError::InvalidPath => write!(f, "Invalid path"),
            GitError::CommitNotFound => write!(f, "Commit not found"),
            GitError::BranchNotFound => write!(f, "Branch not found"),
            GitError::RemoteError(msg) => write!(f, "Remote error: {}", msg),
            GitError::GitOperationFailed(msg) => write!(f, "Git operation failed: {}", msg),
        }
    }
}

impl From<git2::Error> for GitError {
    fn from(err: git2::Error) -> Self {
        GitError::GitOperationFailed(err.to_string())
    }
}
