import { useState, useEffect } from 'react'
import { Card } from '../components/ui/Card'
import { Select, SelectOption } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { orgApi } from '../lib/api-org'
import type { Stats } from '../types/organization'
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	AreaChart,
	Area
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

interface AnalyticsPageProps {
	orgId: string
	onBack: () => void
}

interface TrendData {
	date: string
	code: number
	comments: number
	quality: number
}

interface LanguageData {
	name: string
	value: number
	files: number
}

interface QualityMetric {
	name: string
	value: number
}

interface PolicyStat {
	name: string
	value: number
	color: string
}

export default function AnalyticsPage({ orgId, onBack }: AnalyticsPageProps) {
	const [stats, setStats] = useState<Stats | null>(null)
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)
	const [timeWindow, setTimeWindow] = useState<string>('30d')

	useEffect(() => {
		loadStats()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [orgId, timeWindow])

	async function loadStats(): Promise<void> {
		try {
			setLoading(true)
			setError(null)
			const data = await orgApi.getOrgStats(orgId, timeWindow)
			setStats(data || null)
		} catch (err: unknown) {
			console.error('Failed to load stats:', err)
			setError(err instanceof Error ? err.message : 'Failed to load analytics')
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='text-gray-600'>Loading analytics...</div>
			</div>
		)
	}

	if (error || !stats) {
		return (
			<div className='flex flex-col items-center justify-center h-screen gap-4'>
				<div className='text-center'>
					<div className='text-red-600 text-lg font-semibold mb-2'>
						{error || 'No analytics data available'}
					</div>
					<p className='text-gray-600 mb-4'>
						Make sure your organization has repositories with scans.
					</p>
				</div>
				<button
					onClick={onBack}
					className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
				>
					Back to Projects
				</button>
			</div>
		)
	}

	// Safe helpers
	const safeNumber = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0)
	const safeRatioPct = (num: unknown, den: unknown): number => {
		const d = safeNumber(den)
		if (d <= 0) return 0
		return (safeNumber(num) / d) * 100
	}

	// Prepare chart data
	const trendData: TrendData[] =
		(stats.trends || []).map(t => ({
			date: t?.date ? new Date(t.date).toLocaleDateString() : '',
			code: safeNumber(t?.totals?.code),
			comments: safeNumber(t?.totals?.comment),
			quality: safeNumber((t?.metrics?.comment_ratio || 0) * 100)
		})) || []

	const languageEntries = Object.entries(stats.languages || {}) as Array<
		[string, { files: number; total: number; code: number; comment: number; blank: number }]
	>
	const languageTotalCode = Math.max(
		1,
		safeNumber(
			stats?.totals?.code ||
				languageEntries.reduce((acc, [, v]) => acc + safeNumber(v?.code), 0)
		)
	)
	const languageData: LanguageData[] = languageEntries.map(([name, data]) => ({
		name,
		value: safeNumber(data?.code),
		files: safeNumber(data?.files)
	}))

	const commentRatioPct = safeNumber((stats?.metrics?.comment_ratio || 0) * 100)
	const bloatRatioPct = safeNumber((stats?.metrics?.bloat_ratio || 0) * 100)
	const docCoveragePct = safeNumber((stats?.metrics?.doc_coverage || 0) * 100)

	// Keep numbers (not strings) for Recharts
	const qualityMetrics: QualityMetric[] = [
		{ name: 'Comment Ratio', value: Math.round(commentRatioPct * 10) / 10 },
		{ name: 'Bloat Ratio', value: Math.round(bloatRatioPct * 10) / 10 },
		{ name: 'Doc Coverage', value: Math.round(docCoveragePct * 10) / 10 }
	]

	const policyStats: PolicyStat[] = [
		{
			name: 'Passed',
			value: safeNumber(stats?.policy_evaluations?.passed) || 0,
			color: '#10B981'
		},
		{
			name: 'Failed',
			value: safeNumber(stats?.policy_evaluations?.failed) || 0,
			color: '#EF4444'
		},
		{
			name: 'Warnings',
			value: safeNumber(stats?.policy_evaluations?.warnings) || 0,
			color: '#F59E0B'
		}
	]

	const repositoriesCount = safeNumber(stats?.repository_count) || 0
	const policyScorePct = safeNumber(stats?.policy_score) || 0
	const totalCodeLines = safeNumber(stats?.totals?.code) || 0
	const growthCodePct = Math.round(safeNumber((stats?.growth?.code || 0) * 100) * 10) / 10
	const passedCount = safeNumber(stats?.policy_evaluations?.passed) || 0
	const failedCount = safeNumber(stats?.policy_evaluations?.failed) || 0

	return (
		<div className='min-h-screen bg-gray-50'>
			{/* Header */}
			<div className='bg-white border-b border-gray-200'>
				<div className='max-w-7xl mx-auto px-6 py-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<button onClick={onBack} className='text-gray-600 hover:text-gray-900'>
								<svg
									className='w-6 h-6'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M15 19l-7-7 7-7'
									/>
								</svg>
							</button>
							<div>
								<h1 className='text-2xl font-bold text-gray-900'>
									Analytics Dashboard
								</h1>
								<p className='text-sm text-gray-600'>Quality insights and trends</p>
							</div>
						</div>
						<div className='flex items-center gap-3'>
							<Select value={timeWindow} onChange={setTimeWindow}>
								<SelectOption value='7d'>Last 7 days</SelectOption>
								<SelectOption value='30d'>Last 30 days</SelectOption>
								<SelectOption value='90d'>Last 90 days</SelectOption>
								<SelectOption value='365d'>Last year</SelectOption>
							</Select>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className='max-w-7xl mx-auto px-6 py-6 space-y-6'>
				{/* KPI Cards */}
				<div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
					<Card className='p-6'>
						<div className='text-sm text-gray-600 mb-1'>Total Code Lines</div>
						<div className='text-3xl font-bold text-gray-900'>
							{totalCodeLines.toLocaleString()}
						</div>
						<div className='text-sm text-green-600 mt-2'>
							↑ {growthCodePct.toFixed(1)}% from last period
						</div>
					</Card>

					<Card className='p-6'>
						<div className='text-sm text-gray-600 mb-1'>Comment Ratio</div>
						<div className='text-3xl font-bold text-gray-900'>
							{commentRatioPct.toFixed(1)}%
						</div>
						<Badge variant={commentRatioPct >= 15 ? 'success' : 'warning'}>
							{commentRatioPct >= 15 ? 'Good' : 'Needs Improvement'}
						</Badge>
					</Card>

					<Card className='p-6'>
						<div className='text-sm text-gray-600 mb-1'>Repositories</div>
						<div className='text-3xl font-bold text-gray-900'>{repositoriesCount}</div>
						<div className='text-sm text-gray-600 mt-2'>Active repositories</div>
					</Card>

					<Card className='p-6'>
						<div className='text-sm text-gray-600 mb-1'>Policy Score</div>
						<div className='text-3xl font-bold text-gray-900'>{policyScorePct}%</div>
						<div className='text-sm text-gray-600 mt-2'>
							{passedCount} / {passedCount + failedCount} passed
						</div>
					</Card>
				</div>

				{/* Charts Row 1 */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
					{/* Code Trends */}
					<Card className='p-6'>
						<h3 className='text-lg font-semibold text-gray-900 mb-4'>Code Trends</h3>
						<ResponsiveContainer width='100%' height={300}>
							<AreaChart data={trendData}>
								<CartesianGrid strokeDasharray='3 3' />
								<XAxis dataKey='date' />
								<YAxis />
								<Tooltip />
								<Legend />
								<Area
									type='monotone'
									dataKey='code'
									stackId='1'
									stroke='#3B82F6'
									fill='#3B82F6'
									fillOpacity={0.6}
								/>
								<Area
									type='monotone'
									dataKey='comments'
									stackId='1'
									stroke='#10B981'
									fill='#10B981'
									fillOpacity={0.6}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</Card>

					{/* Language Distribution */}
					<Card className='p-6'>
						<h3 className='text-lg font-semibold text-gray-900 mb-4'>
							Language Distribution
						</h3>
						<ResponsiveContainer width='100%' height={300}>
							<PieChart>
								<Pie
									data={languageData}
									cx='50%'
									cy='50%'
									labelLine={false}
									label={({ name, value }: { name: string; value: number }) => {
										const pct = safeRatioPct(value, languageTotalCode)
										return `${name} (${pct.toFixed(1)}%)`
									}}
									outerRadius={80}
									fill='#8884d8'
									dataKey='value'
								>
									{languageData.map((_, index) => (
										<Cell
											key={`cell-${index}`}
											fill={COLORS[index % COLORS.length]}
										/>
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</Card>
				</div>

				{/* Charts Row 2 */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
					{/* Quality Metrics */}
					<Card className='p-6'>
						<h3 className='text-lg font-semibold text-gray-900 mb-4'>
							Quality Metrics
						</h3>
						<ResponsiveContainer width='100%' height={300}>
							<BarChart data={qualityMetrics}>
								<CartesianGrid strokeDasharray='3 3' />
								<XAxis dataKey='name' />
								<YAxis />
								<Tooltip />
								<Bar dataKey='value' fill='#3B82F6' />
							</BarChart>
						</ResponsiveContainer>
					</Card>

					{/* Policy Evaluations */}
					<Card className='p-6'>
						<h3 className='text-lg font-semibold text-gray-900 mb-4'>
							Policy Evaluations
						</h3>
						<ResponsiveContainer width='100%' height={300}>
							<PieChart>
								<Pie
									data={policyStats}
									cx='50%'
									cy='50%'
									labelLine={false}
									label={(entry: { name: string; value: number }) =>
										`${entry.name}: ${entry.value}`
									}
									outerRadius={80}
									fill='#8884d8'
									dataKey='value'
								>
									{policyStats.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</Card>
				</div>

				{/* Quality Timeline */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>
						Quality Score Over Time
					</h3>
					<ResponsiveContainer width='100%' height={300}>
						<LineChart data={trendData}>
							<CartesianGrid strokeDasharray='3 3' />
							<XAxis dataKey='date' />
							<YAxis />
							<Tooltip />
							<Legend />
							<Line
								type='monotone'
								dataKey='quality'
								stroke='#3B82F6'
								strokeWidth={2}
								dot={{ r: 4 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</Card>

				{/* Language Details Table */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>Language Breakdown</h3>
					<div className='overflow-x-auto'>
						<table className='min-w-full divide-y divide-gray-200'>
							<thead className='bg-gray-50'>
								<tr>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
										Language
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
										Files
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
										Code Lines
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
										Comments
									</th>
									<th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
										Comment Ratio
									</th>
								</tr>
							</thead>
							<tbody className='bg-white divide-y divide-gray-200'>
								{Object.entries(stats.languages || {}).map(([lang, data]) => {
									const files = safeNumber(data?.files)
									const code = safeNumber(data?.code)
									const comment = safeNumber(data?.comment)
									const ratio = code > 0 ? (comment / code) * 100 : 0
									return (
										<tr key={lang}>
											<td className='px-6 py-4 whitespace-nowrap font-medium text-gray-900'>
												{lang}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-gray-600'>
												{files}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-gray-600'>
												{code.toLocaleString()}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-gray-600'>
												{comment.toLocaleString()}
											</td>
											<td className='px-6 py-4 whitespace-nowrap'>
												<Badge
													variant={ratio >= 15 ? 'success' : 'warning'}
												>
													{ratio.toFixed(1)}%
												</Badge>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				</Card>
			</div>
		</div>
	)
}
