import { ContributorStats, CommitActivity } from '@/handles/scan'
import { FileStats, ScanResult } from '@/types'
import {
	AllTimeStats,
	DailyChangesPoint,
	GeneralStats,
	LocEvolutionPoint,
	WeeklyChangesPoint
} from '@/evolution/types'
import { PieContributorSlice } from '@/contributors/types'

export type RawExportData = {
	files: FileStats[]
	commits: CommitActivity[]
	contributors: ContributorStats[]
}

export type OverviewSummaryRow = {
	label: string
	totalFiles: number
	totalLines: number
	mean: number
	median: number
	stdDeviation: number
}

export type OverviewVisualData = {
	topMetrics: {
		totalFiles: number
		totalLines: number
		totalCode: number
		mainLanguage: string
	}
	summaryRows: OverviewSummaryRow[]
	codeLanguageData: Array<{ name: string; value: number; files: number }>
	codeDistributionData: Array<{ name: string; value: number; percentage: number; color: string }>
	languageBreakdownData: Array<{
		name: string
		stats: {
			files: number
			total: number
			code: number
			comment: number
			blank: number
		}
	}>
	filesExplorerRows: Array<{
		path: string
		language: string
		total: number
		code: number
		comment: number
		blank: number
		alert: { level: 'high' | 'low'; label: string } | null
	}>
}

export type EvolutionVisualData = {
	generalStats: GeneralStats
	allTimeStats: AllTimeStats
	locPoints: LocEvolutionPoint[]
	weeklyChanges: WeeklyChangesPoint[]
	dailyChanges: DailyChangesPoint[]
}

export type ContributorsVisualData = {
	totalCommits: number
	totalLines: number
	mainContributor: ContributorStats | null
	contributors: ContributorStats[]
	pieSlices: PieContributorSlice[]
}

export type VisualExportData = {
	overview: OverviewVisualData
	evolution: EvolutionVisualData
	contributors: ContributorsVisualData
}

export type ExportBundle = {
	projectName: string
	projectPath: string
	generatedAtIso: string
	scanResult: ScanResult
	raw: RawExportData
	visual: VisualExportData
}
