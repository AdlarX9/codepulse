import { useMemo, useEffect, useState } from 'react'
import { Target, Shield, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'
import { Card } from '@/components/Card'
import {
	Tooltip,
	ResponsiveContainer,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	Radar
} from 'recharts'
import { computeBranchQualityDeltas, computeQualityMetrics, getBranches } from './invokes'
import { BranchQualityDelta, QualityMetrics } from './types'
import { getScanSettings } from '../settings/invokes'
import { useMainContext } from '@/navigation/MainContext'

export default function QualityDashboard() {
	const { scanResult, projectPath, hasGit } = useMainContext()
	const [qMetrics, setQMetrics] = useState<QualityMetrics | null>(null)
	const [loadingQ, setLoadingQ] = useState(false)
	const [baseBranch, setBaseBranch] = useState<string>('main')
	const [branches, setBranches] = useState<string[]>([])
	const [branchDeltas, setBranchDeltas] = useState<BranchQualityDelta[] | null>(null)
	const [loadingBranches, setLoadingBranches] = useState(false)

	useEffect(() => {
		let cancelled = false
		async function loadQuality() {
			if (!projectPath) {
				setQMetrics(null)
				return
			}
			setLoadingQ(true)
			try {
				const settings = await getScanSettings()
				const q = await computeQualityMetrics(projectPath, settings)
				if (!cancelled) setQMetrics(q)
			} catch {
				if (!cancelled) setQMetrics(null)
			} finally {
				if (!cancelled) setLoadingQ(false)
			}
		}
		loadQuality()
		return () => {
			cancelled = true
		}
	}, [projectPath])

	// Branch analysis: detect base branch and compute diff-based effects
	useEffect(() => {
		let cancelled = false
		async function loadBranches() {
			if (!hasGit || !projectPath) {
				setBranches([])
				setBranchDeltas(null)
				return
			}
			setLoadingBranches(true)
			try {
				const list = await getBranches(projectPath)
				if (cancelled) return
				const base = list.includes('main')
					? 'main'
					: list.includes('master')
						? 'master'
						: list[0] || 'main'
				setBaseBranch(base)
				setBranches(list)
				const settings = await getScanSettings()
				const deltas = await computeBranchQualityDeltas(
					projectPath,
					base,
					list,
					settings
				)
				if (!cancelled) setBranchDeltas(deltas)
			} finally {
				if (!cancelled) setLoadingBranches(false)
			}
		}
		loadBranches()
		return () => {
			cancelled = true
		}
	}, [projectPath, hasGit])

	// Calculate quality metrics
	const metrics = useMemo(() => {
		if (!scanResult) return null

		const commentRatio = (scanResult.total_comments / Math.max(1, scanResult.total_code)) * 100
		const codeRatio = (scanResult.total_code / Math.max(1, scanResult.total_lines)) * 100
		const blankRatio = (scanResult.total_blank / Math.max(1, scanResult.total_lines)) * 100

		const avgFileSize =
			scanResult.total_files > 0 ? scanResult.total_lines / scanResult.total_files : 0
		const complexity = avgFileSize > 500 ? 'High' : avgFileSize > 200 ? 'Medium' : 'Low'

		const coverageBoost = ((qMetrics?.test_coverage ?? 0) + (qMetrics?.doc_coverage ?? 0)) / 2
		const deadCodePenalty = Math.min(20, (qMetrics?.dead_code_findings ?? 0) * 0.2)

		// Enhanced overall score (0-100)
		// Weights: code density 30, comments 20, file size 15, dispersion (stddev) 10, blanks 5, coverage 15, penalties 5+
		const normStd = Math.max(0, 100 - Math.min(100, (qMetrics?.stddev_file_lines ?? 0) / 10))
		const fileSizeScore = avgFileSize < 300 ? 85 : avgFileSize < 500 ? 70 : 50
		let qualityScore = 0
		qualityScore += Math.min(codeRatio, 100) * 0.3
		qualityScore += Math.min(commentRatio, 100) * 0.2
		qualityScore += fileSizeScore * 0.15
		qualityScore += normStd * 0.1
		qualityScore += Math.max(0, 100 - blankRatio) * 0.05
		qualityScore += Math.min(100, coverageBoost) * 0.15
		qualityScore -= deadCodePenalty

		return {
			commentRatio,
			codeRatio,
			blankRatio,
			avgFileSize,
			complexity,
			qualityScore: Math.max(0, Math.round(qualityScore)),
			documentationCoverage: commentRatio > 10 ? 'Good' : commentRatio > 5 ? 'Fair' : 'Low'
		}
	}, [scanResult, qMetrics])

	// Helper: approximate quality score for given totals (keep dispersion/coverage from qMetrics)
	function approxQualityScore(
		total_lines: number,
		total_code: number,
		total_comments: number,
		total_blank: number
	) {
		const commentRatio = (total_comments / Math.max(1, total_code)) * 100
		const codeRatio = (total_code / Math.max(1, total_lines)) * 100
		const blankRatio = (total_blank / Math.max(1, total_lines)) * 100
		const avgFileSize =
			qMetrics && qMetrics.total_files > 0 ? total_lines / qMetrics.total_files : 0
		const coverageBoost = ((qMetrics?.test_coverage ?? 0) + (qMetrics?.doc_coverage ?? 0)) / 2
		const deadCodePenalty = Math.min(20, (qMetrics?.dead_code_findings ?? 0) * 0.2)
		const normStd = Math.max(0, 100 - Math.min(100, (qMetrics?.stddev_file_lines ?? 0) / 10))
		const fileSizeScore = avgFileSize < 300 ? 85 : avgFileSize < 500 ? 70 : 50
		let score = 0
		score += Math.min(codeRatio, 100) * 0.3
		score += Math.min(commentRatio, 100) * 0.2
		score += fileSizeScore * 0.15
		score += normStd * 0.1
		score += Math.max(0, 100 - blankRatio) * 0.05
		score += Math.min(100, coverageBoost) * 0.15
		score -= deadCodePenalty
		return Math.max(0, Math.round(score))
	}

	const branchEffects = useMemo(() => {
		if (!branchDeltas || !qMetrics) return []
		// Compute base score from qMetrics + scanResult totals if present
		const baseTotals = {
			total_lines: qMetrics.total_lines,
			total_code: qMetrics.total_code,
			total_comments: qMetrics.total_comments,
			total_blank: qMetrics.total_blank
		}
		const baseScore = approxQualityScore(
			baseTotals.total_lines,
			baseTotals.total_code,
			baseTotals.total_comments,
			baseTotals.total_blank
		)
		return branchDeltas
			.filter(d => d.branch !== baseBranch)
			.map(d => {
				const next = {
					total_lines: Math.max(0, baseTotals.total_lines + d.delta_total),
					total_code: Math.max(0, baseTotals.total_code + d.delta_code),
					total_comments: Math.max(0, baseTotals.total_comments + d.delta_comments),
					total_blank: Math.max(0, baseTotals.total_blank + d.delta_blank)
				}
				const nextScore = approxQualityScore(
					next.total_lines,
					next.total_code,
					next.total_comments,
					next.total_blank
				)
				return {
					branch: d.branch,
					changed_files: d.changed_files,
					delta_score: nextScore - baseScore,
					d
				}
			})
			.sort((a, b) => b.delta_score - a.delta_score)
	}, [branchDeltas, qMetrics, baseBranch])

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

			<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
				<Card className='p-4'>
					<div className='text-sm font-medium text-gray-600 mb-1'>Test Coverage</div>
					<div className='text-3xl font-bold text-blue-600'>
						{loadingQ
							? '…'
							: qMetrics?.test_coverage != null
								? `${(qMetrics.test_coverage as number).toFixed(1)}%`
								: 'N/A'}
					</div>
				</Card>
				<Card className='p-4'>
					<div className='text-sm font-medium text-gray-600 mb-1'>Doc Coverage</div>
					<div className='text-3xl font-bold text-green-600'>
						{loadingQ
							? '…'
							: qMetrics?.doc_coverage != null
								? `${(qMetrics.doc_coverage as number).toFixed(1)}%`
								: 'N/A'}
					</div>
				</Card>
				<Card className='p-4'>
					<div className='text-sm font-medium text-gray-600 mb-1'>Dead Code</div>
					<div className='text-3xl font-bold text-red-600'>
						{loadingQ ? '…' : (qMetrics?.dead_code_findings ?? 0)}
					</div>
				</Card>
				<Card className='p-4'>
					<div className='text-sm font-medium text-gray-600 mb-1'>Nesting (approx)</div>
					<div className='text-3xl font-bold text-purple-600'>
						{loadingQ
							? '…'
							: Math.max(
									0,
									Math.min(
										100,
										Math.round((qMetrics?.stddev_file_lines ?? 0) / 5)
									)
								)}
					</div>
				</Card>
			</div>

			{/* Branch analysis vs base (diff-based effects) */}
			{hasGit && (
				<Card className='p-6'>
					<div className='flex items-center justify-between mb-4'>
						<h3 className='text-lg font-semibold text-gray-900'>
							Branch Analysis vs {baseBranch}
						</h3>
						<div className='text-xs text-gray-500'>
							{loadingBranches ? 'Loading…' : `${branches.length} branches`}
						</div>
					</div>
					<div className='overflow-x-auto'>
						<table className='w-full'>
							<thead className='border-b'>
								<tr className='text-left text-sm text-gray-600'>
									<th className='pb-3 font-medium'>Branch</th>
									<th className='pb-3 font-medium text-right'>Changed Files</th>
									<th className='pb-3 font-medium text-right'>Δ Code</th>
									<th className='pb-3 font-medium text-right'>Δ Comments</th>
									<th className='pb-3 font-medium text-right'>Δ Blank</th>
									<th className='pb-3 font-medium text-right'>
										Predicted Δ Score
									</th>
								</tr>
							</thead>
							<tbody className='divide-y'>
								{branchEffects.map(row => (
									<tr key={row.branch} className='text-sm hover:bg-gray-50'>
										<td className='py-3 font-medium text-gray-900'>
											{row.branch}
										</td>
										<td className='py-3 text-right text-gray-600'>
											{row.changed_files}
										</td>
										<td
											className={`py-3 text-right ${row.d.delta_code >= 0 ? 'text-green-600' : 'text-red-600'}`}
										>
											{row.d.delta_code}
										</td>
										<td className='py-3 text-right text-gray-600'>
											{row.d.delta_comments}
										</td>
										<td className='py-3 text-right text-gray-600'>
											{row.d.delta_blank}
										</td>
										<td
											className={`py-3 text-right font-semibold ${row.delta_score >= 0 ? 'text-green-700' : 'text-red-700'}`}
										>
											{row.delta_score > 0 ? '+' : ''}
											{row.delta_score}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>
			)}

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
