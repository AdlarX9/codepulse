import { useState, useEffect } from 'react'
import { TrendingUp, GitCommit, Calendar, Activity } from 'lucide-react'
import { Card } from '@/components/Card'
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
	Legend,
	BarChart,
	Bar
} from 'recharts'
import * as git from '@/handles/git'
import type { GitCommitInfo } from '@/handles/git'
import { getScanSettings } from '../settings/invokes'
import { useMainContext } from '@/navigation/MainContext'
import { getCommitFileChanges, scanRepoHistory } from './invokes'

export default function ProductivityDashboard() {
	const { projectPath, hasGit, scanResult } = useMainContext()
	const [commits, setCommits] = useState<GitCommitInfo[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [locSeries, setLocSeries] = useState<Array<Record<string, number | string>>>([])
	const [locLoading, setLocLoading] = useState(false)
	const [viewMode, setViewMode] = useState<'activity' | 'adds_dels'>('activity')
	const [addsDelsSeries, setAddsDelsSeries] = useState<
		Array<{ date: string; additions: number; deletions: number }>
	>([])

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

	async function buildLocSeries() {
		if (!hasGit || !scanResult || commits.length === 0) {
			setLocSeries([])
			return
		}
		setLocLoading(true)
		try {
			const settings = await getScanSettings()
			const limit = Math.min(300, commits.length)
			const scans = await scanRepoHistory(projectPath, settings, limit)
			const perDate: Record<string, Record<string, number>> = {}
			const langs = new Set<string>()
			for (const s of scans) {
				const date = new Date(s.commit.timestamp * 1000).toISOString().slice(0, 10)
				perDate[date] = perDate[date] || {}
				for (const [lang, st] of Object.entries(s.result.languages)) {
					langs.add(lang)
					perDate[date][lang] = (st as any).code || 0
				}
			}
			const dates = Object.keys(perDate).sort()
			const series: Array<Record<string, number | string>> = dates.map(d => {
				const row: Record<string, number | string> = { date: d }
				for (const l of Array.from(langs)) {
					row[l] = perDate[d][l] ?? 0
				}
				return row
			})
			setLocSeries(series)
		} finally {
			setLocLoading(false)
		}
	}

	useEffect(() => {
		buildLocSeries()
	}, [hasGit, scanResult, commits])

	useEffect(() => {
		if (!hasGit || commits.length === 0) {
			setAddsDelsSeries([])
			return
		}
		;(async () => {
			const recent = commits.slice(0, 200)
			const daily: Record<string, { additions: number; deletions: number }> = {}
			const filesAgg: Record<string, number> = {}
			for (const c of recent) {
				const stats = await git.getCommitDiffStats(projectPath, c.sha)
				const date = new Date(c.timestamp * 1000).toISOString().slice(0, 10)
				daily[date] = daily[date] || { additions: 0, deletions: 0 }
				daily[date].additions += Number(stats.insertions || 0)
				daily[date].deletions += Number(stats.deletions || 0)
				const changes = await getCommitFileChanges(projectPath, c.sha)
				for (const ch of changes) {
					filesAgg[ch.path] = (filesAgg[ch.path] || 0) + (ch.insertions + ch.deletions)
				}
			}
			const series = Object.keys(daily)
				.sort()
				.map(d => ({
					date: d,
					additions: daily[d].additions,
					deletions: daily[d].deletions
				}))
			setAddsDelsSeries(series)
		})()
	}, [hasGit, projectPath, commits])

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
				<div className='grid md:grid-cols-2 gap-4 w-full'>
					{/* Stats Cards */}
					<div className='grid grid-cols-2 gap-4'>
						<Card className='p-4 border bg-white rounded-md'>
							<div className='flex items-center gap-2 text-gray-600 mb-2'>
								<GitCommit className='h-4 w-4' />
								<span className='text-sm font-medium'>Total Commits</span>
							</div>
							<div className='text-3xl font-bold text-gray-900'>{commits.length}</div>
						</Card>

						<Card className='p-4 border bg-white rounded-md'>
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

						<Card className='p-4 border bg-white rounded-md'>
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

						<Card className='p-4 border bg-white rounded-md'>
							<div className='flex items-center gap-2 text-gray-600 mb-2'>
								<Activity className='h-4 w-4' />
								<span className='text-sm font-medium'>Contributors</span>
							</div>
							<div className='text-3xl font-bold text-purple-600'>
								{new Set(commits.map(c => c.author_email)).size}
							</div>
						</Card>
					</div>
				</div>
				{/* LOC over time by language (stacked) */}
				{hasGit && scanResult && (
					<Card className='p-6'>
						<h3 className='text-lg font-semibold text-gray-900 mb-4'>
							Lines of Code Over Time
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
									{Object.keys(scanResult.languages).map((lang, idx) => (
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

				{/* Commit Activity / Additions-Deletions */}
				<Card className='p-6'>
					<Card className='pb-4'>
						<div className='flex items-center gap-2 text-gray-600 mb-2'>
							<Activity className='h-4 w-4' />
							<span className='text-sm font-medium'>View</span>
						</div>
						<div className='flex gap-2'>
							<button
								className={`px-3 py-1 text-sm rounded border ${viewMode === 'activity' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}
								onClick={() => setViewMode('activity')}
							>
								Commits
							</button>
							<button
								className={`px-3 py-1 text-sm rounded border ${viewMode === 'adds_dels' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'}`}
								onClick={() => setViewMode('adds_dels')}
							>
								Additions/Deletions
							</button>
						</div>
					</Card>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>
						{viewMode === 'activity'
							? 'Commit Activity (Last 30 Days)'
							: 'Additions / Deletions (Weekly)'}
					</h3>
					{viewMode === 'activity' ? (
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
								<Tooltip />
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
					) : (
						<ResponsiveContainer width='100%' height={300}>
							<BarChart data={addsDelsSeries}>
								<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
								<XAxis dataKey='date' tick={{ fontSize: 12 }} />
								<YAxis tick={{ fontSize: 12 }} />
								<Tooltip />
								<Legend />
								<Bar dataKey='additions' stackId='a' fill='#10B981' />
								<Bar dataKey='deletions' stackId='a' fill='#EF4444' />
							</BarChart>
						</ResponsiveContainer>
					)}
				</Card>
			</div>
		</>
	)
}
