import { useState, useEffect, useMemo } from 'react'
import { Users, Trophy, GitCommit, Award } from 'lucide-react'
import { Card } from '../ui/Card'
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell
} from 'recharts'
import { formatNumber } from '@/lib/utils'
import * as git from '@/lib/git'
import type { GitCommitInfo } from '@/lib/git'

interface ContributorsDashboardProps {
	projectPath: string
	hasGit: boolean
}

interface Contributor {
	name: string
	email: string
	commits: number
	percentage: number
	rank: number
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function ContributorsDashboard({ projectPath, hasGit }: ContributorsDashboardProps) {
	const [commits, setCommits] = useState<GitCommitInfo[]>([])
	const [loading, setLoading] = useState(true)

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
			const commitList = await git.getCommits(projectPath, undefined, 500)
			setCommits(commitList)
		} catch (err) {
			console.error('Failed to load commits:', err)
		} finally {
			setLoading(false)
		}
	}

	const contributors = useMemo(() => {
		const contributorMap = new Map<string, { name: string; email: string; commits: number }>()

		commits.forEach(commit => {
			const key = commit.author_email
			const existing = contributorMap.get(key)
			if (existing) {
				existing.commits++
			} else {
				contributorMap.set(key, {
					name: commit.author_name,
					email: commit.author_email,
					commits: 1
				})
			}
		})

		const totalCommits = commits.length
		const contributorList: Contributor[] = Array.from(contributorMap.values())
			.map(c => ({
				...c,
				percentage: (c.commits / totalCommits) * 100,
				rank: 0
			}))
			.sort((a, b) => b.commits - a.commits)
			.map((c, index) => ({ ...c, rank: index + 1 }))

		return contributorList
	}, [commits])

	const topContributors = contributors.slice(0, 5)
	const chartData = contributors.slice(0, 10)

	if (!hasGit) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<Users className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>Git repository not detected</p>
					<p className='text-sm text-gray-400 mt-2'>
						This dashboard requires a Git repository
					</p>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center h-64'>
				<p className='text-gray-500'>Loading contributors...</p>
			</div>
		)
	}

	if (contributors.length === 0) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<Users className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>No contributors found</p>
				</div>
			</div>
		)
	}

	const getMedalEmoji = (rank: number) => {
		if (rank === 1) return '🥇'
		if (rank === 2) return '🥈'
		if (rank === 3) return '🥉'
		return null
	}

	return (
		<div className='space-y-6'>
			{/* Stats */}
			<div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Users className='h-4 w-4' />
						<span className='text-sm font-medium'>Contributors</span>
					</div>
					<div className='text-3xl font-bold text-gray-900'>{contributors.length}</div>
				</Card>

				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<GitCommit className='h-4 w-4' />
						<span className='text-sm font-medium'>Total Commits</span>
					</div>
					<div className='text-3xl font-bold text-blue-600'>{commits.length}</div>
				</Card>

				<Card className='p-4'>
					<div className='flex items-center gap-2 text-gray-600 mb-2'>
						<Trophy className='h-4 w-4' />
						<span className='text-sm font-medium'>Avg/Contributor</span>
					</div>
					<div className='text-3xl font-bold text-green-600'>
						{(commits.length / contributors.length).toFixed(1)}
					</div>
				</Card>
			</div>

			{/* Top 3 Podium */}
			<Card className='p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2'>
				<h3 className='text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2'>
					<Trophy className='h-5 w-5 text-yellow-600' />
					Top Contributors
				</h3>
				<div className='grid md:grid-cols-3 gap-4'>
					{topContributors.slice(0, 3).map(contributor => (
						<div
							key={contributor.email}
							className={`text-center p-6 rounded-lg border-2 bg-white ${
								contributor.rank === 1
									? 'border-yellow-400 transform md:-translate-y-4'
									: contributor.rank === 2
										? 'border-gray-300'
										: 'border-orange-300'
							}`}
						>
							<div className='text-4xl mb-2'>{getMedalEmoji(contributor.rank)}</div>
							<div className='font-bold text-lg text-gray-900 mb-1'>
								{contributor.name}
							</div>
							<div className='text-sm text-gray-500 mb-3'>{contributor.email}</div>
							<div className='text-3xl font-bold text-blue-600 mb-1'>
								{contributor.commits}
							</div>
							<div className='text-xs text-gray-500'>
								{contributor.percentage.toFixed(1)}% of commits
							</div>
						</div>
					))}
				</div>
			</Card>

			{/* Charts Row */}
			<div className='grid md:grid-cols-2 gap-6'>
				{/* Commit Distribution Bar Chart */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>
						Commits by Contributor
					</h3>
					<ResponsiveContainer width='100%' height={300}>
						<BarChart data={chartData} layout='vertical'>
							<XAxis type='number' />
							<YAxis
								type='category'
								dataKey='name'
								width={100}
								tick={{ fontSize: 11 }}
							/>
							<Tooltip />
							<Bar dataKey='commits' fill='#3B82F6'>
								{chartData.map((_, index) => (
									<Cell
										key={`cell-${index}`}
										fill={CHART_COLORS[index % CHART_COLORS.length]}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</Card>

				{/* Contribution Pie Chart */}
				<Card className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>Contribution Share</h3>
					<ResponsiveContainer width='100%' height={300}>
						<PieChart>
							<Pie
								data={topContributors}
								cx='50%'
								cy='50%'
								labelLine={false}
								label={({ name, percentage }) =>
									`${name.split(' ')[0]} (${percentage.toFixed(0)}%)`
								}
								outerRadius={80}
								fill='#8884d8'
								dataKey='commits'
							>
								{topContributors.map((_, index) => (
									<Cell
										key={`cell-${index}`}
										fill={CHART_COLORS[index % CHART_COLORS.length]}
									/>
								))}
							</Pie>
							<Tooltip />
						</PieChart>
					</ResponsiveContainer>
				</Card>
			</div>

			{/* Full Leaderboard */}
			<Card className='p-6'>
				<h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
					<Award className='h-5 w-5' />
					Full Leaderboard
				</h3>
				<div className='overflow-x-auto'>
					<table className='w-full'>
						<thead className='border-b'>
							<tr className='text-left text-sm text-gray-600'>
								<th className='pb-3 font-medium'>Rank</th>
								<th className='pb-3 font-medium'>Contributor</th>
								<th className='pb-3 font-medium'>Email</th>
								<th className='pb-3 font-medium text-right'>Commits</th>
								<th className='pb-3 font-medium text-right'>Share</th>
							</tr>
						</thead>
						<tbody className='divide-y'>
							{contributors.map(contributor => (
								<tr key={contributor.email} className='text-sm hover:bg-gray-50'>
									<td className='py-3'>
										<div className='flex items-center gap-2'>
											{getMedalEmoji(contributor.rank) ? (
												<span className='text-xl'>
													{getMedalEmoji(contributor.rank)}
												</span>
											) : (
												<span className='text-gray-500 font-medium w-6 text-center'>
													{contributor.rank}
												</span>
											)}
										</div>
									</td>
									<td className='py-3 font-medium text-gray-900'>
										{contributor.name}
									</td>
									<td className='py-3 text-gray-600 text-xs'>
										{contributor.email}
									</td>
									<td className='py-3 text-right font-semibold text-blue-600'>
										{formatNumber(contributor.commits)}
									</td>
									<td className='py-3 text-right text-gray-600'>
										<div className='flex items-center justify-end gap-2'>
											<div className='w-24 bg-gray-200 rounded-full h-2'>
												<div
													className='bg-blue-600 h-2 rounded-full'
													style={{
														width: `${Math.min(contributor.percentage, 100)}%`
													}}
												/>
											</div>
											<span className='text-xs font-medium w-12 text-right'>
												{contributor.percentage.toFixed(1)}%
											</span>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	)
}
