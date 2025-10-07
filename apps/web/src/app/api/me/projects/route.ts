import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/me/projects
 * Returns user's projects with latest scan summaries
 * Auth required: TODO - integrate with NextAuth/Supabase
 */

export async function GET(req: NextRequest) {
	try {
		// 1. Auth check (placeholder)
		// const user = await requireAuth(req)
		// if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		const userId = 'placeholder-user-id' // TODO: get from session

		// 2. TODO: Database query
		// SELECT projects.*, latest_scan.* FROM projects
		// LEFT JOIN LATERAL (
		//   SELECT * FROM scans WHERE project_id = projects.id ORDER BY created_at DESC LIMIT 1
		// ) latest_scan ON true
		// WHERE projects.user_id = $1
		// ORDER BY latest_scan.created_at DESC NULLS LAST

		// Mock data for now
		const mockProjects = [
			{
				id: '550e8400-e29b-41d4-a716-446655440001',
				user_id: userId,
				project_key_hash: 'abc123def456789...',
				name: 'My Frontend Project',
				visibility: 'private',
				created_at: '2025-01-01T10:00:00Z',
				latest_scan: {
					id: '550e8400-e29b-41d4-a716-446655440101',
					created_at: '2025-01-06T12:00:00Z',
					total: 15420,
					code: 12800,
					comment: 1200,
					blank: 1420,
					core_code_lines: 12800,
					info_lines: 2620,
					comment_ratio: 0.078,
					device_id: 'dev-abc123',
					version_tag: 'v1.1.0'
				}
			},
			{
				id: '550e8400-e29b-41d4-a716-446655440002',
				user_id: userId,
				project_key_hash: 'def456ghi789012...',
				name: null,
				visibility: 'private',
				created_at: '2025-01-02T14:00:00Z',
				latest_scan: {
					id: '550e8400-e29b-41d4-a716-446655440102',
					created_at: '2025-01-05T14:30:00Z',
					total: 8904,
					code: 7200,
					comment: 800,
					blank: 904,
					core_code_lines: 7200,
					info_lines: 1704,
					comment_ratio: 0.09,
					device_id: 'dev-abc123',
					version_tag: 'v1.1.0'
				}
			}
		]

		return NextResponse.json({
			projects: mockProjects
		})
	} catch (error: unknown) {
		console.error('Get projects error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
