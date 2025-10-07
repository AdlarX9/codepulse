import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/me/projects/[id]/scans
 * Returns scans for a specific project with optional date filtering
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const user = await requireAuth(req)
		const projectId = params.id
		const { searchParams } = new URL(req.url)
		const from = searchParams.get('from')
		const to = searchParams.get('to')
		const limit = parseInt(searchParams.get('limit') || '50')

		// Verify project ownership
		const { data: project, error: projectError } = await supabaseAdmin
			.from('projects')
			.select('id')
			.eq('id', projectId)
			.eq('user_id', user.id)
			.single()

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 })
		}

		// Build query
		let query = supabaseAdmin
			.from('scans')
			.select(
				`
				*,
				scan_langs (*)
			`
			)
			.eq('project_id', projectId)
			.order('created_at', { ascending: false })
			.limit(limit)

		if (from) {
			query = query.gte('created_at', from)
		}
		if (to) {
			query = query.lte('created_at', to)
		}

		const { data: scans, error: scansError } = await query

		if (scansError) {
			console.error('Scans fetch error:', scansError)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		return NextResponse.json({
			scans: scans || [],
			project_id: projectId
		})
	} catch (error: unknown) {
		console.error('Get project scans error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
