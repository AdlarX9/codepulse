// Git auto-sync service
import * as git from './git'

export interface SyncStatus {
	isSyncing: boolean
	lastSync: Date | null
	newCommits: number
	error: string | null
}

export interface GitProject {
	id: string
	path: string
	lastCommitSha: string | null
}

/**
 * Check for new commits in a Git repository
 */
export async function checkForNewCommits(
	projectPath: string,
	lastKnownSha: string | null
): Promise<git.GitCommitInfo[]> {
	try {
		const isGit = await git.isGitRepository(projectPath)
		if (!isGit) {
			return []
		}

		if (!lastKnownSha) {
			// No previous sync, get last 10 commits
			return await git.getCommits(projectPath, undefined, 10)
		}

		// Get commits since last known SHA
		return await git.getCommitsSince(projectPath, lastKnownSha)
	} catch (error) {
		console.error('Failed to check for new commits:', error)
		return []
	}
}
