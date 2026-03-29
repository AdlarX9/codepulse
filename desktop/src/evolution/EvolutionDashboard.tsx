import { useEffect, useMemo, useState } from 'react'
import { Activity, GitCommit, TrendingUp } from 'lucide-react'
import { Card } from '@/components/Card'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import {
	getLanguageColors,
	getLocDiff,
	getLocEvolution,
	resolveLanguageColor
} from '@/handles/scan'
import { useMainContext } from '@/navigation/MainContext'

type LocPoint = Record<string, number | string>
type WeeklyPoint = { week: string; additions: number; deletions: number }

function toEvolutionSeries(evolution: Array<Record<string, number>>): LocPoint[] {
	return evolution.map((snapshot, index) => ({
		commit: `#${index + 1}`,
		...snapshot
	}))
}

function toWeeklySeries(diff: Record<string, [number, number]>): WeeklyPoint[] {
	return Object.entries(diff)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([week, [additions, deletions]]) => ({
			week,
			additions,
			deletions
		}))
}

export default function EvolutionDashboard() {
	const { projectPath, hasGit } = useMainContext()
	const [locSeries, setLocSeries] = useState<LocPoint[]>([])
	const [weeklySeries, setWeeklySeries] = useState<WeeklyPoint[]>([])
	const [languageColors, setLanguageColors] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		void getLanguageColors().then(setLanguageColors)
	}, [])

	useEffect(() => {
		if (!projectPath || !hasGit) {
			setLocSeries([])
			setWeeklySeries([])
			return
		}

		void (async () => {
			setLoading(true)
			setError(null)
			try {
				const [evolution, diff] = await Promise.all([
					getLocEvolution(projectPath),
					getLocDiff(projectPath)
				])
				setLocSeries(toEvolutionSeries(evolution))
				setWeeklySeries(toWeeklySeries(diff))
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Failed to load evolution data')
			} finally {
				setLoading(false)
			}
		})()
	}, [projectPath, hasGit])

	const languageKeysByAreaDesc = useMemo(() => {
		const set = new Set<string>()
		const areaByLanguage: Record<string, number> = {}

		for (const point of locSeries) {
			for (const [key, value] of Object.entries(point)) {
				if (key !== 'commit') {
					set.add(key)
					if (typeof value === 'number') {
						areaByLanguage[key] = (areaByLanguage[key] ?? 0) + Math.max(0, value)
					}
				}
			}
		}

		return Array.from(set).sort((a, b) => {
			const areaDiff = (areaByLanguage[b] ?? 0) - (areaByLanguage[a] ?? 0)
			if (areaDiff !== 0) {
				return areaDiff
			}
			return a.localeCompare(b)
		})
	}, [locSeries])

	const languageKeysForStack = useMemo(
		() => [...languageKeysByAreaDesc].reverse(),
		[languageKeysByAreaDesc]
	)

	const tooltipOrderRank = useMemo(() => {
		const rank: Record<string, number> = {}
		for (let i = 0; i < languageKeysByAreaDesc.length; i += 1) {
			rank[languageKeysByAreaDesc[i]] = i
		}
		return rank
	}, [languageKeysByAreaDesc])

	if (!hasGit) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<GitCommit className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>Git repository not detected</p>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<Activity className='h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse' />
					<p className='text-gray-500'>Loading evolution data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className='flex items-center justify-center h-64'>
				<p className='text-red-500'>Error: {error}</p>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<GitCommit className='h-4 w-4' />
						<span className='text-sm font-medium'>Snapshots</span>
					</div>
					<div className='text-3xl font-bold text-gray-900'>{locSeries.length}</div>
				</Card>
				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<TrendingUp className='h-4 w-4' />
						<span className='text-sm font-medium'>Tracked Languages</span>
					</div>
					<div className='text-3xl font-bold text-blue-600'>
						{languageKeysByAreaDesc.length}
					</div>
				</Card>
				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Activity className='h-4 w-4' />
						<span className='text-sm font-medium'>Active Weeks</span>
					</div>
					<div className='text-3xl font-bold text-green-600'>{weeklySeries.length}</div>
				</Card>
				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Activity className='h-4 w-4' />
						<span className='text-sm font-medium'>Net Changes</span>
					</div>
					<div className='text-3xl font-bold text-purple-600'>
						{weeklySeries.reduce((acc, w) => acc + w.additions - w.deletions, 0)}
					</div>
				</Card>
			</div>

			<Card className='p-6'>
				<h3 className='text-lg font-semibold text-gray-900 mb-4'>
					Lines of Code by Snapshot
				</h3>
				{locSeries.length === 0 ? (
					<div className='h-64 flex items-center justify-center text-gray-500'>
						No evolution data
					</div>
				) : (
					<ResponsiveContainer width='100%' height={320}>
						<AreaChart data={locSeries}>
							<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
							<XAxis dataKey='commit' tick={{ fontSize: 12 }} />
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip
								itemSorter={(item: any) => {
									const name = String(item?.name ?? '')
									return tooltipOrderRank[name] ?? Number.MAX_SAFE_INTEGER
								}}
							/>
							<Legend />
							{languageKeysForStack.map(lang => (
								<Area
									key={lang}
									type='monotone'
									dataKey={lang}
									stackId='1'
									stroke={resolveLanguageColor(lang, languageColors)}
									fill={resolveLanguageColor(lang, languageColors)}
									fillOpacity={0.3}
								/>
							))}
						</AreaChart>
					</ResponsiveContainer>
				)}
			</Card>

			<Card className='p-6'>
				<h3 className='text-lg font-semibold text-gray-900 mb-4'>
					Weekly Additions / Deletions
				</h3>
				{weeklySeries.length === 0 ? (
					<div className='h-64 flex items-center justify-center text-gray-500'>
						No weekly diff data
					</div>
				) : (
					<ResponsiveContainer width='100%' height={320}>
						<BarChart data={weeklySeries}>
							<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
							<XAxis dataKey='week' tick={{ fontSize: 12 }} />
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip />
							<Legend />
							<Bar dataKey='additions' fill='#10B981' />
							<Bar dataKey='deletions' fill='#EF4444' />
						</BarChart>
					</ResponsiveContainer>
				)}
			</Card>
		</div>
	)
}
