import { useState, useMemo } from 'react'
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer
} from 'recharts'
import {
	ArrowLeft,
	Clock,
	FileCode,
	Code2,
	MessageSquare,
	FileText,
	ChevronDown,
	ChevronRight,
	RefreshCw,
	FolderOpen
} from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { formatNumber, formatDuration } from '@/lib/utils'
import type { ScanResult } from '@/types'

interface DashboardProps {
	result: ScanResult
	onReset: () => void
	onRescan?: () => void
	onChooseFolder?: () => void
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

export default function Dashboard({ result, onReset, onRescan, onChooseFolder }: DashboardProps) {
	const [searchTerm, setSearchTerm] = useState('')
	const [languageFilter, setLanguageFilter] = useState<string | null>(null)
	const [showFileDetails, setShowFileDetails] = useState(false) // Collapsed by default

	const languageData = useMemo(() => {
		return Object.entries(result.languages)
			.map(([name, stats]) => ({
				name,
				value: stats.code,
				files: stats.files
			}))
			.sort((a, b) => b.value - a.value)
	}, [result])

	const filteredFiles = useMemo(() => {
		return result.files.filter(file => {
			const matchesSearch = file.path.toLowerCase().includes(searchTerm.toLowerCase())
			const matchesLanguage = !languageFilter || file.language === languageFilter
			return matchesSearch && matchesLanguage
		})
	}, [result.files, searchTerm, languageFilter])

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<Button variant='ghost' size='sm' onClick={onReset}>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Back
					</Button>
					<div>
						<h2 className='text-2xl font-bold'>Analysis Complete</h2>
						<p className='text-muted-foreground text-sm'>
							<Clock className='inline h-3 w-3 mr-1' />
							{formatDuration(result.duration_ms)}
						</p>
					</div>
				</div>
				{(onChooseFolder || onRescan) && (
					<div className='flex gap-2'>
						{onChooseFolder && (
							<Button variant='outline' size='sm' onClick={onChooseFolder}>
								<FolderOpen className='h-4 w-4 mr-2' />
								Choose Folder
							</Button>
						)}
						{onRescan && (
							<Button variant='outline' size='sm' onClick={onRescan}>
								<RefreshCw className='h-4 w-4 mr-2' />
								Rescan
							</Button>
						)}
					</div>
				)}
			</div>

			{/* KPI Cards */}
			<div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
				<Card className='rounded-md border bg-gray-50 p-4'>
					<div className='flex items-center gap-2 text-muted-foreground mb-1'>
						<FileCode className='h-4 w-4' />
						<span className='text-sm'>Files</span>
					</div>
					<div className='text-2xl font-bold'>{formatNumber(result.total_files)}</div>
				</Card>

				<Card className='rounded-md border bg-gray-50 p-4'>
					<div className='flex items-center gap-2 text-muted-foreground mb-1'>
						<FileText className='h-4 w-4' />
						<span className='text-sm'>Total Lines</span>
					</div>
					<div className='text-2xl font-bold'>{formatNumber(result.total_lines)}</div>
				</Card>

				<Card className='rounded-md border bg-gray-50 p-4'>
					<div className='flex items-center gap-2 text-muted-foreground mb-1'>
						<Code2 className='h-4 w-4' />
						<span className='text-sm'>Code</span>
					</div>
					<div className='text-2xl font-bold'>{formatNumber(result.total_code)}</div>
					<div className='text-xs text-muted-foreground'>
						{result.code_percentage.toFixed(1)}%
					</div>
				</Card>

				<Card className='rounded-md border bg-gray-50 p-4'>
					<div className='flex items-center gap-2 text-muted-foreground mb-1'>
						<MessageSquare className='h-4 w-4' />
						<span className='text-sm'>Comments</span>
					</div>
					<div className='text-2xl font-bold'>{formatNumber(result.total_comments)}</div>
					<div className='text-xs text-muted-foreground'>
						{result.comment_percentage.toFixed(1)}%
					</div>
				</Card>

				<Card className='rounded-md border bg-gray-50 p-4'>
					<div className='text-muted-foreground mb-1 text-sm'>Blank</div>
					<div className='text-2xl font-bold'>{formatNumber(result.total_blank)}</div>
				</Card>
			</div>

			{/* Charts */}
			<div className='grid lg:grid-cols-2 gap-6'>
				{/* Pie Chart */}
				<Card className='rounded-md border bg-gray-50 p-6'>
					<h3 className='text-lg font-semibold mb-4'>Languages Distribution</h3>
					<ResponsiveContainer width='100%' height={300}>
						<PieChart>
							<Pie
								data={languageData.slice(0, 7)}
								cx='50%'
								cy='50%'
								labelLine={false}
								label={({ name, percent }) =>
									`${name} ${(percent * 100).toFixed(0)}%`
								}
								outerRadius={100}
								fill='#8884d8'
								dataKey='value'
							>
								{languageData.slice(0, 7).map((_, index) => (
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

				{/* Bar Chart */}
				<Card className='rounded-md border bg-gray-50 p-6'>
					<h3 className='text-lg font-semibold mb-4'>Top Languages (by code lines)</h3>
					<ResponsiveContainer width='100%' height={300}>
						<BarChart data={languageData.slice(0, 10)}>
							<XAxis dataKey='name' angle={-45} textAnchor='end' height={100} />
							<YAxis />
							<Tooltip />
							<Bar dataKey='value' fill='#3B82F6' />
						</BarChart>
					</ResponsiveContainer>
				</Card>
			</div>

			{/* File Table */}
			<Card className='rounded-md border bg-gray-50 p-6'>
				<div className='flex items-center justify-between mb-4'>
					<button
						onClick={() => setShowFileDetails(!showFileDetails)}
						className='flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors'
					>
						{showFileDetails ? (
							<ChevronDown className='h-5 w-5' />
						) : (
							<ChevronRight className='h-5 w-5' />
						)}
						Files ({filteredFiles.length})
					</button>
					<div className='flex gap-2'>
						<input
							type='text'
							placeholder='Search files...'
							className='px-3 py-1 border rounded-md text-sm'
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
						/>
						<select
							className='px-3 py-1 border rounded-md text-sm'
							value={languageFilter || ''}
							onChange={e => setLanguageFilter(e.target.value || null)}
						>
							<option value=''>All Languages</option>
							{Object.keys(result.languages).map(lang => (
								<option key={lang} value={lang}>
									{lang}
								</option>
							))}
						</select>
					</div>
				</div>

				{showFileDetails && (
					<div className='overflow-x-auto max-h-96 overflow-y-auto'>
						<table className='w-full text-sm'>
							<thead className='bg-muted sticky top-0'>
								<tr>
									<th className='text-left p-2 font-medium'>File</th>
									<th className='text-left p-2 font-medium'>Language</th>
									<th className='text-right p-2 font-medium'>Total</th>
									<th className='text-right p-2 font-medium'>Code</th>
									<th className='text-right p-2 font-medium'>Comments</th>
									<th className='text-right p-2 font-medium'>Blank</th>
								</tr>
							</thead>
							<tbody>
								{filteredFiles.map((file, idx) => (
									<tr key={idx} className='border-t hover:bg-muted/50'>
										<td
											className='p-2 font-mono text-xs truncate max-w-md'
											title={file.path}
										>
											{file.path}
										</td>
										<td className='p-2'>{file.language}</td>
										<td className='p-2 text-right'>
											{formatNumber(file.total)}
										</td>
										<td className='p-2 text-right'>
											{formatNumber(file.code)}
										</td>
										<td className='p-2 text-right'>
											{formatNumber(file.comment)}
										</td>
										<td className='p-2 text-right'>
											{formatNumber(file.blank)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			{/* Stats Summary */}
			<Card className='rounded-md border bg-gray-50 p-6'>
				<h3 className='text-lg font-semibold mb-4'>Statistics</h3>
				<div className='grid md:grid-cols-3 gap-4 text-sm'>
					<div>
						<div className='text-muted-foreground'>Mean lines per file</div>
						<div className='text-xl font-semibold'>{result.mean.toFixed(1)}</div>
					</div>
					<div>
						<div className='text-muted-foreground'>Median lines per file</div>
						<div className='text-xl font-semibold'>{result.median.toFixed(1)}</div>
					</div>
					<div>
						<div className='text-muted-foreground'>Standard deviation</div>
						<div className='text-xl font-semibold'>{result.std_dev.toFixed(1)}</div>
					</div>
				</div>
			</Card>
		</div>
	)
}
