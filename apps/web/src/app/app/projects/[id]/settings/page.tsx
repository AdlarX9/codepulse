import { Suspense } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import pool from '@/lib/db'
import { redirect, notFound } from 'next/navigation'

/**
 * /app/projects/[id]/settings - Project settings page
 */

async function getProjectDetails(projectId: string, userId: string) {
	const client = await pool.connect()
	try {
		const projectResult = await client.query(
			`
			SELECT p.*
			FROM projects p
			WHERE p.id = $1 AND p.user_id = $2
		`,
			[projectId, userId]
		)

		if (projectResult.rows.length === 0) {
			return null
		}

		return projectResult.rows[0]
	} finally {
		client.release()
	}
}

interface ProjectSettingsProps {
	params: { id: string }
}

export default async function ProjectSettings({ params }: ProjectSettingsProps) {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		redirect('/auth/signin')
	}

	const project = await getProjectDetails(params.id, session.user.id)

	if (!project) {
		notFound()
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='mb-8'>
				<Link
					href={{ pathname: '/app/projects/[id]', query: { id: project.id } }}
					className='text-blue-600 hover:underline text-sm mb-2 block'
				>
					← Back to Project
				</Link>
				<h1 className='text-3xl font-bold'>
					Settings for{' '}
					{project.name || `Project ${project.project_key_hash.slice(0, 8)}...`}
				</h1>
			</div>

			<div className='max-w-2xl'>
				<div className='bg-white border rounded-lg p-6'>
					<h2 className='text-xl font-semibold mb-4'>Project Settings</h2>

					<div className='space-y-6'>
						<div>
							<label className='block text-sm font-medium mb-2'>Project Name</label>
							<p className='text-gray-600'>{project.name || 'Unnamed Project'}</p>
						</div>

						<div>
							<label className='block text-sm font-medium mb-2'>
								Project Key Hash
							</label>
							<p className='font-mono text-sm bg-gray-100 p-2 rounded'>
								{project.project_key_hash}
							</p>
						</div>

						<div>
							<label className='block text-sm font-medium mb-2'>Created At</label>
							<p className='text-gray-600'>
								{new Date(project.created_at).toLocaleDateString()}
							</p>
						</div>

						<div>
							<label className='block text-sm font-medium mb-2'>Last Updated</label>
							<p className='text-gray-600'>
								{new Date(project.updated_at).toLocaleDateString()}
							</p>
						</div>
					</div>
				</div>

				<div className='mt-8'>
					<h3 className='text-lg font-semibold mb-4'>Actions</h3>
					<div className='flex gap-4'>
						<Link
							href={`/api/export?project_id=${project.id}&format=csv`}
							className='px-4 py-2 text-sm border rounded-lg hover:bg-gray-50'
						>
							Export CSV
						</Link>
						<button className='px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700'>
							Delete Project
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
