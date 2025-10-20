import { useState, useEffect } from 'react'
import { TrendingUp, GitCommit, Calendar, Activity } from 'lucide-react'
import { Card } from '../ui/Card'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
	AreaChart,
	Area,
	Legend
} from 'recharts'
import { formatShortSha, getCommitSummary } from '@/lib/utils'
import * as git from '@/lib/git'
import type { GitCommitInfo } from '@/lib/git'
import type { ScanResult } from '@/types'

interface EvolutionDashboardProps {
	projectPath: string
	hasGit: boolean
	scanResult?: ScanResult | null
}

export default function EvolutionDashboard({
	projectPath,
	hasGit,
	scanResult
}: EvolutionDashboardProps) {
	const [commits, setCommits] = useState<GitCommitInfo[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [locSeries, setLocSeries] = useState<Array<Record<string, number | string>>>([])
	const [locLoading, setLocLoading] = useState(false)

	useEffect(() => {
		if (!hasGit) {
			setLoading(false)
			return
		}
		loadCommits()
	}, [projectPath, hasGit])

	async function loadCommits() {
		try {
			setLoading(true)
			setError(null)
			const commitList = await git.getCommits(projectPath, undefined, 75)
			setCommits(commitList)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load commits')
		} finally {
			setLoading(false)
		}
	}

	// Map file extension to a human language name (approximation)
	const extToLang = (filePath: string): string => {
		const ext = (filePath.split('.').pop() || '').toLowerCase()
		const map: Record<string, string> = {
			ts: 'TypeScript',
			tsx: 'TypeScript',
			js: 'JavaScript',
			jsx: 'JavaScript',
			py: 'Python',
			rs: 'Rust',
			go: 'Go',
			java: 'Java',
			kt: 'Kotlin',
			cs: 'C#',
			cpp: 'C++',
			cxx: 'C++',
			cc: 'C++',
			hpp: 'C++',
			h: 'C',
			c: 'C',
			rb: 'Ruby',
			php: 'PHP',
			swift: 'Swift',
			m: 'Objective-C',
			scala: 'Scala',
			dart: 'Dart',
			sh: 'Shell',
			bash: 'Shell',
			zsh: 'Shell',
			md: 'Markdown',
			markdown: 'Markdown',
			txt: 'Text',
			json: 'JSON',
			xlsx: 'Excel',
			pptx: 'PowerPoint',
			pdf: 'PDF',
			zip: 'Archive',
			rar: 'Archive',
			'7z': 'Archive',
			jpg: 'Image',
			png: 'Image',
			gif: 'Image',
			webp: 'Image',
			svg: 'Image',
			mp4: 'Video',
			avi: 'Video',
			mov: 'Video',
			mp3: 'Audio',
			aac: 'Audio',
			wav: 'Audio',
			ogg: 'Audio',
			flac: 'Audio'
		}
		return map[ext] || 'Other'
	}

	useEffect(() => {
		// Build LOC over time series by language using baseline from scanResult
		async function buildLocSeries() {
			if (!hasGit || !scanResult || commits.length === 0) {
				setLocSeries([])
				return
			}
			setLocLoading(true)
			try {
				// Use the current scan's language code counts as baseline at HEAD
				const baseline: Record<string, number> = {}
				Object.entries(scanResult.languages).forEach(([lang, stats]) => {
					baseline[lang] = stats.code
				})

				// Limit to last N commits to control cost
				const recent = commits.slice(0, 60) // newest -> oldest

				// For each commit, fetch file changes and aggregate net change per language
				const perCommitDelta: Array<{
					sha: string
					date: string
					deltas: Record<string, number>
				}> = []
				for (const c of recent) {
					const changes = await git.getCommitFileChanges(projectPath, c.sha)
					const deltas: Record<string, number> = {}
					for (const ch of changes) {
						const lang = extToLang(ch.path)
						deltas[lang] = (deltas[lang] || 0) + (ch.insertions - ch.deletions)
					}
					const date = new Date(c.timestamp * 1000).toISOString().slice(0, 10)
					perCommitDelta.push({ sha: c.sha, date, deltas })
				}

				// Walk backwards from HEAD baseline applying reverse deltas to reconstruct history
				// Group by date to daily series
				const dates = Array.from(new Set(perCommitDelta.map(d => d.date))).sort()
				// We'll compute values from oldest -> newest, but we have baseline at newest (HEAD)
				// So we accumulate reverse by starting from HEAD and subtracting per-day totals going backwards
				const dailyTotals: Record<string, Record<string, number>> = {}

				// Sum deltas by date
				const dailyDeltas: Record<string, Record<string, number>> = {}
				for (const d of perCommitDelta) {
					dailyDeltas[d.date] = dailyDeltas[d.date] || {}
					for (const [lang, delta] of Object.entries(d.deltas)) {
						dailyDeltas[d.date][lang] = (dailyDeltas[d.date][lang] || 0) + delta
					}
				}

				// Compute daily totals by accumulating deltas from oldest to newest
				for (const date of dates) {
					for (const lang in baseline) {
						dailyTotals[date] = dailyTotals[date] || {}
						dailyTotals[date][lang] =
							(dailyTotals[date][lang] || 0) + (baseline[lang] || 0)
					}
					for (const lang in dailyDeltas[date]) {
						dailyTotals[date][lang] =
							(dailyTotals[date][lang] || 0) - dailyDeltas[date][lang]
					}
				}

				// Convert to series format
				const series: Array<Record<string, number | string>> = []
				for (const date of dates) {
					const row: Record<string, number | string> = { date }
					for (const lang in dailyTotals[date]) {
						row[lang] = dailyTotals[date][lang]
					}
					series.push(row)
				}

				setLocSeries(series)
			} finally {
				setLocLoading(false)
			}
		}
		buildLocSeries()
	}, [hasGit, scanResult, commits])

	// No Git guard
	if (!hasGit) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<GitCommit className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>Git repository not detected</p>
					<p className='text-sm text-gray-400 mt-2'>
						Link a Git repository to track evolution
					</p>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<Activity className='h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse' />
					<p className='text-gray-500'>Loading commit history...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<p className='text-red-500'>Error: {error}</p>
				</div>
			</div>
		)
	}

	return (
		<>
			<div className='space-y-6'>
				{/* LOC over time by language (stacked) */}
				{hasGit && scanResult && (
					<Card className='p-6'>
						<h3 className='text-lg font-semibold text-gray-900 mb-4'>
							Lines of Code Over Time (by Language)
						</h3>
						{locLoading ? (
							<div className='h-64 flex items-center justify-center text-gray-500'>
								Building series...
							</div>
						) : locSeries.length === 0 ? (
							<div className='h-64 flex items-center justify-center text-gray-500'>
								Not enough data
							</div>
						) : (
							<ResponsiveContainer width='100%' height={320}>
								<AreaChart data={locSeries}>
									<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
									<XAxis dataKey='date' tick={{ fontSize: 12 }} />
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip />
									<Legend />
									{Object.keys(scanResult.languages)
										.slice(0, 6)
										.map((lang, idx) => (
											<Area
												key={lang}
												type='monotone'
												dataKey={lang}
												stackId='1'
												stroke={
													[
														'#3B82F6',
														'#10B981',
														'#F59E0B',
														'#EF4444',
														'#8B5CF6',
														'#EC4899'
													][idx % 6]
												}
												fill={
													[
														'#3B82F6',
														'#10B981',
														'#F59E0B',
														'#EF4444',
														'#8B5CF6',
														'#EC4899'
													][idx % 6]
												}
												fillOpacity={0.35}
											/>
										))}
								</AreaChart>
							</ResponsiveContainer>
						)}
					</Card>
				)}

				{/* Stats Cards */}
				<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
					<Card className='p-4'>
						<div className='flex items-center gap-2 text-gray-600 mb-2'>
							<GitCommit className='h-4 w-4' />
							<span className='text-sm font-medium'>Total Commits</span>
						</div>
						<div className='text-3xl font-bold text-gray-900'>{commits.length}</div>
					</Card>

					<Card className='p-4'>
						<div className='flex items-center gap-2 text-gray-600 mb-2'>
							<Calendar className='h-4 w-4' />
							<span className='text-sm font-medium'>Active Days</span>
						</div>
						<div className='text-3xl font-bold text-blue-600'>
							{
								Object.keys(
									commits.reduce(
										(acc, commit) => {
											const date = new Date(
												commit.timestamp * 1000
											).toLocaleDateString()
											acc[date] = (acc[date] || 0) + 1
											return acc
										},
										{} as Record<string, number>
									)
								).length
							}
						</div>
					</Card>

					<Card className='p-4'>
						<div className='flex items-center gap-2 text-gray-600 mb-2'>
							<TrendingUp className='h-4 w-4' />
							<span className='text-sm font-medium'>Avg/Day</span>
						</div>
						<div className='text-3xl font-bold text-green-600'>
							{(
								commits.length /
								Math.max(
									Object.keys(
										commits.reduce(
											(acc, commit) => {
												const date = new Date(
													commit.timestamp * 1000
												).toLocaleDateString()
												acc[date] = (acc[date] || 0) + 1
												return acc
											},
											{} as Record<string, number>
										)
									).length,
									1
								)
							).toFixed(1)}
						</div>
					</Card>

					<Card className='p-4'>
						<div className='flex items-center gap-2 text-gray-600 mb-2'>
							<Activity className='h-4 w-4' />
							<span className='text-sm font-medium'>Contributors</span>
						</div>
						<div className='text-3xl font-bold text-purple-600'>
							{new Set(commits.map(c => c.author_email)).size}
						</div>
					</Card>
				</div>

				{/* Commit Activity Chart */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>
						Commit Activity (Last 30 Days)
					</h3>
					<ResponsiveContainer width='100%' height={300}>
						<LineChart
							data={Object.entries(
								commits.reduce(
									(acc, commit) => {
										const date = new Date(
											commit.timestamp * 1000
										).toLocaleDateString()
										acc[date] = (acc[date] || 0) + 1
										return acc
									},
									{} as Record<string, number>
								)
							)
								.map(([date, count]) => ({ date, commits: count }))
								.slice(-30)}
						>
							<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
							<XAxis
								dataKey='date'
								tick={{ fontSize: 12 }}
								angle={-45}
								textAnchor='end'
								height={80}
							/>
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip
								contentStyle={{
									backgroundColor: 'white',
									border: '1px solid #e5e7eb',
									borderRadius: '6px'
								}}
							/>
							<Line
								type='monotone'
								dataKey='commits'
								stroke='#3B82F6'
								strokeWidth={2}
								dot={{ fill: '#3B82F6', r: 4 }}
								activeDot={{ r: 6 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</Card>

				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Activity className='h-4 w-4' />
						<span className='text-sm font-medium'>Contributors</span>
					</div>
					<div className='text-3xl font-bold text-purple-600'>
						{new Set(commits.map(c => c.author_email)).size}
					</div>
				</Card>
			</div>

			{/* Recent Commits */}
			<Card className='p-6'>
				<h3 className='text-lg font-semibold text-gray-900 mb-4'>Recent Commits</h3>
				<div className='space-y-3'>
					{commits.slice(0, 15).map(commit => (
						<div
							key={commit.sha}
							className='flex items-start gap-3 pb-3 border-b last:border-b-0 hover:bg-gray-50 -mx-2 px-2 py-2 rounded'
						>
							<div className='flex-shrink-0 mt-1'>
								<div className='w-2 h-2 bg-blue-500 rounded-full' />
							</div>
							<div className='flex-1 min-w-0'>
								<div className='flex items-center gap-2 mb-1'>
									<code className='text-xs font-mono bg-gray-100 px-2 py-0.5 rounded'>
										{formatShortSha(commit.sha)}
									</code>
									<span className='text-sm font-medium text-gray-900'>
										{commit.author_name}
									</span>
									<span className='text-xs text-gray-500'>
										{git.formatCommitDate(commit.timestamp)}
									</span>
								</div>
								<p className='text-sm text-gray-700'>
									{getCommitSummary(commit.message)}
								</p>
							</div>
						</div>
					))}
				</div>
			</Card>
		</>
	)
}
