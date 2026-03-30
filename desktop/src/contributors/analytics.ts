import { ContributorsDashboardData } from '@/handles/scan'
import { ContributorsViewModel, PieContributorSlice } from './types'

const PIE_COLORS = [
	'#2563EB',
	'#10B981',
	'#F59E0B',
	'#EF4444',
	'#8B5CF6',
	'#06B6D4',
	'#EC4899',
	'#84CC16',
	'#F97316',
	'#14B8A6'
]

export function formatInt(value: number): string {
	return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(value)))
}

export function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`
}

export function formatDecimal(value: number): string {
	return value.toFixed(1)
}

function buildPieSlices(data: ContributorsDashboardData): PieContributorSlice[] {
	return data.contributors.map((contributor, index) => ({
		key: contributor.key,
		label: contributor.pseudo,
		lines: contributor.lines,
		percentage: contributor.line_percentage,
		color: PIE_COLORS[index % PIE_COLORS.length]
	}))
}

export function buildContributorsViewModel(
	data: ContributorsDashboardData | null
): ContributorsViewModel {
	if (!data) {
		return {
			totalCommits: 0,
			totalLines: 0,
			contributors: [],
			mainContributor: null,
			pieSlices: []
		}
	}

	const contributors = [...data.contributors].sort((a, b) => {
		return b.lines - a.lines || b.commits - a.commits || a.pseudo.localeCompare(b.pseudo)
	})

	return {
		totalCommits: data.total_commits,
		totalLines: data.total_lines,
		contributors,
		mainContributor: contributors[0] ?? null,
		pieSlices: buildPieSlices({ ...data, contributors })
	}
}
