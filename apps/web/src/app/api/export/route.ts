import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Papa from 'papaparse'
import { json2xml } from 'xml-js'
import { Database } from '@/lib/database.types'

/**
 * GET /api/export
 * Export project data in CSV, JSON, or XML format
 */

const ExportParamsSchema = z.object({
	project_id: z.string(),
	format: z.enum(['csv', 'json', 'xml']),
	from: z.string().optional(),
	to: z.string().optional(),
	include_languages: z
		.string()
		.transform(val => val === 'true')
		.optional()
})

export async function GET(req: NextRequest) {
	try {
		const user = await requireAuth(req)
		const { searchParams } = new URL(req.url)

		const params = ExportParamsSchema.parse({
			project_id: searchParams.get('project_id'),
			format: searchParams.get('format'),
			from: searchParams.get('from'),
			to: searchParams.get('to'),
			include_languages: searchParams.get('include_languages')
		})

		// Verify project ownership
		const { data: project, error: projectError } = await supabaseAdmin
			.from('projects')
			.select('id, name')
			.eq('id', params.project_id)
			.eq('user_id', user.id)
			.single()

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 })
		}

		// TypeScript assertion après la vérification - on sait que project existe à ce point
		const validProject = project as Database['public']['Tables']['projects']['Row']

		// Build query for scans
		let scansQuery = supabaseAdmin
			.from('scans')
			.select(
				`
				*,
				${params.include_languages ? 'scan_langs (*)' : ''}
			`
			)
			.eq('project_id', params.project_id)
			.order('created_at', { ascending: true })

		if (params.from) {
			scansQuery = scansQuery.gte('created_at', params.from)
		}
		if (params.to) {
			scansQuery = scansQuery.lte('created_at', params.to)
		}

		const { data: scans, error: scansError } = await scansQuery

		if (scansError) {
			console.error('Export scans error:', scansError)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		// TypeScript assertion pour les scans
		const validScans = (scans || []) as Array<Database['public']['Tables']['scans']['Row'] & { scan_langs?: any[] }>

		const exportData = {
			project: {
				id: validProject.id,
				name: validProject.name || 'Unnamed Project',
				exported_at: new Date().toISOString()
			},
			scans: validScans
		}

		// Generate filename
		const projectName = (validProject.name || 'project').replace(/[^a-zA-Z0-9]/g, '_')
		const timestamp = new Date().toISOString().split('T')[0]
		const filename = `codepulse_${projectName}_${timestamp}.${params.format}`

		// Format and return data
		switch (params.format) {
			case 'csv':
				const csvData = validScans.map(scan => ({
						scan_id: scan.id,
						created_at: scan.created_at,
						total_lines: scan.total,
						code_lines: scan.code,
						comment_lines: scan.comment,
						blank_lines: scan.blank,
						core_code_lines: scan.core_code_lines,
						info_lines: scan.info_lines,
						comment_ratio: scan.comment_ratio,
						device_id: scan.device_id,
						version: scan.version_tag
					}))

				const csv = Papa.unparse(csvData)
				return new NextResponse(csv, {
					headers: {
						'Content-Type': 'text/csv',
						'Content-Disposition': `attachment; filename="${filename}"`
					}
				})

			case 'xml':
				const xmlOptions = {
					compact: true,
					ignoreComment: true,
					spaces: 2
				}
				const xml = json2xml(JSON.stringify({ codepulse_export: exportData }), xmlOptions)
				return new NextResponse(xml, {
					headers: {
						'Content-Type': 'application/xml',
						'Content-Disposition': `attachment; filename="${filename}"`
					}
				})

			case 'json':
			default:
				return new NextResponse(JSON.stringify(exportData, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						'Content-Disposition': `attachment; filename="${filename}"`
					}
				})
		}
	} catch (error: unknown) {
		console.error('Export error:', error)
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid parameters', details: error.errors },
				{ status: 400 }
			)
		}
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
