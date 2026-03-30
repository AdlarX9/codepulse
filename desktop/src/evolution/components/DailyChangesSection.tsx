import { Card } from '@/components/Card'
import { useMemo, useState } from 'react'
import {
	Bar,
	BarChart,
	Brush,
	CartesianGrid,
	Legend,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import { DailyChangesPoint, WeeklyChangesPoint } from '../types'

type DailyChangesSectionProps = {
	dailyRows: DailyChangesPoint[]
	weeklyRows: WeeklyChangesPoint[]
}

function formatXAxisLabel(value: string): string {
	return value.slice(5)
}

type Granularity = 'weekly' | 'daily'

export function DailyChangesSection({ dailyRows, weeklyRows }: DailyChangesSectionProps) {
	const [granularity, setGranularity] = useState<Granularity>('weekly')

	const rows = useMemo(
		() => (granularity === 'weekly' ? weeklyRows : dailyRows),
		[granularity, weeklyRows, dailyRows]
	)

	const xDataKey = granularity === 'weekly' ? 'week' : 'date'
	const title =
		granularity === 'weekly' ? 'Weekly Additions / Deletions' : 'Daily Additions / Deletions'
	const emptyLabel = granularity === 'weekly' ? 'No weekly diff data' : 'No daily diff data'
	const brushThreshold = granularity === 'weekly' ? 26 : 60

	return (
		<section className='space-y-3'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
				<div className='inline-flex rounded-lg border border-slate-200 bg-white p-1'>
					<button
						type='button'
						onClick={() => setGranularity('weekly')}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
							granularity === 'weekly'
								? 'bg-slate-900 text-white'
								: 'text-slate-600 hover:bg-slate-100'
						}`}
					>
						Weekly
					</button>
					<button
						type='button'
						onClick={() => setGranularity('daily')}
						className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
							granularity === 'daily'
								? 'bg-slate-900 text-white'
								: 'text-slate-600 hover:bg-slate-100'
						}`}
					>
						Daily
					</button>
				</div>
			</div>
			<Card className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
				{rows.length === 0 ? (
					<div className='flex h-72 items-center justify-center text-slate-500'>
						{emptyLabel}
					</div>
				) : (
					<ResponsiveContainer width='100%' height={360}>
						<BarChart data={rows} margin={{ top: 12, right: 12, bottom: 12, left: 0 }}>
							<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
							<XAxis
								dataKey={xDataKey}
								tick={{ fontSize: 12 }}
								minTickGap={24}
								interval='preserveStartEnd'
								tickFormatter={formatXAxisLabel}
							/>
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip
								formatter={(value: number, name: string) => {
									if (name === 'deletionsNegative') {
										return [Math.abs(value), 'deletions']
									}
									return [value, name]
								}}
							/>
							<Legend
								formatter={value => {
									if (value === 'deletionsNegative') {
										return 'deletions'
									}
									return value
								}}
							/>
							<ReferenceLine y={0} stroke='#94a3b8' />
							<Bar dataKey='additions' fill='#10B981' radius={[4, 4, 0, 0]} />
							<Bar dataKey='deletionsNegative' fill='#EF4444' radius={[0, 0, 4, 4]} />
							{rows.length > brushThreshold ? (
								<Brush
									dataKey={xDataKey}
									height={24}
									stroke='#64748b'
									tickFormatter={formatXAxisLabel}
								/>
							) : null}
						</BarChart>
					</ResponsiveContainer>
				)}
			</Card>
		</section>
	)
}
