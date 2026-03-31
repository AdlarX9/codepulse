import { CommitActivity } from '@/handles/scan'
import { LocalProject, ScanResult } from '@/types'

export interface HomeProjectDataset {
	project: LocalProject
	scanResult: ScanResult
	commits: CommitActivity[]
}

export interface HomeLanguageBreakdownRow {
	name: string
	files: number
	total: number
	code: number
	comment: number
	blank: number
	color: string
}

export interface HomeProjectBarRow {
	name: string
	shortName: string
	totalLines: number
}

export interface HomePieRow {
	name: string
	value: number
	color: string
}

export interface HomeHeadquartersData {
	consideredProjects: LocalProject[]
	ignoredNestedProjects: LocalProject[]
	totalFiles: number
	totalLines: number
	totalLinesOfCode: number
	totalTrueCode: number
	averageCommentPercentage: number
	averageBlankPercentage: number
	mainLanguage: string
	currentStreakDays: number
	longestStreakDays: number
	languagePieRows: HomePieRow[]
	projectBarRows: HomeProjectBarRow[]
	languageBreakdownRows: HomeLanguageBreakdownRow[]
}
