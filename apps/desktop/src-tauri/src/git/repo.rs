use super::{GitCommitInfo, GitError, GitRepoInfo};
use git2::{BranchType, Repository};
use std::path::Path;

/// Opens a Git repository at the given path
pub fn open_repository(path: &str) -> Result<Repository, GitError> {
    let path = Path::new(path);
    
    if !path.exists() {
        return Err(GitError::InvalidPath);
    }

    Repository::open(path).map_err(|_| GitError::NotARepository)
}

/// Checks if a directory is a Git repository
pub fn is_git_repository(path: &str) -> bool {
    let path = Path::new(path);
    path.join(".git").exists() || Repository::open(path).is_ok()
}

/// Gets repository information
pub fn get_repo_info(path: &str) -> Result<GitRepoInfo, GitError> {
    let repo = open_repository(path)?;
    
    // Get current branch
    let head = repo.head()?;
    let current_branch = if head.is_branch() {
        head.shorthand().unwrap_or("unknown").to_string()
    } else {
        "HEAD (detached)".to_string()
    };

    // Get remote URL
    let remote_url = repo
        .find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(String::from));

    // Get HEAD commit
    let head_commit = if let Ok(commit) = head.peel_to_commit() {
        Some(GitCommitInfo {
            sha: commit.id().to_string(),
            author_name: commit.author().name().unwrap_or("Unknown").to_string(),
            author_email: commit.author().email().unwrap_or("unknown").to_string(),
            message: commit.message().unwrap_or("").trim().to_string(),
            timestamp: commit.time().seconds(),
            branch: Some(current_branch.clone()),
        })
    } else {
        None
    };

    Ok(GitRepoInfo {
        path: path.to_string(),
        current_branch,
        remote_url,
        is_bare: repo.is_bare(),
        head_commit,
    })
}

/// Gets all branches in the repository
pub fn get_branches(path: &str) -> Result<Vec<String>, GitError> {
    let repo = open_repository(path)?;
    let branches = repo.branches(Some(BranchType::Local))?;
    
    let mut branch_names = Vec::new();
    for branch in branches {
        if let Ok((branch, _)) = branch {
            if let Some(name) = branch.name()? {
                branch_names.push(name.to_string());
            }
        }
    }
    
    Ok(branch_names)
}

/// Fetches latest changes from remote
pub fn fetch_from_remote(path: &str, remote_name: &str) -> Result<(), GitError> {
    let repo = open_repository(path)?;
    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| GitError::RemoteError(e.to_string()))?;

    remote
        .fetch(&["refs/heads/*:refs/heads/*"], None, None)
        .map_err(|e| GitError::RemoteError(e.to_string()))?;

    Ok(())
}

/// Gets the current HEAD commit SHA
pub fn get_head_sha(path: &str) -> Result<String, GitError> {
    let repo = open_repository(path)?;
    let head = repo.head()?;
    let commit = head.peel_to_commit()?;
    Ok(commit.id().to_string())
}

/// Checks if there are uncommitted changes
pub fn has_uncommitted_changes(path: &str) -> Result<bool, GitError> {
    let repo = open_repository(path)?;
    let statuses = repo.statuses(None)?;
    Ok(!statuses.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_git_repository() {
        // This will fail if not run in a git repo, but shows the API
        let result = is_git_repository(".");
        println!("Is git repo: {}", result);
    }
}
