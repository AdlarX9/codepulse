import { Suspense } from 'react'
import Link from 'next/link'
import pool from '@/lib/db'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

/**
 * /u/[handle] - Public profile page
 */

async function getProfile(handle: string) {
	const client = await pool.connect()
	try {
		// Get profile with public projects and their scans
		const profileResult = await client.query(
			`
			SELECT 
				p.*,
				u.email,
				u.created_at as user_created_at
			FROM profiles p
			INNER JOIN users u ON p.user_id = u.id
			WHERE p.handle = $1 AND p.visibility = 'public'
		`,
			[handle]
		)

		if (profileResult.rows.length === 0) {
			return null
		}

		const profile = profileResult.rows[0]

		// Get public projects with their latest scans and GitHub links
		const projectsResult = await client.query(
			`
			SELECT 
				pr.*,
				gl.repo_full_name,
				gl.repo_data,
				gl.stars_count
			FROM projects pr
			LEFT JOIN github_links gl ON pr.id = gl.project_id
			WHERE pr.user_id = $1 AND pr.visibility = 'public'
			ORDER BY pr.created_at DESC
		`,
			[profile.user_id]
		)

		const projects = [] as any[]
		let totalScans = 0
		let totalLines = 0
		let totalStars = 0

		for (const project of projectsResult.rows) {
			// Get scans for this project
			const scansResult = await client.query(
				`
				SELECT * FROM scans 
				WHERE project_id = $1 
				ORDER BY created_at DESC
			`,
				[project.id]
			)

			const scans = scansResult.rows
			totalScans += scans.length

			// Get latest scan for total lines calculation
			if (scans.length > 0) {
				totalLines += scans[0].total || 0
			}

			// Add GitHub stars
			if (project.stars_count) {
				totalStars += project.stars_count
			}

			projects.push({
				...project,
				scans,
				github_links: project.repo_full_name
					? [
							{
								repo_full_name: project.repo_full_name,
								repo_data: project.repo_data,
								stars_count: project.stars_count
							}
						]
					: []
			})
		}

		// Aggregate languages using latest scan per project
		const latestScans = await client.query(
			`
			WITH latest_scans AS (
				SELECT DISTINCT ON (project_id) id, project_id
				FROM scans
				WHERE project_id = ANY($1)
				ORDER BY project_id, created_at DESC
			)
			SELECT sl.language, SUM(sl.total) AS total
			FROM scan_langs sl
			JOIN latest_scans ls ON sl.scan_id = ls.id
			GROUP BY sl.language
			ORDER BY total DESC
			LIMIT 10
		`,
			[projects.map(p => p.id)]
		)

		// Determine best project: prefer highest stars, fallback to largest total lines
		let bestProject: any = null
		if (projects.length > 0) {
			bestProject = [...projects].sort((a, b) => {
				const aStars = a.stars_count || 0
				const bStars = b.stars_count || 0
				if (bStars !== aStars) return bStars - aStars
				const aLines = a.scans?.[0]?.total || 0
				const bLines = b.scans?.[0]?.total || 0
				return bLines - aLines
			})[0]
		}

		return {
			profile: {
				...profile,
				users: [
					{
						email: profile.email,
						created_at: profile.user_created_at
					}
				]
			},
			projects,
			stats: {
				totalProjects: projects.length,
				totalScans,
				totalLines,
				totalStars,
				topLanguages: latestScans.rows || [],
				bestProject
			}
		}
	} finally {
		client.release()
	}
}

export async function generateMetadata({
	params
}: {
	params: { handle: string }
}): Promise<Metadata> {
	const data = await getProfile(params.handle)

	if (!data) {
		return {
			title: 'Profile Not Found - CodePulse'
		}
	}

	const { profile } = data

	return {
		title: `${profile.display_name || profile.handle} - CodePulse`,
		description:
			profile.bio || `${profile.display_name || profile.handle}'s public CodePulse profile`,
		openGraph: {
			title: `${profile.display_name || profile.handle} - CodePulse`,
			description:
				profile.bio ||
				`${profile.display_name || profile.handle}'s public CodePulse profile`,
			type: 'profile',
			images: profile.avatar_url ? [profile.avatar_url] : []
		},
		twitter: {
			card: 'summary',
			title: `${profile.display_name || profile.handle} - CodePulse`,
			description:
				profile.bio ||
				`${profile.display_name || profile.handle}'s public CodePulse profile`,
			images: profile.avatar_url ? [profile.avatar_url] : []
		}
	}
}

