import {
	getCommitActivity,
	getContributorsDashboardData,
	getLanguageCategories,
	ContributorStats,
	CommitActivity
} from '@/handles/scan'
import {
	buildAllTimeStats,
	buildDailyChangesSeries,
	buildGeneralStats,
	buildLocEvolutionPoints,
	buildWeeklyChangesSeries
} from '@/evolution/analytics'
import { buildContributorsViewModel } from '@/contributors/analytics'
import { ScanResult } from '@/types'
import { buildOverviewVisualData } from './overview-analytics'
import { ExportBundle } from './models'

export async function collectExportBundle(input: {
	scanResult: ScanResult
	projectName: string
	projectPath: string
	hasGit: boolean
}): Promise<ExportBundle> {
	const { scanResult, projectName, projectPath, hasGit } = input

	let commits: CommitActivity[] = []
	let contributors: ContributorStats[] = []
	if (hasGit && projectPath) {
		const [commitData, contributorData] = await Promise.all([
			getCommitActivity(projectPath).catch(() => []),
			getContributorsDashboardData(projectPath).catch(() => ({
				total_commits: 0,
				total_lines: 0,
				contributors: []
			}))
		])
		commits = commitData
		contributors = contributorData.contributors
	}

	const languageCategories = await getLanguageCategories().catch(() => ({}))
	const overview = buildOverviewVisualData(scanResult, languageCategories)

	const locPoints = buildLocEvolutionPoints(commits)
	const evolution = {
		generalStats: buildGeneralStats(commits),
		allTimeStats: buildAllTimeStats(commits),
		locPoints,
		weeklyChanges: buildWeeklyChangesSeries(commits),
		dailyChanges: buildDailyChangesSeries(commits)
	}

	const contributorsVm = buildContributorsViewModel({
		total_commits: contributors.reduce((acc, row) => acc + row.commits, 0),
		total_lines: contributors.reduce((acc, row) => acc + row.lines, 0),
		contributors
	})

	const contributorsVisual = {
		totalCommits: contributorsVm.totalCommits,
		totalLines: contributorsVm.totalLines,
		mainContributor: contributorsVm.mainContributor,
		contributors: contributorsVm.contributors,
		pieSlices: contributorsVm.pieSlices
	}

	return {
		projectName: projectName || 'Project',
		projectPath,
		generatedAtIso: new Date().toISOString(),
		scanResult,
		raw: {
			files: scanResult.files,
			commits,
			contributors
		},
		visual: {
			overview,
			evolution,
			contributors: contributorsVisual
		}
	}
}
