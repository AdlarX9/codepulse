use super::{GitCommitInfo, GitError};
use git2::Oid;

/// Gets a list of commits from the repository
pub fn get_commits(
    repo_path: &str,
    branch: Option<&str>,
    limit: usize,
) -> Result<Vec<GitCommitInfo>, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    // Resolve the starting point
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
        let author_name = author.name().unwrap_or("Unknown").to_string();
        let author_email = author.email().unwrap_or("unknown").to_string();
        let message = commit.message().unwrap_or("").trim().to_string();
        
        commits.push(GitCommitInfo {
            sha: commit.id().to_string(),
            author_name,
            author_email,
            message,
            timestamp: commit.time().seconds(),
            branch: branch.map(String::from),
        });
    }

    Ok(commits)
}

/// Gets commits since a specific commit SHA
pub fn get_commits_since(
    repo_path: &str,
    since_sha: &str,
    branch: Option<&str>,
) -> Result<Vec<GitCommitInfo>, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    // Parse the since commit SHA
    let since_oid = Oid::from_str(since_sha)
        .map_err(|_| GitError::CommitNotFound)?;
    
    // Resolve the starting point
    let revspec = branch.unwrap_or("HEAD");
    let obj = repo.revparse_single(revspec)?;
    let head_commit = obj.peel_to_commit()?;

    let mut revwalk = repo.revwalk()?;
    revwalk.push(head_commit.id())?;
    revwalk.set_sorting(git2::Sort::TIME | git2::Sort::TOPOLOGICAL)?;

    let mut commits = Vec::new();
    for oid in revwalk {
        let oid = oid?;
        
        // Stop when we reach the since commit
        if oid == since_oid {
            break;
        }
        
        let commit = repo.find_commit(oid)?;
        let author = commit.author();
        let author_name = author.name().unwrap_or("Unknown").to_string();
        let author_email = author.email().unwrap_or("unknown").to_string();
        let message = commit.message().unwrap_or("").trim().to_string();
        
        commits.push(GitCommitInfo {
            sha: commit.id().to_string(),
            author_name,
            author_email,
            message,
            timestamp: commit.time().seconds(),
            branch: branch.map(String::from),
        });
    }

    Ok(commits)
}

/// Gets a single commit by SHA
pub fn get_commit_by_sha(
    repo_path: &str,
    sha: &str,
) -> Result<GitCommitInfo, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    let oid = Oid::from_str(sha)
        .map_err(|_| GitError::CommitNotFound)?;
    
    let commit = repo.find_commit(oid)?;
    
    let author = commit.author();
    let author_name = author.name().unwrap_or("Unknown").to_string();
    let author_email = author.email().unwrap_or("unknown").to_string();
    let message = commit.message().unwrap_or("").trim().to_string();
    
    Ok(GitCommitInfo {
        sha: commit.id().to_string(),
        author_name,
        author_email,
        message,
        timestamp: commit.time().seconds(),
        branch: None,
    })
}

/// Gets the list of files changed in a commit
pub fn get_commit_files(repo_path: &str, sha: &str) -> Result<Vec<String>, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    let oid = Oid::from_str(sha)
        .map_err(|_| GitError::CommitNotFound)?;
    
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;
    
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let mut diff_opts = git2::DiffOptions::new();
    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&tree),
        Some(&mut diff_opts),
    )?;

    let mut files = Vec::new();
    diff.foreach(
        &mut |delta, _| {
            if let Some(path) = delta.new_file().path() {
                files.push(path.to_string_lossy().to_string());
            }
            true
        },
        None,
        None,
        None,
    )?;

    Ok(files)
}

/// Counts commits by author
pub fn count_commits_by_author(
    repo_path: &str,
    limit: Option<usize>,
) -> Result<std::collections::HashMap<String, usize>, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    revwalk.set_sorting(git2::Sort::TIME)?;

    let mut author_counts = std::collections::HashMap::new();
    
    let commits = if let Some(lim) = limit {
        revwalk.take(lim).collect::<Vec<_>>()
    } else {
        revwalk.collect::<Vec<_>>()
    };

    for oid in commits {
        let oid = oid?;
        let commit = repo.find_commit(oid)?;
        let author = commit.author().name().unwrap_or("Unknown").to_string();
        *author_counts.entry(author).or_insert(0) += 1;
    }

    Ok(author_counts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_commits() {
        // This will only work if run in a git repo
        if let Ok(commits) = get_commits(".", None, 5) {
            println!("Found {} commits", commits.len());
            for commit in commits {
                println!("  {} - {}", &commit.sha[..7], commit.message.lines().next().unwrap_or(""));
            }
        }
    }
}
