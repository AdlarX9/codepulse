import { CommitActivity, DailyChangesPoint, LocEvolutionPoint, WeeklyChangesPoint } from './types'

function toDayIndex(dateIso: string): number {
	const [y, m, d] = dateIso.split('-').map(Number)
	return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000)
}

function toMondayIso(dayIndex: number): string {
	const date = new Date(dayIndex * 86400000)
	const weekday = (date.getUTCDay() + 6) % 7
	const monday = new Date((dayIndex - weekday) * 86400000)
	return monday.toISOString().slice(0, 10)
}

function uniqueSortedDayIndices(commits: CommitActivity[]): number[] {
	const set = new Set<number>()
	for (const commit of commits) {
		set.add(toDayIndex(commit.date))
	}
	return Array.from(set).sort((a, b) => a - b)
}

export function buildLocEvolutionPoints(commits: CommitActivity[]): LocEvolutionPoint[] {
	if (commits.length === 0) {
		return []
	}

	const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp)
	const points: LocEvolutionPoint[] = []
	let compressedX = 0

	for (let i = 0; i < sorted.length; i += 1) {
		const current = sorted[i]
		if (i > 0) {
			const prev = sorted[i - 1]
			const realDeltaDays = Math.max(0, toDayIndex(current.date) - toDayIndex(prev.date))
			compressedX += Math.min(realDeltaDays, 7)
		}

		points.push({
			index: i,
			label: `#${i + 1}`,
			date: current.date,
			timestamp: current.timestamp,
			xSnapshot: `#${i + 1}`,
			xCompressedTime: compressedX,
			totalLoc: current.total_loc,
			byLanguage: current.loc_by_language
		})
	}

	return points
}

export function buildLanguageOrder(points: LocEvolutionPoint[]): string[] {
	const totalByLanguage: Record<string, number> = {}
	for (const point of points) {
		for (const [language, value] of Object.entries(point.byLanguage)) {
			totalByLanguage[language] = (totalByLanguage[language] ?? 0) + Math.max(0, value || 0)
		}
	}

	return Object.keys(totalByLanguage).sort((a, b) => {
		const diff = (totalByLanguage[b] ?? 0) - (totalByLanguage[a] ?? 0)
		if (diff !== 0) {
			return diff
		}
		return a.localeCompare(b)
	})
}

export function buildGeneralStats(commits: CommitActivity[]) {
	if (commits.length === 0) {
		return {
			snapshots: 0,
			activeWeeks: 0,
			activeDays: 0,
			ageDays: 0,
			cumulatedAdditions: 0,
			cumulatedDeletions: 0
		}
	}

	const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp)
	const dayIndices = uniqueSortedDayIndices(sorted)
	const firstDay = dayIndices[0]
	const lastDay = dayIndices[dayIndices.length - 1]

	const activeWeeks = new Set(dayIndices.map(toMondayIso)).size
	const cumulatedAdditions = sorted.reduce((acc, c) => acc + c.additions, 0)
	const cumulatedDeletions = sorted.reduce((acc, c) => acc + c.deletions, 0)

	return {
		snapshots: sorted.length,
		activeWeeks,
		activeDays: dayIndices.length,
		ageDays: Math.max(0, lastDay - firstDay),
		cumulatedAdditions,
		cumulatedDeletions
	}
}

function computeLongestStreak(dayIndices: number[]): number {
	if (dayIndices.length === 0) {
		return 0
	}
	let longest = 1
	let current = 1
	for (let i = 1; i < dayIndices.length; i += 1) {
		if (dayIndices[i] - dayIndices[i - 1] === 1) {
			current += 1
			if (current > longest) {
				longest = current
			}
		} else {
			current = 1
		}
	}
	return longest
}

function computeLongestInactivity(dayIndices: number[]): number {
	if (dayIndices.length < 2) {
		return 0
	}
	let longest = 0
	for (let i = 1; i < dayIndices.length; i += 1) {
		const gapWithoutCommits = Math.max(0, dayIndices[i] - dayIndices[i - 1] - 1)
		if (gapWithoutCommits > longest) {
			longest = gapWithoutCommits
		}
	}
	return longest
}

export function buildAllTimeStats(commits: CommitActivity[]) {
	if (commits.length === 0) {
		return {
			peakLoc: 0,
			biggestBump: 0,
			longestStreakDays: 0,
			longestInactivityDays: 0
		}
	}

	const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp)
	const dayIndices = uniqueSortedDayIndices(sorted)
	const peakLoc = sorted.reduce((max, c) => Math.max(max, c.total_loc), 0)
	const biggestBump = sorted.reduce((max, c) => Math.max(max, c.additions), 0)

	return {
		peakLoc,
		biggestBump,
		longestStreakDays: computeLongestStreak(dayIndices),
		longestInactivityDays: computeLongestInactivity(dayIndices)
	}
}

export function buildDailyChangesSeries(commits: CommitActivity[]): DailyChangesPoint[] {
	const dayMap: Record<string, { additions: number; deletions: number }> = {}
	for (const commit of commits) {
		const current = dayMap[commit.date] ?? { additions: 0, deletions: 0 }
		current.additions += commit.additions
		current.deletions += commit.deletions
		dayMap[commit.date] = current
	}

	return Object.entries(dayMap)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, values]) => ({
			date,
			additions: values.additions,
			deletions: values.deletions,
			deletionsNegative: -values.deletions
		}))
}

export function buildWeeklyChangesSeries(commits: CommitActivity[]): WeeklyChangesPoint[] {
	const weekMap: Record<string, { additions: number; deletions: number }> = {}
	for (const commit of commits) {
		const week = toMondayIso(toDayIndex(commit.date))
		const current = weekMap[week] ?? { additions: 0, deletions: 0 }
		current.additions += commit.additions
		current.deletions += commit.deletions
		weekMap[week] = current
	}

	return Object.entries(weekMap)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([week, values]) => ({
			week,
			additions: values.additions,
			deletions: values.deletions,
			deletionsNegative: -values.deletions
		}))
}
