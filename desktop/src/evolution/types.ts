export type CommitActivity = {
	commit_oid: string
	timestamp: number
	date: string
	additions: number
	deletions: number
	total_loc: number
	loc_by_language: Record<string, number>
}

export type GeneralStats = {
	snapshots: number
	activeWeeks: number
	activeDays: number
	ageDays: number
	cumulatedAdditions: number
	cumulatedDeletions: number
}

export type AllTimeStats = {
	peakLoc: number
	biggestBump: number
	longestStreakDays: number
	longestInactivityDays: number
}

export type LocEvolutionPoint = {
	index: number
	label: string
	date: string
	timestamp: number
	xSnapshot: string
	xCompressedTime: number
	totalLoc: number
	byLanguage: Record<string, number>
}

export type DailyChangesPoint = {
	date: string
	additions: number
	deletions: number
	deletionsNegative: number
}

export type WeeklyChangesPoint = {
	week: string
	additions: number
	deletions: number
	deletionsNegative: number
}
