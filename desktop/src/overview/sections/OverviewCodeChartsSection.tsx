import { useMemo } from 'react'
import { Card } from '@/components/Card'
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip as RechartsTooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid
} from 'recharts'
import { resolveLanguageColor } from '@/handles/scan'

type CodeLanguageDatum = {
	name: string
	value: number
	files: number
}

type CodeDistributionDatum = {
	name: string
	value: number
	percentage: number
	color: string
}

type OverviewCodeChartsSectionProps = {
	codeLanguageData: CodeLanguageDatum[]
	codeDistributionData: CodeDistributionDatum[]
	languageColors: Record<string, string>
}

function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
}

function formatDecimal(num: number): string {
	return new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 1,
		minimumFractionDigits: 1
	}).format(num)
}

export function OverviewCodeChartsSection({
	codeLanguageData,
	codeDistributionData,
	languageColors
}: OverviewCodeChartsSectionProps) {
	const codeDistributionByName = useMemo(() => {
		const map: Record<string, CodeDistributionDatum> = {}
		for (const item of codeDistributionData) {
			map[item.name] = item
		}
		return map
	}, [codeDistributionData])

	const renderDistributionTick = (props: any) => {
		const { x, y, payload } = props
		const item = codeDistributionByName[String(payload?.value)]
		if (!item) {
			return <g />
		}

		return (
			<g transform={`translate(${x},${y})`}>
				<text x={0} y={10} textAnchor='middle' fill='#334155' fontSize={12}>
					<tspan x={0} dy={0} fontWeight={600}>
						{item.name}
					</tspan>
					<tspan x={0} dy={16} fill='#0F172A'>
						{formatNumber(item.value)}
					</tspan>
					<tspan x={0} dy={14} fill='#475569'>
						{formatDecimal(item.percentage)}%
					</tspan>
				</text>
			</g>
		)
	}

	return (
		<div className='grid md:grid-cols-2 gap-6'>
			<Card className='p-6 border bg-white shadow-sm'>
				<h3 className='text-lg font-semibold text-slate-900 mb-1'>
					Code Languages Distribution
				</h3>
				<p className='text-xs text-slate-500 mb-4'>Top 7 langages code par volume</p>
				{codeLanguageData.length > 0 ? (
					<ResponsiveContainer width='100%' height={320}>
						<PieChart>
							<Pie
								data={codeLanguageData}
								cx='50%'
								cy='50%'
								labelLine={false}
								label={({ name, percent }) =>
									`${name} (${(percent * 100).toFixed(0)}%)`
								}
								outerRadius={95}
								dataKey='value'
							>
								{codeLanguageData.map(lang => (
									<Cell
										key={lang.name}
										fill={resolveLanguageColor(lang.name, languageColors)}
									/>
								))}
							</Pie>
							<RechartsTooltip formatter={value => formatNumber(value as number)} />
						</PieChart>
					</ResponsiveContainer>
				) : (
					<div className='h-[320px] flex items-center justify-center text-sm text-slate-500'>
						No code languages detected
					</div>
				)}
			</Card>

			<Card className='p-6 border bg-white shadow-sm'>
				<h3 className='text-lg font-semibold text-slate-900 mb-1'>
					Code Line Distribution
				</h3>
				<p className='text-xs text-slate-500 mb-4'>
					Valeurs et pourcentages affiches sous chaque barre
				</p>
				<ResponsiveContainer width='100%' height={320}>
					<BarChart
						data={codeDistributionData}
						margin={{ top: 8, right: 8, left: 4, bottom: 70 }}
					>
						<CartesianGrid strokeDasharray='3 3' vertical={false} />
						<XAxis
							dataKey='name'
							tick={renderDistributionTick}
							interval={0}
							tickLine={false}
							axisLine={false}
							height={70}
						/>
						<YAxis tickFormatter={value => formatNumber(Number(value))} width={64} />
						<Bar dataKey='value' radius={[8, 8, 0, 0]}>
							{codeDistributionData.map((entry, index) => (
								<Cell key={`line-distribution-${index}`} fill={entry.color} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</Card>
		</div>
	)
}
