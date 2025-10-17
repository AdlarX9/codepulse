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

interface AnalyticsPageProps {
	orgId: string
	onBack: () => void
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AnalyticsPage({ orgId, onBack }: AnalyticsPageProps) {
	const [stats, setStats] = useState<Stats | null>(null)
	const [loading, setLoading] = useState(true)
	const [timeWindow, setTimeWindow] = useState('30d')

	useEffect(() => {
		loadStats()
	}, [orgId, timeWindow])

	async function loadStats() {
		try {
			setLoading(true)
			const data = await orgApi.getOrgStats(orgId, timeWindow)
			setStats(data)
		} catch (error) {
			console.error('Failed to load stats:', error)
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

	if (!stats) {
		return (
			<div className='flex items-center justify-center h-screen'>
				<div className='text-gray-600'>No analytics data available</div>
			</div>
		)
	}

	// Prepare chart data
	const trendData = stats.trends?.map(t => ({
		date: new Date(t.date).toLocaleDateString(),
		code: t.totals.code,
		comments: t.totals.comment,
		quality: t.metrics.comment_ratio * 100
	})) || []

	const languageData = Object.entries(stats.languages || {}).map(([name, data]) => ({
		name,
		value: data.code,
		files: data.files
	}))

	const qualityMetrics = [
		{ name: 'Comment Ratio', value: (stats.metrics.comment_ratio * 100).toFixed(1) },
		{ name: 'Bloat Ratio', value: (stats.metrics.bloat_ratio * 100).toFixed(1) },
		{ name: 'Doc Coverage', value: (stats.metrics.doc_coverage * 100).toFixed(1) }
	]

	const policyStats = [
		{ name: 'Passed', value: stats.policy_evaluations?.passed || 0, color: '#10B981' },
		{ name: 'Failed', value: stats.policy_evaluations?.failed || 0, color: '#EF4444' },
		{ name: 'Warnings', value: stats.policy_evaluations?.warnings || 0, color: '#F59E0B' }
	]

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
								<h1 className='text-2xl font-bold text-gray-900'>Analytics Dashboard</h1>
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
							{stats.totals.code.toLocaleString()}
						</div>
						<div className='text-sm text-green-600 mt-2'>
							↑ {((stats.growth?.code || 0) * 100).toFixed(1)}% from last period
						</div>
					</Card>

					<Card className='p-6'>
						<div className='text-sm text-gray-600 mb-1'>Comment Ratio</div>
						<div className='text-3xl font-bold text-gray-900'>
							{(stats.metrics.comment_ratio * 100).toFixed(1)}%
						</div>
						<Badge
							variant={
								stats.metrics.comment_ratio >= 0.15 ? 'success' : 'warning'
							}
						>
							{stats.metrics.comment_ratio >= 0.15 ? 'Good' : 'Needs Improvement'}
						</Badge>
					</Card>

					<Card className='p-6'>
						<div className='text-sm text-gray-600 mb-1'>Repositories</div>
						<div className='text-3xl font-bold text-gray-900'>
							{stats.repository_count || 0}
						</div>
						<div className='text-sm text-gray-600 mt-2'>Active repositories</div>
					</Card>

					<Card className='p-6'>
						<div className='text-sm text-gray-600 mb-1'>Policy Score</div>
						<div className='text-3xl font-bold text-gray-900'>
							{stats.policy_score || 0}%
						</div>
						<div className='text-sm text-gray-600 mt-2'>
							{stats.policy_evaluations?.passed || 0} / {(stats.policy_evaluations?.passed || 0) + (stats.policy_evaluations?.failed || 0)} passed
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
									label={(entry: any) => `${entry.name} (${((entry.value / stats.totals.code) * 100).toFixed(1)}%)`}
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
									label={entry => `${entry.name}: ${entry.value}`}
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
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>
						Language Breakdown
					</h3>
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
								{Object.entries(stats.languages || {}).map(([lang, data]) => (
									<tr key={lang}>
										<td className='px-6 py-4 whitespace-nowrap font-medium text-gray-900'>
											{lang}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-gray-600'>
											{data.files}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-gray-600'>
											{data.code.toLocaleString()}
										</td>
										<td className='px-6 py-4 whitespace-nowrap text-gray-600'>
											{data.comment.toLocaleString()}
										</td>
										<td className='px-6 py-4 whitespace-nowrap'>
											<Badge
												variant={
													data.comment / data.code >= 0.15
														? 'success'
														: 'warning'
												}
											>
												{((data.comment / data.code) * 100).toFixed(1)}%
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			</div>
		</div>
	)
}
