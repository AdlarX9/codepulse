import { HomeHeadquartersData } from '@/home/types'
import { Activity, GitBranch, Layers3, PieChart as PieChartIcon } from 'lucide-react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

interface HeadquartersHomeProps {
	data: HomeHeadquartersData
	onAutoScan: () => void
	isAutoScanning: boolean
}

function formatNumber(value: number): string {
	return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`
}

export default function HeadquartersHome({
	data,
	onAutoScan,
	isAutoScanning
}: HeadquartersHomeProps) {
	const totalLanguages = data.languageBreakdownRows.length

	const keyFigures = [
		{ label: 'Total Files', value: formatNumber(data.totalFiles) },
		{ label: 'Total Lines', value: formatNumber(data.totalLines) },
		{ label: 'Total Lines of Code', value: formatNumber(data.totalLinesOfCode) },
		{ label: 'Total True Code', value: formatNumber(data.totalTrueCode) },
		{ label: 'Average Comment %', value: formatPercent(data.averageCommentPercentage) },
		{ label: 'Average Blank %', value: formatPercent(data.averageBlankPercentage) }
	]

	return (
		<div className='mx-auto max-w-7xl space-y-8'>
			<section className='rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-100 via-indigo-50 to-violet-100 p-6 text-slate-900 shadow-[0_24px_52px_-40px_rgba(59,130,246,0.45)] sm:p-8'>
				<div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.18em] text-blue-700'>
							CodePulse HQ
						</p>
						<h1 className='mt-2 text-3xl font-bold tracking-tight sm:text-4xl'>
							Your Global Project Command Center
						</h1>
						<p className='mt-3 max-w-2xl text-sm text-slate-600'>
							A unified view of your saved repositories. Nested projects are folded
							into their parent to keep this overview clean and meaningful.
						</p>
						<p className='mt-2 text-xs text-blue-700'>
							Projects counted: {data.consideredProjects.length}
							{data.ignoredNestedProjects.length > 0
								? ` • Nested ignored: ${data.ignoredNestedProjects.length}`
								: ''}
						</p>
					</div>
					<button
						onClick={onAutoScan}
						disabled={isAutoScanning}
						className='inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-gradient-to-b from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(37,99,235,0.95)] transition-colors hover:from-blue-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60'
					>
						<GitBranch className='h-4 w-4' />
						{isAutoScanning ? 'Auto Scan in progress...' : 'Auto Scan'}
					</button>
				</div>
			</section>

			<section className='grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.3fr]'>
				<div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
					<p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
						Main Language
					</p>
					<div className='mt-3 text-3xl font-bold text-slate-900'>
						{data.mainLanguage}
					</div>
					<p className='mt-3 text-sm text-slate-600'>
						Languages used across all projects:{' '}
						<span className='font-semibold text-violet-700'>
							{formatNumber(totalLanguages)}
						</span>
					</p>
					<div className='mt-6 grid grid-cols-1 gap-3'>
						<div className='rounded-2xl border border-blue-100 bg-blue-50/60 p-4'>
							<p className='text-xs font-semibold uppercase tracking-wide text-blue-700'>
								Current Streak
							</p>
							<p className='mt-2 text-2xl font-bold text-blue-700'>
								{formatNumber(data.currentStreakDays)} days
							</p>
						</div>
						<div className='rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4'>
							<p className='text-xs font-semibold uppercase tracking-wide text-emerald-700'>
								Longest Streak
							</p>
							<p className='mt-2 text-2xl font-bold text-emerald-700'>
								{formatNumber(data.longestStreakDays)} days
							</p>
						</div>
					</div>
				</div>

				<div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
					<p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
						Key Figures
					</p>
					<div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
						{keyFigures.map(figure => (
							<div
								key={figure.label}
								className='rounded-2xl border border-slate-100 bg-slate-50/80 p-4'
							>
								<p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
									{figure.label}
								</p>
								<p className='mt-2 text-2xl font-bold text-slate-900'>
									{figure.value}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
				<div className='mb-4 flex items-center gap-2'>
					<PieChartIcon className='h-5 w-5 text-blue-600' />
					<h2 className='text-lg font-semibold text-slate-900'>
						Top 10 Languages by Total Lines
					</h2>
				</div>
				<div className='h-[360px]'>
					{data.languagePieRows.length > 0 ? (
						<ResponsiveContainer width='100%' height='100%'>
							<PieChart>
								<Pie
									data={data.languagePieRows}
									dataKey='value'
									nameKey='name'
									cx='45%'
									cy='50%'
									innerRadius={72}
									outerRadius={128}
									paddingAngle={2}
								>
									{data.languagePieRows.map(row => (
										<Cell key={row.name} fill={row.color} />
									))}
								</Pie>
								<Tooltip formatter={value => formatNumber(Number(value))} />
								<Legend layout='vertical' align='right' verticalAlign='middle' />
							</PieChart>
						</ResponsiveContainer>
					) : (
						<div className='flex h-full items-center justify-center text-sm text-slate-500'>
							No language data available.
						</div>
					)}
				</div>
			</section>

			<section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
				<div className='mb-4 flex items-center gap-2'>
					<Layers3 className='h-5 w-5 text-blue-600' />
					<h2 className='text-lg font-semibold text-slate-900'>
						Projects by Total Lines
					</h2>
				</div>
				<div className='h-[340px]'>
					{data.projectBarRows.length > 0 ? (
						<ResponsiveContainer width='100%' height='100%'>
							<BarChart
								data={data.projectBarRows}
								margin={{ top: 12, right: 18, left: 4, bottom: 62 }}
							>
								<CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
								<XAxis
									dataKey='shortName'
									angle={-20}
									textAnchor='end'
									interval={0}
									height={72}
									stroke='#64748b'
								/>
								<YAxis
									stroke='#64748b'
									tickFormatter={value => formatNumber(Number(value))}
								/>
								<Tooltip
									formatter={value => formatNumber(Number(value))}
									labelFormatter={(label, payload) => {
										const row = payload?.[0]?.payload as
											| { name?: string }
											| undefined
										return row?.name || String(label)
									}}
								/>
								<Bar dataKey='totalLines' fill='#2563eb' radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<div className='flex h-full items-center justify-center text-sm text-slate-500'>
							No project data available.
						</div>
					)}
				</div>
			</section>

			<section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
				<div className='mb-4 flex items-center gap-2'>
					<Activity className='h-5 w-5 text-blue-600' />
					<h2 className='text-lg font-semibold text-slate-900'>Languages Breakdown</h2>
				</div>
				<div className='overflow-x-auto'>
					<table className='min-w-full border-separate border-spacing-0 text-sm'>
						<thead>
							<tr>
								<th className='sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-600'>
									Language
								</th>
								<th className='border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-600'>
									Files
								</th>
								<th className='border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-600'>
									Total
								</th>
								<th className='border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-600'>
									Code
								</th>
								<th className='border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-600'>
									Comments
								</th>
								<th className='border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-600'>
									Blank
								</th>
							</tr>
						</thead>
						<tbody>
							{data.languageBreakdownRows.map(row => (
								<tr key={row.name} className='odd:bg-white even:bg-slate-50/70'>
									<td className='sticky left-0 z-10 border-b border-slate-100 bg-inherit px-4 py-3'>
										<div className='flex items-center gap-2 font-medium text-slate-800'>
											<span
												className='inline-block h-2.5 w-2.5 rounded-full'
												style={{ backgroundColor: row.color }}
											/>
											{row.name}
										</div>
									</td>
									<td className='border-b border-slate-100 px-4 py-3 text-right text-slate-700'>
										{formatNumber(row.files)}
									</td>
									<td className='border-b border-slate-100 px-4 py-3 text-right font-semibold text-slate-900'>
										{formatNumber(row.total)}
									</td>
									<td className='border-b border-slate-100 px-4 py-3 text-right text-slate-700'>
										{formatNumber(row.code)}
									</td>
									<td className='border-b border-slate-100 px-4 py-3 text-right text-slate-700'>
										{formatNumber(row.comment)}
									</td>
									<td className='border-b border-slate-100 px-4 py-3 text-right text-slate-700'>
										{formatNumber(row.blank)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}
