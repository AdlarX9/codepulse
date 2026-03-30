import { ContributorStats } from '@/handles/scan'

export type ContributorRow = ContributorStats

export type PieContributorSlice = {
	key: string
	label: string
	lines: number
	percentage: number
	color: string
}

export type ContributorsViewModel = {
	totalCommits: number
	totalLines: number
	contributors: ContributorRow[]
	mainContributor: ContributorRow | null
	pieSlices: PieContributorSlice[]
}
