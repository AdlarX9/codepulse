import { Suspense } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect, notFound } from 'next/navigation'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	AreaChart,
	Area
} from 'recharts'

/**
 * /app/projects/[id] - Project detail page with timeline and analytics
 */

async function getProjectDetails(projectId: string, userId: string) {
	// Get project info
	const { data: project, error: projectError } = await supabaseAdmin
		.from('projects')
		.select(
			`
			*,
			github_links (
				repo_full_name,
				repo_data,
				latest_release,
				last_commit,
				stars_count
			)
		`
		)
		.eq('id', projectId)
		.eq('user_id', userId)
		.single()

	if (projectError || !project) {
		return null
	}

	// Get scans timeline
	const { data: scans } = await supabaseAdmin
		.from('scans')
		.select(
			`
			*,
			scan_langs (*)
		`
		)
		.eq('project_id', projectId)
		.order('created_at', { ascending: true })
		.limit(100) // Last 100 scans

	return {
		project,
		scans: scans || [],
		github_link: project.github_links?.[0]
	}
}

function TimelineChart({ scans }: { scans: any[] }) {
	const chartData = scans.map(scan => ({
		date: new Date(scan.created_at).toLocaleDateString(),
		total: scan.total,
		code: scan.code,
		comment: scan.comment,
		blank: scan.blank,
		core_code: scan.core_code_lines,
		info: scan.info_lines,
		comment_ratio: scan.comment_ratio * 100
	}))

	return (
		<div className='space-y-8'>
			<div>
				<h3 className='text-lg font-semibold mb-4'>Lines Over Time</h3>
				<ResponsiveContainer width='100%' height={300}>
					<AreaChart data={chartData}>
						<CartesianGrid strokeDasharray='3 3' />
						<XAxis dataKey='date' />
						<YAxis />
						<Tooltip />
						<Area
							type='monotone'
							dataKey='core_code'
							stackId='1'
							stroke='#3b82f6'
							fill='#3b82f6'
							fillOpacity={0.6}
							name='Core Code'
						/>
						<Area
							type='monotone'
							dataKey='info'
							stackId='1'
							stroke='#6b7280'
							fill='#6b7280'
							fillOpacity={0.4}
							name='Info/Docs'
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>

			<div>
				<h3 className='text-lg font-semibold mb-4'>Comment Ratio</h3>
				<ResponsiveContainer width='100%' height={200}>
					<LineChart data={chartData}>
						<CartesianGrid strokeDasharray='3 3' />
						<XAxis dataKey='date' />
						<YAxis domain={[0, 100]} />
						<Tooltip
							formatter={value => [`${Number(value).toFixed(1)}%`, 'Comment Ratio']}
						/>
						<Line
							type='monotone'
							dataKey='comment_ratio'
							stroke='#10b981'
							strokeWidth={2}
							dot={{ fill: '#10b981' }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	)
}

function LanguageBreakdown({ latestScan }: { latestScan: any }) {
	if (!latestScan?.scan_langs) return null

	const sortedLangs = latestScan.scan_langs.sort((a: any, b: any) => b.total - a.total)
	const totalLines = sortedLangs.reduce((sum: number, lang: any) => sum + lang.total, 0)

	return (
		<div>
			<h3 className='text-lg font-semibold mb-4'>Language Breakdown</h3>
			<div className='space-y-3'>
				{sortedLangs.slice(0, 10).map((lang: any) => {
					const percentage = (lang.total / totalLines) * 100
					return (
						<div key={lang.language} className='flex items-center justify-between'>
							<div className='flex items-center space-x-3'>
								<div className='w-4 h-4 rounded-full bg-blue-500'></div>
								<span className='font-medium'>{lang.language}</span>
							</div>
							<div className='flex items-center space-x-4 text-sm'>
								<span>{lang.total.toLocaleString()} lines</span>
								<span className='text-gray-500'>{percentage.toFixed(1)}%</span>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function GitHubInfo({ githubLink }: { githubLink: any }) {
	if (!githubLink) return null

	const repoData = githubLink.repo_data
	const latestRelease = githubLink.latest_release
	const lastCommit = githubLink.last_commit

	return (
		<div className='border rounded-lg p-4 bg-gray-50'>
			<div className='flex items-start justify-between mb-4'>
				<div>
					<h3 className='font-semibold'>{repoData?.name}</h3>
					<p className='text-sm text-gray-600'>{githubLink.repo_full_name}</p>
				</div>
				<a
					href={repoData?.html_url}
					target='_blank'
					rel='noopener noreferrer'
					className='text-blue-600 hover:underline text-sm'
				>
					View on GitHub
				</a>
			</div>

			<div className='grid grid-cols-2 gap-4 text-sm'>
				<div>
					<span className='text-gray-500'>Stars:</span>
					<span className='ml-2 font-medium'>
						⭐ {githubLink.stars_count || repoData?.stargazers_count || 0}
					</span>
				</div>
				<div>
					<span className='text-gray-500'>Language:</span>
					<span className='ml-2 font-medium'>{repoData?.language || 'N/A'}</span>
				</div>
			</div>

			{latestRelease && (
				<div className='mt-4 pt-4 border-t'>
					<h4 className='font-medium text-sm mb-2'>Latest Release</h4>
					<div className='text-sm'>
						<div className='flex items-center justify-between'>
							<span>{latestRelease.name || latestRelease.tag_name}</span>
							<span className='text-gray-500'>
								{new Date(latestRelease.published_at).toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>
			)}

			{lastCommit && (
				<div className='mt-4 pt-4 border-t'>
					<h4 className='font-medium text-sm mb-2'>Last Commit</h4>
					<div className='text-sm'>
						<p className='truncate'>{lastCommit.message}</p>
						<div className='flex items-center justify-between mt-1 text-gray-500'>
							<span>{lastCommit.author?.name}</span>
							<span>{new Date(lastCommit.timestamp).toLocaleDateString()}</span>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

interface ProjectPageProps {
	params: { id: string }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		redirect('/auth/signin')
	}

	const data = await getProjectDetails(params.id, session.user.id)

	if (!data) {
		notFound()
	}

	const { project, scans, github_link } = data
	const latestScan = scans[scans.length - 1]

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='mb-8'>
				<div className='flex items-center justify-between'>
					<div>
						<Link
							href='/app'
							className='text-blue-600 hover:underline text-sm mb-2 block'
						>
							← Back to Dashboard
						</Link>
						<h1 className='text-3xl font-bold'>
							{project.name || `Project ${project.project_key_hash.slice(0, 8)}...`}
						</h1>
						<div className='flex items-center gap-4 mt-2 text-sm text-gray-600'>
							<span>{scans.length} scans</span>
							{latestScan && (
								<span>
									Last scan:{' '}
									{new Date(latestScan.created_at).toLocaleDateString()}
								</span>
							)}
						</div>
					</div>
					<div className='flex gap-2'>
						<Link
							href={`/api/export?project_id=${project.id}&format=csv`}
							className='px-3 py-2 text-sm border rounded-lg hover:bg-gray-50'
						>
							Export CSV
						</Link>
						<Link
							href={`/app/projects/${project.id}/settings`}
							className='px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700'
						>
							Settings
						</Link>
					</div>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
				<div className='lg:col-span-2 space-y-8'>
					{scans.length > 1 ? (
						<TimelineChart scans={scans} />
					) : (
						<div className='text-center py-12 text-gray-500'>
							<p>Timeline charts will appear after multiple scans.</p>
							<p className='text-sm mt-2'>
								Keep using the desktop app to build your project history.
							</p>
						</div>
					)}
				</div>

				<div className='space-y-6'>
					{latestScan && (
						<div className='border rounded-lg p-4'>
							<h3 className='font-semibold mb-4'>Current Stats</h3>
							<div className='space-y-3 text-sm'>
								<div className='flex justify-between'>
									<span>Total lines:</span>
									<span className='font-mono'>
										{latestScan.total.toLocaleString()}
									</span>
								</div>
								<div className='flex justify-between'>
									<span>Core code:</span>
									<span className='font-mono text-blue-600'>
										{latestScan.core_code_lines.toLocaleString()}
									</span>
								</div>
								<div className='flex justify-between'>
									<span>Info/docs:</span>
									<span className='font-mono text-gray-500'>
										{latestScan.info_lines.toLocaleString()}
									</span>
								</div>
								<div className='flex justify-between'>
									<span>Comments:</span>
									<span className='font-mono text-green-600'>
										{(latestScan.comment_ratio * 100).toFixed(1)}%
									</span>
								</div>
								<div className='flex justify-between'>
									<span>Blank lines:</span>
									<span className='font-mono text-gray-400'>
										{latestScan.blank.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					)}

					{latestScan && <LanguageBreakdown latestScan={latestScan} />}

					<GitHubInfo githubLink={github_link} />
				</div>
			</div>
		</div>
	)
}
