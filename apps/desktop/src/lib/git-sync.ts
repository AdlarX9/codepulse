// Git auto-sync service
import * as git from './git'
import { api } from './api'

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

/**
 * Sync new commits to backend
 */
export async function syncCommitsToBackend(
	projectId: string,
	commits: git.GitCommitInfo[]
): Promise<boolean> {
	try {
		for (const commit of commits) {
			// Get diff stats for each commit
			const diffStats = await git.getCommitDiffStats(
				'', // Path will be resolved from project
				commit.sha
			)

			// Create commit scan via API
			await api.request(`/projects/${projectId}/commits`, {
				method: 'POST',
				body: JSON.stringify({
					commit_sha: commit.sha,
					commit_message: commit.message,
					commit_author: commit.author_name,
					commit_date: new Date(commit.timestamp * 1000).toISOString(),
					files_changed: diffStats.files_changed,
					lines_added: diffStats.insertions,
					lines_deleted: diffStats.deletions
				})
			})
		}

		return true
	} catch (error) {
		console.error('Failed to sync commits:', error)
		return false
	}
}

/**
 * Auto-sync worker class
 */
export class GitSyncWorker {
	private interval: number
	private timerId: NodeJS.Timeout | null = null
	private projects: GitProject[] = []
	private syncStatus: Map<string, SyncStatus> = new Map()

	constructor(intervalMinutes: number = 15) {
		this.interval = intervalMinutes * 60 * 1000
	}

	/**
	 * Add a project to sync
	 */
	addProject(project: GitProject) {
		const existing = this.projects.find(p => p.id === project.id)
		if (!existing) {
			this.projects.push(project)
			this.syncStatus.set(project.id, {
				isSyncing: false,
				lastSync: null,
				newCommits: 0,
				error: null
			})
		}
	}

	/**
	 * Remove a project from sync
	 */
	removeProject(projectId: string) {
		this.projects = this.projects.filter(p => p.id !== projectId)
		this.syncStatus.delete(projectId)
	}

	/**
	 * Get sync status for a project
	 */
	getStatus(projectId: string): SyncStatus | null {
		return this.syncStatus.get(projectId) || null
	}

	/**
	 * Manually trigger sync for a project
	 */
	async syncProject(projectId: string): Promise<void> {
		const project = this.projects.find(p => p.id === projectId)
		if (!project) {
			return
		}

		const status = this.syncStatus.get(projectId)
		if (!status || status.isSyncing) {
			return
		}

		// Update status
		this.syncStatus.set(projectId, {
			...status,
			isSyncing: true,
			error: null
		})

		try {
			// Check for new commits
			const newCommits = await checkForNewCommits(project.path, project.lastCommitSha)

			if (newCommits.length > 0) {
				// Sync to backend
				const success = await syncCommitsToBackend(projectId, newCommits)

				if (success) {
					// Update last known SHA
					project.lastCommitSha = newCommits[0].sha

					this.syncStatus.set(projectId, {
						isSyncing: false,
						lastSync: new Date(),
						newCommits: newCommits.length,
						error: null
					})
				} else {
					throw new Error('Failed to sync commits to backend')
				}
			} else {
				this.syncStatus.set(projectId, {
					isSyncing: false,
					lastSync: new Date(),
					newCommits: 0,
					error: null
				})
			}
		} catch (error) {
			this.syncStatus.set(projectId, {
				isSyncing: false,
				lastSync: new Date(),
				newCommits: 0,
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	/**
	 * Sync all projects
	 */
	async syncAll(): Promise<void> {
		const promises = this.projects.map(project => this.syncProject(project.id))
		await Promise.all(promises)
	}

	/**
	 * Start auto-sync worker
	 */
	start() {
		if (this.timerId) {
			return
		}

		// Initial sync
		this.syncAll()

		// Setup interval
		this.timerId = setInterval(() => {
			this.syncAll()
		}, this.interval)

		console.log(`Git sync worker started (interval: ${this.interval / 1000 / 60}m)`)
	}

	/**
	 * Stop auto-sync worker
	 */
	stop() {
		if (this.timerId) {
			clearInterval(this.timerId)
			this.timerId = null
			console.log('Git sync worker stopped')
		}
	}

	/**
	 * Check if worker is running
	 */
	isRunning(): boolean {
		return this.timerId !== null
	}
}

// Global instance
let globalSyncWorker: GitSyncWorker | null = null

/**
 * Get or create global sync worker
 */
export function getSyncWorker(): GitSyncWorker {
	if (!globalSyncWorker) {
		globalSyncWorker = new GitSyncWorker(15) // 15 minutes default
	}
	return globalSyncWorker
}
