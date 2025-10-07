import { Suspense } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'

/**
 * /app page - User dashboard showing synced projects
 * Auth required
 */

async function getProjects(userId: string) {
	const { data: projects } = await supabaseAdmin
		.from('projects')
		.select(
			`
			*,
			scans!inner (
				id,
				created_at,
				total,
				code,
				comment,
				blank,
				core_code_lines,
				info_lines,
				comment_ratio
			),
			github_links (
				repo_full_name,
				repo_data
			)
		`
		)
		.eq('user_id', userId)
		.order('created_at', { ascending: false })

	// Get latest scan for each project - TypeScript assertion pour contourner les types
	const projectsWithLatest =
		projects?.map(project => {
			const projectData = project as any
			const latestScan = projectData.scans?.sort(
				(a: any, b: any) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			)[0]

			return {
				...projectData,
				latest_scan: latestScan,
				github_link: projectData.github_links?.[0]
			}
		}) || []

	return projectsWithLatest
}

function ProjectsList({ projects }: { projects: any[] }) {
	return (
		<div className='space-y-4'>
			<h2 className='text-2xl font-semibold'>Your Projects</h2>
			{projects.length === 0 ? (
				<div className='text-center py-12 text-gray-500'>
					<p>No projects synced yet.</p>
					<p className='text-sm mt-2'>
						Enable sync in the desktop app settings to see your projects here.
					</p>
				</div>
			) : (
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{projects.map(project => (
						<Link
							key={project.id}
							href={`/app/projects/${project.id}`}
							className='block border rounded-lg p-4 hover:shadow-md transition-shadow'
						>
							<div className='flex items-start justify-between mb-2'>
								<h3 className='font-medium truncate'>
									{project.name ||
										`Project ${project.project_key_hash.slice(0, 8)}...`}
								</h3>
								{project.github_link && (
									<span className='text-xs bg-gray-100 px-2 py-1 rounded'>
										GitHub
									</span>
								)}
							</div>

							{project.latest_scan && (
								<>
									<p className='text-sm text-gray-600 mb-3'>
										Last scan:{' '}
										{new Date(
											project.latest_scan.created_at
										).toLocaleDateString()}
									</p>
									<div className='space-y-1 text-sm'>
										<div className='flex justify-between'>
											<span>Total lines:</span>
											<span className='font-mono'>
												{project.latest_scan.total.toLocaleString()}
											</span>
										</div>
										<div className='flex justify-between'>
											<span>Core code:</span>
											<span className='font-mono text-blue-600'>
												{project.latest_scan.core_code_lines.toLocaleString()}
											</span>
										</div>
										<div className='flex justify-between'>
											<span>Info/docs:</span>
											<span className='font-mono text-gray-500'>
												{project.latest_scan.info_lines.toLocaleString()}
											</span>
										</div>
										<div className='flex justify-between'>
											<span>Comments:</span>
											<span className='font-mono text-green-600'>
												{(project.latest_scan.comment_ratio * 100).toFixed(
													1
												)}
												%
											</span>
										</div>
									</div>
								</>
							)}

							{project.github_link && (
								<div className='mt-3 pt-3 border-t'>
									<p className='text-xs text-gray-500 truncate'>
										{project.github_link.repo_full_name}
									</p>
									{project.github_link.repo_data?.stars_count && (
										<p className='text-xs text-yellow-600'>
											⭐ {project.github_link.repo_data.stars_count}
										</p>
									)}
								</div>
							)}
						</Link>
					))}
				</div>
			)}
		</div>
	)
}

export default async function AppPage() {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		redirect('/auth/signin')
	}

	const projects = await getProjects(session.user.id)

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='mb-8'>
				<h1 className='text-3xl font-bold'>CodePulse Dashboard</h1>
				<p className='text-gray-600 mt-2'>
					View your synced project statistics and timelines.
				</p>
				<div className='mt-4 flex items-center gap-4'>
					<div className='text-sm'>
						<span className='font-medium'>{projects.length}</span> projects synced
					</div>
					<Link href='/app/settings' className='text-sm text-blue-600 hover:underline'>
						Manage sync settings
					</Link>
				</div>
			</div>

			<ProjectsList projects={projects} />

			{projects.length > 0 && (
				<div className='mt-8 text-center'>
					<Link
						href='/app/analytics'
						className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
					>
						View Analytics Dashboard
					</Link>
				</div>
			)}
		</div>
	)
}