function ProfileHeader({ profile, stats }: { profile: any; stats: any }) {
	const links = profile.links || {}

	return (
		<div className='bg-white border-b'>
			<div className='container mx-auto px-4 py-8'>
				<div className='flex items-start gap-6'>
					{profile.avatar_url && (
						<img
							src={profile.avatar_url}
							alt={profile.display_name || profile.handle}
							className='w-24 h-24 rounded-full border-4 border-gray-200'
						/>
					)}
					<div className='flex-1'>
						<div className='flex items-center gap-4 mb-2'>
							<h1 className='text-3xl font-bold'>
								{profile.display_name || profile.handle}
							</h1>
							<span className='text-gray-500'>@{profile.handle}</span>
						</div>

						{profile.bio && (
							<p className='text-gray-700 mb-4 max-w-2xl'>{profile.bio}</p>
						)}

						<div className='flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-4'>
							<div>
								<span className='font-semibold'>{stats.totalProjects}</span> public
								projects
							</div>
							<div>
								<span className='font-semibold'>
									{stats.totalLines.toLocaleString()}
								</span>{' '}
								total lines
							</div>
							{stats.totalStars > 0 && (
								<div>
									<span className='font-semibold'>⭐ {stats.totalStars}</span>{' '}
									GitHub stars
								</div>
							)}
						</div>

						{/* Top Languages */}
						{stats.topLanguages?.length > 0 && (
							<div className='flex flex-wrap gap-2 mb-2'>
								{stats.topLanguages.map((l: any) => (
									<span
										key={l.language}
										className='px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200'
									>
										{l.language} · {l.total?.toLocaleString?.() || l.total}
									</span>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

function ProjectCard({ project }: { project: any }) {
	const latestScan = project.scans?.sort(
		(a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	)[0]

	const githubLink = project.github_links?.[0]

	return (
		<div className='border rounded-lg p-6 hover:shadow-md transition-shadow'>
			<div className='flex items-start justify-between mb-4'>
				<div>
					<h3 className='text-xl font-semibold mb-2'>
						{project.name || `Project ${project.id.slice(0, 8)}...`}
					</h3>
					{githubLink && (
						<div className='flex items-center gap-2 text-sm text-gray-600'>
							<a
								href={githubLink.repo_data?.html_url}
								target='_blank'
								rel='noopener noreferrer'
								className='hover:text-blue-600'
							>
								{githubLink.repo_full_name}
							</a>
							{githubLink.stars_count > 0 && <span>⭐ {githubLink.stars_count}</span>}
						</div>
					)}
				</div>
				<Link
					href={`/api/og/project/${project.id}?handle=${project.profiles?.[0]?.handle}`}
					target='_blank'
					className='text-sm text-blue-600 hover:underline'
				>
					Share
				</Link>
			</div>

			{latestScan && (
				<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
					<div>
						<div className='text-gray-500'>Total Lines</div>
						<div className='font-mono font-semibold'>
							{latestScan.total.toLocaleString()}
						</div>
					</div>
					<div>
						<div className='text-gray-500'>Core Code</div>
						<div className='font-mono font-semibold text-blue-600'>
							{latestScan.core_code_lines.toLocaleString()}
						</div>
					</div>
					<div>
						<div className='text-gray-500'>Info/Docs</div>
						<div className='font-mono font-semibold text-gray-600'>
							{latestScan.info_lines.toLocaleString()}
						</div>
					</div>
					<div>
						<div className='text-gray-500'>Comments</div>
						<div className='font-mono font-semibold text-green-600'>
							{(latestScan.comment_ratio * 100).toFixed(1)}%
						</div>
					</div>
				</div>
			)}

			<div className='mt-4 text-xs text-gray-500'>
				{project.scans?.length || 0} scans • Last updated{' '}
				{new Date(latestScan?.created_at || project.created_at).toLocaleDateString()}
			</div>
		</div>
	)
}

interface ProfilePageProps {
	params: {
		handle: string
	}
}

export default async function ProfilePage({ params }: ProfilePageProps) {
	const data = await getProfile(params.handle)

	if (!data) {
		notFound()
	}

	const { profile, projects, stats } = data

	return (
		<div className='min-h-screen bg-gray-50'>
			<ProfileHeader profile={profile} stats={stats} />

			<div className='container mx-auto px-4 py-8'>
				{projects.length === 0 ? (
					<div className='text-center py-12'>
						<h2 className='text-xl font-semibold mb-2'>No public projects yet</h2>
						<p className='text-gray-600'>
							{profile.display_name || profile.handle} hasn't made any projects
							public.
						</p>
					</div>
				) : (
					<>
						{stats.bestProject && (
							<div className='mb-8'>
								<h2 className='text-2xl font-bold mb-3'>Best Project</h2>
								<ProjectCard project={stats.bestProject} />
							</div>
						)}
						<div className='flex items-center justify-between mb-6'>
							<h2 className='text-2xl font-bold'>Public Projects</h2>
							<span className='text-gray-500'>{projects.length} projects</span>
						</div>

						<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
							{projects.map((project: any) => (
								<ProjectCard key={project.id} project={project} />
							))}
						</div>
					</>
				)}
			</div>
		</div>
	)
}
