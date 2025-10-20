import { useMemo } from 'react'
import { Target, Shield, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'
import { Card } from '../ui/Card'
import {
	Tooltip,
	ResponsiveContainer,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar
} from 'recharts'
import type { ScanResult } from '@/types'

interface QualityDashboardProps {
	scanResult: ScanResult | null
}

export default function QualityDashboard({ scanResult }: QualityDashboardProps) {
	// Calculate quality metrics
	const metrics = useMemo(() => {
		if (!scanResult) return null

		const commentRatio = (scanResult.total_comments / scanResult.total_code) * 100
		const codeRatio = (scanResult.total_code / scanResult.total_lines) * 100
		const blankRatio = (scanResult.total_blank / scanResult.total_lines) * 100

		// Simple complexity estimation based on file sizes
		const avgFileSize = scanResult.total_lines / scanResult.total_files
		const complexity = avgFileSize > 500 ? 'High' : avgFileSize > 200 ? 'Medium' : 'Low'

		// Quality score (0-100)
		let qualityScore = 0
		qualityScore += Math.min(commentRatio * 2, 30) // Max 30 points for comments (15% ideal)
		qualityScore += Math.min(codeRatio, 40) // Max 40 points for code density
		qualityScore += avgFileSize < 300 ? 30 : avgFileSize < 500 ? 20 : 10 // File size score

		return {
			commentRatio,
			codeRatio,
			blankRatio,
			avgFileSize,
			complexity,
			qualityScore: Math.round(qualityScore),
			documentationCoverage: commentRatio > 10 ? 'Good' : commentRatio > 5 ? 'Fair' : 'Low'
		}
	}, [scanResult])

	// Radar chart data
	const radarData = useMemo(() => {
		if (!metrics) return []
		return [
			{
				metric: 'Documentation',
				value: Math.min(metrics.commentRatio * 6, 100)
			},
			{
				metric: 'Code Density',
				value: metrics.codeRatio
			},
			{
				metric: 'File Organization',
				value: metrics.avgFileSize < 300 ? 90 : metrics.avgFileSize < 500 ? 60 : 30
			},
			{
				metric: 'Consistency',
				value: 75 // Placeholder - would need more analysis
			},
			{
				metric: 'Modularity',
				value: scanResult ? Math.min((scanResult.total_files / 10) * 10, 100) : 0
			}
		]
	}, [metrics, scanResult])

	if (!scanResult || !metrics) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<Target className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>No quality data available</p>
					<p className='text-sm text-gray-400 mt-2'>
						Scan your project to see quality metrics
					</p>
				</div>
			</div>
		)
	}

	const getScoreColor = (score: number) => {
		if (score >= 80) return 'text-green-600'
		if (score >= 60) return 'text-yellow-600'
		return 'text-red-600'
	}

	const getScoreLabel = (score: number) => {
		if (score >= 80) return 'Excellent'
		if (score >= 60) return 'Good'
		if (score >= 40) return 'Fair'
		return 'Needs Improvement'
	}

	return (
		<div className='space-y-6'>
			{/* Quality Score Card */}
			<Card className='p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2'>
				<div className='flex items-center justify-between'>
					<div>
						<h3 className='text-lg font-semibold text-gray-900 mb-2'>
							Overall Quality Score
						</h3>
						<div
							className={`text-5xl font-bold ${getScoreColor(metrics.qualityScore)}`}
						>
							{metrics.qualityScore}/100
						</div>
						<p className='text-sm text-gray-600 mt-2'>
							{getScoreLabel(metrics.qualityScore)}
						</p>
					</div>
					<div className='text-6xl'>
						{metrics.qualityScore >= 80
							? '🌟'
							: metrics.qualityScore >= 60
								? '✨'
								: '📊'}
					</div>
				</div>
			</Card>

			{/* Key Metrics */}
			<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Shield className='h-4 w-4' />
						<span className='text-sm font-medium'>Code Density</span>
					</div>
					<div className='text-3xl font-bold text-blue-600'>
						{metrics.codeRatio.toFixed(1)}%
					</div>
					<p className='text-xs text-gray-500 mt-1'>Code vs Total Lines</p>
				</Card>

				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<CheckCircle className='h-4 w-4' />
						<span className='text-sm font-medium'>Documentation</span>
					</div>
					<div className='text-3xl font-bold text-green-600'>
						{metrics.commentRatio.toFixed(1)}%
					</div>
					<p className='text-xs text-gray-500 mt-1'>
						{metrics.documentationCoverage} coverage
					</p>
				</Card>

				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<BarChart3 className='h-4 w-4' />
						<span className='text-sm font-medium'>Avg File Size</span>
					</div>
					<div className='text-3xl font-bold text-purple-600'>
						{Math.round(metrics.avgFileSize)}
					</div>
					<p className='text-xs text-gray-500 mt-1'>lines per file</p>
				</Card>

				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<AlertTriangle className='h-4 w-4' />
						<span className='text-sm font-medium'>Complexity</span>
					</div>
					<div
						className={`text-3xl font-bold ${
							metrics.complexity === 'Low'
								? 'text-green-600'
								: metrics.complexity === 'Medium'
									? 'text-yellow-600'
									: 'text-red-600'
						}`}
					>
						{metrics.complexity}
					</div>
					<p className='text-xs text-gray-500 mt-1'>estimated</p>
				</Card>
			</div>

			{/* Charts Row */}
			<div className='grid md:grid-cols-2 gap-6'>
				{/* Quality Radar */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>Quality Dimensions</h3>
					<ResponsiveContainer width='100%' height={300}>
						<RadarChart data={radarData}>
							<PolarGrid stroke='#e5e7eb' />
							<PolarAngleAxis dataKey='metric' tick={{ fontSize: 12 }} />
							<PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
							<Radar
								name='Quality'
								dataKey='value'
								stroke='#3B82F6'
								fill='#3B82F6'
								fillOpacity={0.6}
							/>
							<Tooltip />
						</RadarChart>
					</ResponsiveContainer>
				</Card>

				{/* Code Composition */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>Code Composition</h3>
					<div className='space-y-4 mt-6'>
						<div>
							<div className='flex justify-between text-sm mb-2'>
								<span className='text-gray-600'>Code</span>
								<span className='font-medium'>{metrics.codeRatio.toFixed(1)}%</span>
							</div>
							<div className='w-full bg-gray-200 rounded-full h-3'>
								<div
									className='bg-blue-600 h-3 rounded-full transition-all'
									style={{ width: `${metrics.codeRatio}%` }}
								/>
							</div>
						</div>

						<div>
							<div className='flex justify-between text-sm mb-2'>
								<span className='text-gray-600'>Comments</span>
								<span className='font-medium'>
									{metrics.commentRatio.toFixed(1)}%
								</span>
							</div>
							<div className='w-full bg-gray-200 rounded-full h-3'>
								<div
									className='bg-green-600 h-3 rounded-full transition-all'
									style={{ width: `${metrics.commentRatio}%` }}
								/>
							</div>
						</div>

						<div>
							<div className='flex justify-between text-sm mb-2'>
								<span className='text-gray-600'>Blank Lines</span>
								<span className='font-medium'>
									{metrics.blankRatio.toFixed(1)}%
								</span>
							</div>
							<div className='w-full bg-gray-200 rounded-full h-3'>
								<div
									className='bg-gray-400 h-3 rounded-full transition-all'
									style={{ width: `${metrics.blankRatio}%` }}
								/>
							</div>
						</div>
					</div>
				</Card>
			</div>

			{/* Recommendations */}
			<Card className='p-6 bg-yellow-50 border-yellow-200'>
				<h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
					<AlertTriangle className='h-5 w-5 text-yellow-600' />
					Recommendations
				</h3>
				<ul className='space-y-2'>
					{metrics.commentRatio < 10 && (
						<li className='text-sm text-gray-700'>
							• Consider increasing code documentation (current:{' '}
							{metrics.commentRatio.toFixed(1)}%, target: 10-15%)
						</li>
					)}
					{metrics.avgFileSize > 500 && (
						<li className='text-sm text-gray-700'>
							• Large average file size detected ({Math.round(metrics.avgFileSize)}{' '}
							lines). Consider breaking down large files.
						</li>
					)}
					{metrics.qualityScore < 60 && (
						<li className='text-sm text-gray-700'>
							• Overall code quality can be improved. Focus on documentation and file
							organization.
						</li>
					)}
					{metrics.qualityScore >= 80 && (
						<li className='text-sm text-green-700 font-medium'>
							✓ Your code quality is excellent! Keep up the good work.
						</li>
					)}
				</ul>
			</Card>
		</div>
	)
}
