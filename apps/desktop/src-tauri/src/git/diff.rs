use super::{GitDiffStats, GitError, GitFileChange};
use git2::{Diff, DiffDelta, DiffOptions, Oid, Patch, Delta};
use std::collections::HashMap;

/// Gets diff statistics for a commit
pub fn get_commit_diff_stats(
    repo_path: &str,
    commit_sha: &str,
) -> Result<GitDiffStats, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    let oid = Oid::from_str(commit_sha)
        .map_err(|_| GitError::CommitNotFound)?;
    
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;
    
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&tree),
        Some(&mut diff_opts),
    )?;

    let stats = diff.stats()?;
    
    Ok(GitDiffStats {
        files_changed: stats.files_changed(),
        insertions: stats.insertions(),
        deletions: stats.deletions(),
    })
}

fn delta_status_to_string(status: Delta) -> String {
    match status {
        Delta::Unmodified => "unmodified",
        Delta::Added => "added",
        Delta::Deleted => "deleted",
        Delta::Modified => "modified",
        Delta::Renamed => "renamed",
        Delta::Copied => "copied",
        Delta::Ignored => "ignored",
        Delta::Untracked => "untracked",
        Delta::Typechange => "typechange",
        Delta::Unreadable => "unreadable",
        Delta::Conflicted => "conflicted",
    }
    .to_string()
}

/// Gets detailed file changes for a commit (per-file insertions/deletions),
/// not the totals for the whole commit.
///
/// Notes:
/// - Merge commits are diffed against the first parent (like `git show`).
/// - Binary files or cases where a patch cannot be generated will report 0/0.
pub fn get_commit_file_changes(
    repo_path: &str,
    commit_sha: &str,
) -> Result<Vec<GitFileChange>, GitError> {
    let repo = super::repo::open_repository(repo_path)?;

    let oid = Oid::from_str(commit_sha).map_err(|_| GitError::CommitNotFound)?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let mut diff_opts = DiffOptions::new();
    // Optional: enable rename detection if you want better rename reporting
    // diff_opts.rename_threshold(50).detect_renames(true);

    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

    let mut file_changes = Vec::new();

    for (idx, delta) in diff.deltas().enumerate() {
        let status = delta_status_to_string(delta.status());
        // Prefer new path; fall back to old path for deletions
        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .and_then(|p| p.to_str())
            .unwrap_or("")
            .to_string();

        // Build a per-file patch to get line stats
        let (insertions, deletions) = if let Ok(Some(patch)) = Patch::from_diff(&diff, idx) {
            // (context, additions, deletions) — all usize
            let (_, adds, dels) = patch.line_stats().unwrap_or((0, 0, 0));
            (adds, dels)
        } else {
            (0, 0)
        };

        file_changes.push(GitFileChange {
            path,
            status,            // <-- now provided
            insertions,        // usize
            deletions,         // usize
        });
    }

    Ok(file_changes)
}

/// Extracts file change information from a diff delta
fn extract_file_change(delta: &DiffDelta, diff: &Diff) -> Option<GitFileChange> {
    let path = delta.new_file().path()?.to_string_lossy().to_string();
    
    let status = match delta.status() {
        git2::Delta::Added => "added",
        git2::Delta::Deleted => "deleted",
        git2::Delta::Modified => "modified",
        git2::Delta::Renamed => "renamed",
        git2::Delta::Copied => "copied",
        _ => "unknown",
    };

    // Calculate insertions and deletions for this file
    let (insertions, deletions) = calculate_file_stats(diff, &path);

    Some(GitFileChange {
        path,
        status: status.to_string(),
        insertions,
        deletions,
    })
}

/// Calculates insertions and deletions for a specific file in a diff
fn calculate_file_stats(diff: &Diff, file_path: &str) -> (usize, usize) {
    let mut insertions = 0;
    let mut deletions = 0;

    let _ = diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        match line.origin() {
            '+' => insertions += 1,
            '-' => deletions += 1,
            _ => {}
        }
        true
    });

    (insertions, deletions)
}

/// Gets diff statistics grouped by file extension
pub fn get_diff_stats_by_extension(
    repo_path: &str,
    commit_sha: &str,
) -> Result<HashMap<String, GitDiffStats>, GitError> {
    let file_changes = get_commit_file_changes(repo_path, commit_sha)?;
    
    let mut stats_by_ext: HashMap<String, GitDiffStats> = HashMap::new();

    for change in file_changes {
        let extension = std::path::Path::new(&change.path)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("no_extension")
            .to_string();

        let stats = stats_by_ext.entry(extension).or_insert(GitDiffStats {
            files_changed: 0,
            insertions: 0,
            deletions: 0,
        });

        stats.files_changed += 1;
        stats.insertions += change.insertions;
        stats.deletions += change.deletions;
    }

    Ok(stats_by_ext)
}

/// Compares two commits and returns the diff
pub fn compare_commits(
    repo_path: &str,
    from_sha: &str,
    to_sha: &str,
) -> Result<GitDiffStats, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    let from_oid = Oid::from_str(from_sha)
        .map_err(|_| GitError::CommitNotFound)?;
    let to_oid = Oid::from_str(to_sha)
        .map_err(|_| GitError::CommitNotFound)?;

    let from_commit = repo.find_commit(from_oid)?;
    let to_commit = repo.find_commit(to_oid)?;

    let from_tree = from_commit.tree()?;
    let to_tree = to_commit.tree()?;

    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_tree_to_tree(
        Some(&from_tree),
        Some(&to_tree),
        Some(&mut diff_opts),
    )?;

    let stats = diff.stats()?;
    
    Ok(GitDiffStats {
        files_changed: stats.files_changed(),
        insertions: stats.insertions(),
        deletions: stats.deletions(),
    })
}

/// Gets the patch content for a commit (text diff)
pub fn get_commit_patch(
    repo_path: &str,
    commit_sha: &str,
) -> Result<String, GitError> {
    let repo = super::repo::open_repository(repo_path)?;
    
    let oid = Oid::from_str(commit_sha)
        .map_err(|_| GitError::CommitNotFound)?;
    
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;
    
    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&tree),
        Some(&mut diff_opts),
    )?;

    let mut patch_content = String::new();
    
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        let content = std::str::from_utf8(line.content()).unwrap_or("");
        
        match origin {
            '+' | '-' | ' ' => {
                patch_content.push(origin);
                patch_content.push_str(content);
            }
            _ => {
                patch_content.push_str(content);
            }
        }
        
        true
    })?;

    Ok(patch_content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_commit_diff_stats() {
        // Only works in a git repo with commits
        if let Ok(repo_info) = super::super::repo::get_repo_info(".") {
            if let Some(head_commit) = repo_info.head_commit {
                if let Ok(stats) = get_commit_diff_stats(".", &head_commit.sha) {
                    println!("Files changed: {}", stats.files_changed);
                    println!("Insertions: {}", stats.insertions);
                    println!("Deletions: {}", stats.deletions);
                }
            }
        }
    }
}
