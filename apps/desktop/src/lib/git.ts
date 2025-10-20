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

export interface GitDiffStats {
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

export interface GitRepoInfo {
	path: string
	current_branch: string
	remote_url?: string
	is_bare: boolean
	head_commit?: GitCommitInfo
}

/**
 * Check if a directory is a Git repository
 */
export async function isGitRepository(path: string): Promise<boolean> {
	return invoke<boolean>('git_is_repository', { path })
}

/**
 * Get repository information
 */
export async function getRepoInfo(path: string): Promise<GitRepoInfo> {
	return invoke<GitRepoInfo>('git_get_repo_info', { path })
}

/**
 * Get list of branches
 */
export async function getBranches(path: string): Promise<string[]> {
	return invoke<string[]>('git_get_branches', { path })
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
 * Get commits since a specific commit SHA
 */
export async function getCommitsSince(
	path: string,
	sinceSha: string,
	branch?: string
): Promise<GitCommitInfo[]> {
	return invoke<GitCommitInfo[]>('git_get_commits_since', {
		path,
		sinceSha,
		branch: branch ?? null
	})
}

/**
 * Get a single commit by SHA
 */
export async function getCommitBySha(path: string, sha: string): Promise<GitCommitInfo> {
	return invoke<GitCommitInfo>('git_get_commit_by_sha', { path, sha })
}

/**
 * Get diff statistics for a commit
 */
export async function getCommitDiffStats(path: string, commitSha: string): Promise<GitDiffStats> {
	return invoke<GitDiffStats>('git_get_commit_diff_stats', { path, commitSha })
}

/**
 * Get detailed file changes for a commit
 */
export async function getCommitFileChanges(
	path: string,
	commitSha: string
): Promise<GitFileChange[]> {
	return invoke<GitFileChange[]>('git_get_commit_file_changes', { path, commitSha })
}

/**
 * Fetch latest changes from remote
 */
export async function fetchFromRemote(path: string, remoteName: string = 'origin'): Promise<void> {
	return invoke<void>('git_fetch_from_remote', { path, remoteName })
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(path: string): Promise<boolean> {
	return invoke<boolean>('git_has_uncommitted_changes', { path })
}

/**
 * Format a timestamp to a human-readable date
 */
export function formatCommitDate(timestamp: number): string {
	return new Date(timestamp * 1000).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	})
}

/**
 * Format commit SHA to short version (7 chars)
 */
export function formatShortSha(sha: string): string {
	return sha.substring(0, 7)
}

/**
 * Get commit message first line (summary)
 */
export function getCommitSummary(message: string): string {
	return message.split('\n')[0]
}
