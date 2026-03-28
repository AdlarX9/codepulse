import { useMemo, useState } from 'react'
import { FileCode, FileText, Code2, MessageSquare, Layers, Search } from 'lucide-react'
import { Card } from '@/components/Card'
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Tooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis
} from 'recharts'
import { useMainContext } from '@/navigation/MainContext'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
}

export default function OverviewDashboard() {
	const [searchLang, setSearchLang] = useState<string>('')
	const [searchQuery, setSearchQuery] = useState<string>('')
	const { scanResult, projectPath } = useMainContext()

	const languageData = useMemo(() => {
		if (!scanResult) return []
		return Object.entries(scanResult.languages)
			.map(([name, stats]: [string, any]) => ({
				name,
				value: stats.code,
				files: stats.files
			}))
			.sort((a, b) => b.value - a.value)
			.slice(0, 7) // Top 7 languages
	}, [scanResult])

	const distributionData = useMemo(() => {
		if (!scanResult) return []
		return [
			{ name: 'Code', value: scanResult.total_code, color: '#3B82F6' },
			{ name: 'Comments', value: scanResult.total_comments, color: '#10B981' },
			{ name: 'Blank', value: scanResult.total_blank, color: '#9CA3AF' }
		]
	}, [scanResult])

	if (!scanResult) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<FileCode className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>No scan data available</p>
					<p className='text-sm text-gray-400 mt-2'>Scan your project to see insights</p>
				</div>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			{/* KPI Cards */}
			<div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
				<Card className='p-4 rounded-md border bg-white'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<FileCode className='h-4 w-4' />
						<span className='text-sm font-medium'>Files</span>
					</div>
					<div className='text-3xl font-bold text-gray-900'>
						{formatNumber(scanResult.total_files)}
					</div>
				</Card>

				<Card className='p-4 rounded-md border bg-white'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<FileText className='h-4 w-4' />
						<span className='text-sm font-medium'>Total Lines</span>
					</div>
					<div className='text-3xl font-bold text-gray-900'>
						{formatNumber(scanResult.total_lines)}
					</div>
				</Card>

				<Card className='p-4 rounded-md border bg-white'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Code2 className='h-4 w-4' />
						<span className='text-sm font-medium'>Code</span>
					</div>
					<div className='text-3xl font-bold text-blue-600'>
						{formatNumber(scanResult.total_code)}
					</div>
					<div className='text-xs text-gray-500 mt-1'>
						{scanResult.code_percentage.toFixed(1)}% of total
					</div>
				</Card>

				<Card className='p-4 rounded-md border bg-white'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<MessageSquare className='h-4 w-4' />
						<span className='text-sm font-medium'>Comments</span>
					</div>
					<div className='text-3xl font-bold text-green-600'>
						{formatNumber(scanResult.total_comments)}
					</div>
					<div className='text-xs text-gray-500 mt-1'>
						{scanResult.comment_percentage.toFixed(1)}% of total
					</div>
				</Card>

				<Card className='p-4 rounded-md border bg-white'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Layers className='h-4 w-4' />
						<span className='text-sm font-medium'>Languages</span>
					</div>
					<div className='text-3xl font-bold text-purple-600'>
						{Object.keys(scanResult.languages).length}
					</div>
				</Card>
			</div>

			{/* Charts Row */}
			<div className='grid md:grid-cols-2 gap-6'>
				{/* Language Distribution Pie Chart */}
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
								label={({ name, percent }) =>
									`${name} (${(percent * 100).toFixed(0)}%)`
								}
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

				{/* Code Distribution */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>Line Distribution</h3>
					<ResponsiveContainer width='100%' height={300}>
						<BarChart data={distributionData}>
							<XAxis dataKey='name' />
							<YAxis />
							<Tooltip formatter={value => formatNumber(value as number)} />
							<Bar dataKey='value'>
								{distributionData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.color} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</Card>
			</div>

			{/* Language Details Table */}
			<Card className='p-6'>
				<h3 className='text-lg font-semibold text-gray-900 mb-4'>Languages Breakdown</h3>
				<div className='overflow-x-auto'>
					<table className='w-full'>
						<thead className='border-b'>
							<tr className='text-left text-sm text-gray-600'>
								<th className='pb-3 font-medium'>Language</th>
								<th className='pb-3 font-medium text-right'>Files</th>
								<th className='pb-3 font-medium text-right'>Code</th>
								<th className='pb-3 font-medium text-right'>Comments</th>
								<th className='pb-3 font-medium text-right'>Blank</th>
								<th className='pb-3 font-medium text-right'>Total</th>
							</tr>
						</thead>
						<tbody className='divide-y'>
							{languageData.map((lang, index) => {
								const stats = scanResult.languages[lang.name]
								return (
									<tr key={lang.name} className='text-sm hover:bg-gray-50'>
										<td className='py-3 font-medium'>
											<div className='flex items-center gap-2'>
												<div
													className='w-3 h-3 rounded-full'
													style={{
														backgroundColor:
															COLORS[index % COLORS.length]
													}}
												/>
												{lang.name}
											</div>
										</td>
										<td className='py-3 text-right text-gray-600'>
											{formatNumber(stats.files)}
										</td>
										<td className='py-3 text-right text-gray-900 font-medium'>
											{formatNumber(stats.code)}
										</td>
										<td className='py-3 text-right text-gray-600'>
											{formatNumber(stats.comment)}
										</td>
										<td className='py-3 text-right text-gray-600'>
											{formatNumber(stats.blank)}
										</td>
										<td className='py-3 text-right text-gray-900 font-semibold'>
											{formatNumber(stats.total)}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</Card>

			{/* Project Info */}
			<Card className='p-6 bg-gray-50 border-2 border-dashed'>
				<div className='text-sm text-gray-600'>
					<p className='font-medium mb-2'>Project Path</p>
					<p className='font-mono text-xs text-gray-800 bg-white px-3 py-2 rounded border'>
						{projectPath}
					</p>
				</div>
			</Card>

			<Card className='p-4'>
				<div className='flex items-center gap-2 text-gray-600 mb-2'>
					<Search className='h-4 w-4' />
					<span className='text-sm font-medium'>File Search</span>
				</div>
				<div className='flex gap-2'>
					<select
						className='border rounded px-2 py-1 text-sm'
						value={searchLang}
						onChange={e => setSearchLang(e.target.value)}
					>
						<option value=''>All</option>
						{scanResult &&
							Object.keys(scanResult.languages).map(l => (
								<option key={l} value={l}>
									{l}
								</option>
							))}
					</select>
					<input
						type='text'
						className='border rounded px-2 py-1 text-sm flex-1'
						placeholder='Search path...'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
					/>
				</div>
			</Card>

			{/* File search by language */}
			{scanResult && (
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>Files Explorer</h3>
					<div className='overflow-x-auto'>
						<table className='w-full'>
							<thead className='border-b'>
								<tr className='text-left text-sm text-gray-600'>
									<th className='pb-3 font-medium'>Path</th>
									<th className='pb-3 font-medium'>Language</th>
									<th className='pb-3 font-medium text-right'>Code</th>
									<th className='pb-3 font-medium text-right'>Comments</th>
									<th className='pb-3 font-medium text-right'>Blank</th>
									<th className='pb-3 font-medium text-right'>Total</th>
								</tr>
							</thead>
							<tbody className='divide-y'>
								{(scanResult.files || [])
									.filter((f: any) => !searchLang || f.language === searchLang)
									.filter(
										(f: any) =>
											!searchQuery ||
											f.path.toLowerCase().includes(searchQuery.toLowerCase())
									)
									.sort((a: any, b: any) => b.code - a.code)
									.slice(0, 100)
									.map((f: any) => (
										<tr key={f.path} className='text-sm hover:bg-gray-50'>
											<td className='py-3 font-mono text-xs'>{f.path}</td>
											<td className='py-3'>{f.language}</td>
											<td className='py-3 text-right text-gray-900 font-medium'>
												{f.code}
											</td>
											<td className='py-3 text-right text-gray-600'>
												{f.comment}
											</td>
											<td className='py-3 text-right text-gray-600'>
												{f.blank}
											</td>
											<td className='py-3 text-right text-gray-900 font-semibold'>
												{f.total}
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				</Card>
			)}
		</div>
	)
}
