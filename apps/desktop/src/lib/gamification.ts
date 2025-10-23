// Gamification API client
import { api } from './api'

export interface Streak {
	current: number
	longest: number
	lastActivityDate: string | null
}

/**
 * Ensure the user has a baseline set of challenges. If none exist, create a few defaults.
 */
export async function ensureDefaultChallenges(): Promise<void> {
	try {
		const current = await getChallenges('active')
		if ((current?.length || 0) > 0) return

		const defaults = [
			{
				type: 'commit_streak',
				title: 'Coder 5 jours d’affilé',
				description: 'Fais au moins un commit par jour pendant 5 jours consécutifs.',
				target: { days: 5 },
				duration_days: 14
			},
			{
				type: 'daily_commits',
				title: '10 commits en 7 jours',
				description: 'Atteins 10 commits sur la semaine.',
				target: { commits: 10 },
				duration_days: 7
			},
			{
				type: 'code_lines',
				title: 'Ajouter 2k lignes de code',
				description: 'Ajoute 2000 lignes de code au total.',
				target: { lines: 2000 },
				duration_days: 21
			},
			{
				type: 'quality_score',
				title: 'Qualité 90/100',
				description: 'Atteins un score de qualité de 90/100 sur un projet.',
				target: { score: 90 },
				duration_days: 30
			}
		]

		for (const d of defaults) {
			await api.request('/me/challenges', {
				method: 'POST',
				body: JSON.stringify({
					type: d.type,
					title: d.title,
					description: d.description,
					target: d.target,
					duration_days: d.duration_days
				})
			})
		}
	} catch (e) {
		// non-blocking
		console.warn('ensureDefaultChallenges failed', e)
	}
}

export interface Badge {
	id: string
	name: string
	description: string
	icon: string
	unlockedAt: string
	category: 'commit' | 'quality' | 'consistency' | 'milestone'
}

export interface Challenge {
	id: string
	userId: string
	projectId?: string
	type: string
	title: string
	description: string
	target: Record<string, any>
	progress: Record<string, any>
	status: 'active' | 'completed' | 'failed' | 'expired'
	startsAt: string
	endsAt: string
	completedAt?: string
	reward?: string
}

export interface UserGamificationStats {
	streak: Streak
	badges: Badge[]
	totalCommitScans: number
	level: number
	xp: number
}

/**
 * Get user's current streak information
 */
export async function getStreak(): Promise<Streak> {
	const response = await api.request<{ streak: Streak }>('/gamification/streak', {
		method: 'GET'
	})
	return response.streak
}

/**
 * Get user's badges
 */
export async function getBadges(): Promise<Badge[]> {
	const response = await api.request<{ badges: Badge[] }>('/gamification/badges', {
		method: 'GET'
	})
	return response.badges
}

/**
 * Get user's active challenges
 */
export async function getChallenges(
	status?: 'active' | 'completed' | 'failed' | 'expired'
): Promise<Challenge[]> {
	const params = status ? `?status=${status}` : ''
	const response = await api.request<{ challenges: Challenge[] }>(
		`/gamification/challenges${params}`,
		{ method: 'GET' }
	)
	return response.challenges
}

/**
 * Get project-specific challenges
 */
export async function getProjectChallenges(projectId: string): Promise<Challenge[]> {
	const response = await api.request<{ challenges: Challenge[] }>(
		`/projects/${projectId}/challenges`,
		{ method: 'GET' }
	)
	return response.challenges
}

/**
 * Get all gamification stats for user
 */
export async function getGamificationStats(): Promise<UserGamificationStats> {
	const [streak, badges, challenges] = await Promise.all([
		getStreak(),
		getBadges(),
		getChallenges('active')
	])

	// Calculate level based on total commit scans (example formula)
	const totalCommitScans = challenges.reduce((acc, c) => acc + (c.progress?.commits || 0), 0)
	const level = Math.floor(totalCommitScans / 10) + 1
	const xp = totalCommitScans * 10

	return {
		streak,
		badges,
		totalCommitScans,
		level,
		xp
	}
}

/**
 * Calculate challenge progress percentage
 */
export function calculateChallengeProgress(challenge: Challenge): number {
	if (challenge.status === 'completed') return 100
	if (challenge.status === 'failed' || challenge.status === 'expired') return 0

	const target = challenge.target
	const progress = challenge.progress || {}

	// Handle different challenge types
	switch (challenge.type) {
		case 'commit_streak':
			return Math.min((progress.streak || 0) / target.days, 1) * 100
		case 'daily_commits':
			return Math.min((progress.commits || 0) / target.commits, 1) * 100
		case 'code_lines':
			return Math.min((progress.lines || 0) / target.lines, 1) * 100
		case 'quality_score':
			return Math.min((progress.score || 0) / target.score, 1) * 100
		default:
			return 0
	}
}

/**
 * Get days remaining for a challenge
 */
export function getDaysRemaining(challenge: Challenge): number {
	const now = new Date()
	const end = new Date(challenge.endsAt)
	const diff = end.getTime() - now.getTime()
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Format challenge type to human-readable
 */
export function formatChallengeType(type: string): string {
	const types: Record<string, string> = {
		commit_streak: 'Commit Streak',
		daily_commits: 'Daily Commits',
		code_lines: 'Code Lines',
		quality_score: 'Quality Score',
		weekly_goal: 'Weekly Goal'
	}
	return types[type] || type
}

/**
 * Get emoji for challenge status
 */
export function getChallengeStatusEmoji(status: Challenge['status']): string {
	switch (status) {
		case 'active':
			return '⏳'
		case 'completed':
			return '✅'
		case 'failed':
			return '❌'
		case 'expired':
			return '⏰'
		default:
			return '❓'
	}
}

/**
 * Get color for challenge status
 */
export function getChallengeStatusColor(status: Challenge['status']): string {
	switch (status) {
		case 'active':
			return 'blue'
		case 'completed':
			return 'green'
		case 'failed':
			return 'red'
		case 'expired':
			return 'gray'
		default:
			return 'gray'
	}
}
