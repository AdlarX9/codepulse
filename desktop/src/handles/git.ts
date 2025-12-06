// Git operations wrapper using Tauri commands
import { invoke } from '@tauri-apps/api/tauri'

export interface GitCommitInfo {
	sha: string
	author_name: string
	author_email: string
	message: string
	timestamp: number
	branch?: string
}

interface GitDiffStats {
	files_changed: number
	insertions: number
	deletions: number
}

export interface GitFileChange {
	path: string
	status: string // 'added', 'modified', 'deleted', 'renamed'
	insertions: number
	deletions: number
}

/**
 * Check if a directory is a Git repository
 */
export async function isGitRepository(path: string): Promise<boolean> {
	return invoke<boolean>('git_is_repository', { path })
}

/**
 * Get list of commits
 */
export async function getCommits(
	path: string,
	branch?: string,
	limit: number = 50
): Promise<GitCommitInfo[]> {
	return invoke<GitCommitInfo[]>('git_get_commits', {
		path,
		branch: branch ?? null,
		limit
	})
}

/**
 * Get diff statistics for a commit
 */
export async function getCommitDiffStats(path: string, commitSha: string): Promise<GitDiffStats> {
	return invoke<GitDiffStats>('git_get_commit_diff_stats', { path, commitSha })
}
