import { Suspense } from 'react'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

/**
 * /u/[handle] - Public profile page
 */

async function getProfile(handle: string) {
	const { data: profile, error } = await supabaseAdmin
		.from('profiles')
		.select(
			`
			*,
			users!inner (
				email,
				created_at
			),
			projects!inner (
				id,
				name,
				visibility,
				created_at,
				scans!inner (
					total,
					code,
					comment,
					blank,
					core_code_lines,
					info_lines,
					comment_ratio,
					created_at
				),
				github_links (
					repo_full_name,
					repo_data,
					stars_count
				)
			)
		`
		)
		.eq('handle', handle)
		.eq('visibility', 'public')
		.eq('projects.visibility', 'public')
		.single()

	if (error || !profile) {
		return null
	}

	// Get aggregated stats
	const publicProjects = profile.projects || []
	const totalScans = publicProjects.reduce(
		(sum: number, project: any) => sum + (project.scans?.length || 0),
		0
	)
	const totalLines = publicProjects.reduce((sum: number, project: any) => {
		const latestScan = project.scans?.sort(
			(a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)[0]
		return sum + (latestScan?.total || 0)
	}, 0)

	const totalStars = publicProjects.reduce((sum: number, project: any) => {
		return sum + (project.github_links?.[0]?.stars_count || 0)
	}, 0)

	return {
		profile,
		projects: publicProjects,
		stats: {
			totalProjects: publicProjects.length,
			totalScans,
			totalLines,
			totalStars
		}
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

						<div className='flex items-center gap-6 text-sm text-gray-600 mb-4'>
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

						{Object.keys(links).length > 0 && (
							<div className='flex gap-3'>
								{links.github && (
									<a
										href={links.github}
										target='_blank'
										rel='noopener noreferrer'
										className='text-blue-600 hover:underline text-sm'
									>
										GitHub
									</a>
								)}
								{links.website && (
									<a
										href={links.website}
										target='_blank'
										rel='noopener noreferrer'
										className='text-blue-600 hover:underline text-sm'
									>
										Website
									</a>
								)}
								{links.twitter && (
									<a
										href={links.twitter}
										target='_blank'
										rel='noopener noreferrer'
										className='text-blue-600 hover:underline text-sm'
									>
										Twitter
									</a>
								)}
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
