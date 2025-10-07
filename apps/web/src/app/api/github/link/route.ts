import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { supabaseUpsert } from '@/lib/supabase-temp'

/**
 * POST /api/github/link
 * Link a project to a GitHub repository
 */

const LinkRepoSchema = z.object({
	project_id: z.string(),
	repo_full_name: z.string().regex(/^[\w\-\.]+\/[\w\-\.]+$/) // owner/repo format
})

export async function POST(req: NextRequest) {
	try {
		const user = await requireAuth(req)
		const body = await req.json()
		const { project_id, repo_full_name } = LinkRepoSchema.parse(body)

		// Verify project ownership
		const { data: project, error: projectError } = await supabaseAdmin
			.from('projects')
			.select('id')
			.eq('id', project_id)
			.eq('user_id', user.id)
			.single()

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 })
		}

		// Fetch repository info from GitHub API
		const repoResponse = await fetch(`https://api.github.com/repos/${repo_full_name}`)

		if (!repoResponse.ok) {
			return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
		}

		const repoData = await repoResponse.json()

		// Check if user has access to this repository
		// This is a simplified check - in production, you'd verify OAuth access
		if (repoData.private) {
			// For private repos, we'd need to check GitHub OAuth token
			// For now, allow public repos only or implement OAuth verification
		}

		// Create or update GitHub link
		const linkData: Database['public']['Tables']['github_links']['Insert'] = {
			user_id: user.id,
			project_id,
			repo_full_name,
			repo_data: {
				name: repoData.name,
				description: repoData.description,
				stars_count: repoData.stargazers_count,
				forks_count: repoData.forks_count,
				language: repoData.language,
				homepage: repoData.homepage,
				html_url: repoData.html_url,
				updated_at: repoData.updated_at
			}
		}

		const { data: link, error: linkError } = await supabaseUpsert(
			supabaseAdmin,
			'github_links',
			linkData,
			{ onConflict: 'project_id' }
		)
			.select()
			.single()

		if (linkError) {
			console.error('GitHub link error:', linkError)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		return NextResponse.json({
			success: true,
			link,
			repository: repoData
		})
	} catch (error: unknown) {
		console.error('Link GitHub repo error:', error)
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid data', details: error.errors },
				{ status: 400 }
			)
		}
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

/**
 * DELETE /api/github/link?project_id=...
 * Unlink a project from GitHub repository
 */
export async function DELETE(req: NextRequest) {
	try {
		const user = await requireAuth(req)
		const { searchParams } = new URL(req.url)
		const projectId = searchParams.get('project_id')

		if (!projectId) {
			return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })
		}

		// Delete GitHub link
		const { error } = await supabaseAdmin
			.from('github_links')
			.delete()
			.eq('project_id', projectId)
			.eq('user_id', user.id)

		if (error) {
			console.error('GitHub unlink error:', error)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		return NextResponse.json({
			success: true,
			message: 'Repository unlinked successfully'
		})
	} catch (error: unknown) {
		console.error('Unlink GitHub repo error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
