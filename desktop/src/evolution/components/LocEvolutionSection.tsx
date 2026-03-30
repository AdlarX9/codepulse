import { Card } from '@/components/Card'
import { resolveLanguageColor } from '@/handles/scan'
import { useMemo } from 'react'
import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import { LocEvolutionPoint } from '../types'

export type LocScaleMode = 'snapshots' | 'time'

type LocEvolutionSectionProps = {
	points: LocEvolutionPoint[]
	languageOrder: string[]
	languageColors: Record<string, string>
	scaleMode: LocScaleMode
	onScaleModeChange: (mode: LocScaleMode) => void
}

function buildSnapshotChartData(points: LocEvolutionPoint[], languageOrder: string[]) {
	return points.map(point => {
		const row: Record<string, number | string> = {
			x: point.xSnapshot,
			date: point.date,
			totalLoc: point.totalLoc
		}
		for (const language of languageOrder) {
			row[language] = point.byLanguage[language] ?? 0
		}
		return row
	})
}

function buildTimeChartData(points: LocEvolutionPoint[], languageOrder: string[]) {
	return points.map(point => {
		const row: Record<string, number | string> = {
			x: point.xCompressedTime,
			label: point.date,
			date: point.date,
			totalLoc: point.totalLoc
		}
		for (const language of languageOrder) {
			row[language] = point.byLanguage[language] ?? 0
		}
		return row
	})
}

export function LocEvolutionSection({
	points,
	languageOrder,
	languageColors,
	scaleMode,
	onScaleModeChange
}: LocEvolutionSectionProps) {
	const languageOrderForStack = useMemo(() => [...languageOrder].reverse(), [languageOrder])
	const tooltipOrderRank = useMemo(() => {
		const rank: Record<string, number> = {}
		for (let i = 0; i < languageOrder.length; i += 1) {
			rank[languageOrder[i]] = i
		}
		return rank
	}, [languageOrder])

	const snapshotData = useMemo(
		() => buildSnapshotChartData(points, languageOrder),
		[points, languageOrder]
	)
	const timeData = useMemo(
		() => buildTimeChartData(points, languageOrder),
		[points, languageOrder]
	)

	return (
		<section className='space-y-3'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<h3 className='text-lg font-semibold text-slate-900'>Lines of Code Evolution</h3>
				<div className='inline-flex rounded-lg border border-slate-200 bg-white p-1'>
					<button
						type='button'
						onClick={() => onScaleModeChange('snapshots')}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
							scaleMode === 'snapshots'
								? 'bg-slate-900 text-white'
								: 'text-slate-600 hover:bg-slate-100'
						}`}
					>
						Snapshots
					</button>
					<button
						type='button'
						onClick={() => onScaleModeChange('time')}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
							scaleMode === 'time'
								? 'bg-slate-900 text-white'
								: 'text-slate-600 hover:bg-slate-100'
						}`}
					>
						Time (compressed)
					</button>
				</div>
			</div>

			<Card className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
				{points.length === 0 ? (
					<div className='flex h-72 items-center justify-center text-slate-500'>
						No evolution data
					</div>
				) : scaleMode === 'snapshots' ? (
					<ResponsiveContainer width='100%' height={340}>
						<AreaChart data={snapshotData}>
							<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
							<XAxis dataKey='x' tick={{ fontSize: 12 }} minTickGap={24} />
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip
								labelFormatter={(_, payload) => {
									const first = payload?.[0]?.payload as
										| Record<string, string>
										| undefined
									return first?.date ?? ''
								}}
								itemSorter={(item: any) => {
									const name = String(item?.name ?? '')
									return tooltipOrderRank[name] ?? Number.MAX_SAFE_INTEGER
								}}
							/>
							<Legend />
							{languageOrderForStack.map(language => (
								<Area
									key={language}
									type='monotone'
									dataKey={language}
									stackId='1'
									stroke={resolveLanguageColor(language, languageColors)}
									fill={resolveLanguageColor(language, languageColors)}
									fillOpacity={0.3}
								/>
							))}
						</AreaChart>
					</ResponsiveContainer>
				) : (
					<ResponsiveContainer width='100%' height={340}>
						<AreaChart data={timeData}>
							<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
							<XAxis
								type='number'
								dataKey='x'
								tick={{ fontSize: 12 }}
								tickFormatter={(value: number) => {
									const match = timeData.find(p => Number(p.x) === value)
									return String(match?.label ?? '')
								}}
							/>
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip
								labelFormatter={(_, payload) => {
									const first = payload?.[0]?.payload as
										| Record<string, string>
										| undefined
									return first?.date ?? ''
								}}
								itemSorter={(item: any) => {
									const name = String(item?.name ?? '')
									return tooltipOrderRank[name] ?? Number.MAX_SAFE_INTEGER
								}}
							/>
							<Legend />
							{languageOrderForStack.map(language => (
								<Area
									key={language}
									type='monotone'
									dataKey={language}
									stackId='1'
									stroke={resolveLanguageColor(language, languageColors)}
									fill={resolveLanguageColor(language, languageColors)}
									fillOpacity={0.3}
								/>
							))}
						</AreaChart>
					</ResponsiveContainer>
				)}
			</Card>
		</section>
	)
}
