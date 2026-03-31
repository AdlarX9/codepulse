import { LocalProject } from '@/types'
import {
	HomeHeadquartersData,
	HomeLanguageBreakdownRow,
	HomeProjectDataset,
	HomeProjectBarRow
} from './types'

const FALLBACK_COLORS = [
	'#2563EB',
	'#0EA5E9',
	'#14B8A6',
	'#22C55E',
	'#EAB308',
	'#F97316',
	'#EF4444',
	'#A855F7',
	'#EC4899',
	'#64748B'
]

function normalizeProjectPath(path: string): string {
	const withSlashes = path.trim().replace(/\\/g, '/')
	const squashed = withSlashes.replace(/\/+/g, '/')
	const withoutTrailing = squashed.length > 1 ? squashed.replace(/\/+$/, '') : squashed

	if (/^[a-zA-Z]:\//.test(withoutTrailing)) {
		return withoutTrailing.toLowerCase()
	}

	return withoutTrailing
}

function isNestedPath(parent: string, child: string): boolean {
	if (!parent || !child || parent === child) {
		return false
	}

	return child.startsWith(`${parent}/`)
}

export function splitTopLevelProjects(projects: LocalProject[]): {
	consideredProjects: LocalProject[]
	ignoredNestedProjects: LocalProject[]
} {
	const uniqueEntries: Array<{ project: LocalProject; normalizedPath: string }> = []
	const seenPaths = new Set<string>()

	for (const project of projects) {
		const normalizedPath = normalizeProjectPath(project.path)
		if (!normalizedPath || seenPaths.has(normalizedPath)) {
			continue
		}

		seenPaths.add(normalizedPath)
		uniqueEntries.push({ project, normalizedPath })
	}

	const sortedByDepth = [...uniqueEntries].sort(
		(left, right) => left.normalizedPath.length - right.normalizedPath.length
	)

	const topLevelPaths: string[] = []
	const ignoredPathSet = new Set<string>()
	for (const entry of sortedByDepth) {
		const hasParentInSelection = topLevelPaths.some(parentPath =>
			isNestedPath(parentPath, entry.normalizedPath)
		)
		if (hasParentInSelection) {
			ignoredPathSet.add(entry.normalizedPath)
			continue
		}

		topLevelPaths.push(entry.normalizedPath)
	}

	const topLevelSet = new Set(topLevelPaths)
	const consideredProjects = uniqueEntries
		.filter(entry => topLevelSet.has(entry.normalizedPath))
		.map(entry => entry.project)
	const ignoredNestedProjects = uniqueEntries
		.filter(entry => ignoredPathSet.has(entry.normalizedPath))
		.map(entry => entry.project)

	return { consideredProjects, ignoredNestedProjects }
}

function toDayIndex(dateIso: string): number | null {
	const [yearRaw, monthRaw, dayRaw] = dateIso.split('-')
	const year = Number(yearRaw)
	const month = Number(monthRaw)
	const day = Number(dayRaw)

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return null
	}

	return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function computeStreaks(commitDates: string[]): {
	currentStreakDays: number
	longestStreakDays: number
} {
	const uniqueDays = Array.from(
		new Set(commitDates.map(toDayIndex).filter((value): value is number => value !== null))
	).sort((left, right) => left - right)

	if (uniqueDays.length === 0) {
		return { currentStreakDays: 0, longestStreakDays: 0 }
	}

	let longest = 1
	let currentRun = 1
	for (let i = 1; i < uniqueDays.length; i += 1) {
		if (uniqueDays[i] - uniqueDays[i - 1] === 1) {
			currentRun += 1
			if (currentRun > longest) {
				longest = currentRun
			}
		} else {
			currentRun = 1
		}
	}

	let tailRun = 1
	for (let i = uniqueDays.length - 1; i > 0; i -= 1) {
		if (uniqueDays[i] - uniqueDays[i - 1] === 1) {
			tailRun += 1
		} else {
			break
		}
	}

	return {
		currentStreakDays: tailRun,
		longestStreakDays: longest
	}
}

function fallbackLanguageColor(language: string): string {
	let hash = 0
	for (let i = 0; i < language.length; i += 1) {
		hash = (hash * 31 + language.charCodeAt(i)) >>> 0
	}
	return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

function shortenProjectName(name: string): string {
	if (name.length <= 22) {
		return name
	}
	return `${name.slice(0, 19)}...`
}

export function buildHomeHeadquartersData(
	datasets: HomeProjectDataset[],
	ignoredNestedProjects: LocalProject[],
	languageColors: Record<string, string>,
	languageCategories: Record<string, string>
): HomeHeadquartersData {
	const languageMap: Record<
		string,
		{ files: number; total: number; code: number; comment: number; blank: number }
	> = {}

	let totalFiles = 0
	let totalLines = 0
	let totalComments = 0
	let totalBlank = 0
	let totalLinesOfCode = 0
	let totalTrueCode = 0

	const commitDates: string[] = []
	const projectBarRows: HomeProjectBarRow[] = []

	for (const dataset of datasets) {
		const { project, scanResult, commits } = dataset
		totalFiles += scanResult.total_files
		totalLines += scanResult.total_lines
		totalComments += scanResult.total_comments
		totalBlank += scanResult.total_blank

		for (const file of scanResult.files) {
			if (languageCategories[file.language] === 'code') {
				totalLinesOfCode += file.total
				totalTrueCode += file.code
			}
		}

		for (const [language, stats] of Object.entries(scanResult.languages)) {
			const current =
				languageMap[language] ??
				({ files: 0, total: 0, code: 0, comment: 0, blank: 0 } as const)

			languageMap[language] = {
				files: current.files + stats.files,
				total: current.total + stats.total,
				code: current.code + stats.code,
				comment: current.comment + stats.comment,
				blank: current.blank + stats.blank
			}
		}

		commitDates.push(...commits.map(commit => commit.date))
		projectBarRows.push({
			name: project.name,
			shortName: shortenProjectName(project.name),
			totalLines: scanResult.total_lines
		})
	}

	projectBarRows.sort((left, right) => right.totalLines - left.totalLines)

	const languageBreakdownRows: HomeLanguageBreakdownRow[] = Object.entries(languageMap)
		.map(([name, stats]) => ({
			name,
			files: stats.files,
			total: stats.total,
			code: stats.code,
			comment: stats.comment,
			blank: stats.blank,
			color: languageColors[name] || fallbackLanguageColor(name)
		}))
		.sort((left, right) => right.total - left.total)

	const mainLanguage = languageBreakdownRows[0]?.name ?? 'N/A'
	const streaks = computeStreaks(commitDates)

	return {
		consideredProjects: datasets.map(dataset => dataset.project),
		ignoredNestedProjects,
		totalFiles,
		totalLines,
		totalLinesOfCode,
		totalTrueCode,
		averageCommentPercentage: totalLines > 0 ? (totalComments / totalLines) * 100 : 0,
		averageBlankPercentage: totalLines > 0 ? (totalBlank / totalLines) * 100 : 0,
		mainLanguage,
		currentStreakDays: streaks.currentStreakDays,
		longestStreakDays: streaks.longestStreakDays,
		languagePieRows: languageBreakdownRows.slice(0, 10).map(row => ({
			name: row.name,
			value: row.total,
			color: row.color
		})),
		projectBarRows,
		languageBreakdownRows
	}
}
