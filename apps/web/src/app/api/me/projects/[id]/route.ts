import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { supabaseUpdate } from '@/lib/supabase-temp'

/**
 * PATCH /api/me/projects/[id]
 * Update project settings (name, visibility)
 */

const UpdateProjectSchema = z.object({
	name: z.string().optional(),
	visibility: z.enum(['private', 'public']).optional()
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const user = await requireAuth(req)
		const projectId = params.id
		const body = await req.json()
		const updates = UpdateProjectSchema.parse(body)

		// Verify project ownership and update
		const { data: project, error } = await supabaseUpdate(supabaseAdmin, 'projects', updates)
			.eq('id', projectId)
			.eq('user_id', user.id)
			.select()
			.single()

		if (error) {
			console.error('Project update error:', error)
			if (error.code === 'PGRST116') {
				return NextResponse.json({ error: 'Project not found' }, { status: 404 })
			}
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		return NextResponse.json({
			success: true,
			project
		})
	} catch (error: unknown) {
		console.error('Update project error:', error)
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
 * DELETE /api/me/projects/[id]
 * Delete project and all associated scans
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const user = await requireAuth(req)
		const projectId = params.id

		// Delete project (cascades to scans and scan_langs)
		const { error } = await supabaseAdmin
			.from('projects')
			.delete()
			.eq('id', projectId)
			.eq('user_id', user.id)

		if (error) {
			console.error('Project delete error:', error)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		return NextResponse.json({
			success: true,
			message: 'Project deleted successfully'
		})
	} catch (error: unknown) {
		console.error('Delete project error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
