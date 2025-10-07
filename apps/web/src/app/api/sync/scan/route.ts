import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { supabaseUpsert, supabaseInsert } from '@/lib/supabase-temp'

/**
 * POST /api/sync/scan
 * Receives aggregated scan data from desktop app (opt-in).
 * No file paths or content, only totals and per-language stats.
 *
 * Auth: TODO - integrate with NextAuth/Supabase
 * DB: TODO - insert into projects/scans/scan_langs tables
 */

const LangItemSchema = z.object({
	language: z.string(),
	files: z.number().int().nonnegative(),
	total: z.number().int().nonnegative(),
	code: z.number().int().nonnegative(),
	comment: z.number().int().nonnegative(),
	blank: z.number().int().nonnegative()
})

const TotalsSchema = z.object({
	total: z.number().int().nonnegative(),
	code: z.number().int().nonnegative(),
	comment: z.number().int().nonnegative(),
	blank: z.number().int().nonnegative(),
	core_code_lines: z.number().int().nonnegative(),
	info_lines: z.number().int().nonnegative()
})

const SyncPayloadSchema = z.object({
	project_key_hash: z.string().min(1),
	device_id: z.string().min(1),
	scanned_at: z.string(), // ISO timestamp or epoch
	totals: TotalsSchema,
	per_language: z.array(LangItemSchema),
	app_version: z.string().optional()
})

export async function POST(req: NextRequest) {
	try {
		// 1. Auth check
		const user = await requireAuth(req)

		// 2. Parse and validate body
		const body = await req.json()
		const payload = SyncPayloadSchema.parse(body)

		// 3. Database operations (transaction)
		const { data: project, error: projectError } = await supabaseUpsert(
			supabaseAdmin,
			'projects',
			{
				user_id: user.id,
				project_key_hash: payload.project_key_hash
				// Don't overwrite name if it already exists
			},
			{
				onConflict: 'user_id,project_key_hash',
				ignoreDuplicates: false
			}
		)
			.select()
			.single()

		if (projectError) {
			console.error('Project upsert error:', projectError)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		// TypeScript assertion pour project
		const projectData = project as any

		// Insert scan
		const { data: scan, error: scanError } = await supabaseInsert(
			supabaseAdmin,
			'scans',
			{
				user_id: user.id,
				project_id: projectData.id,
				total: payload.totals.total,
				code: payload.totals.code,
				comment: payload.totals.comment,
				blank: payload.totals.blank,
				comment_ratio: payload.totals.comment / payload.totals.total || 0,
				core_code_lines: payload.totals.core_code_lines,
				info_lines: payload.totals.info_lines,
				device_id: payload.device_id,
				version_tag: payload.app_version,
				created_at: new Date(parseInt(payload.scanned_at) * 1000).toISOString()
			}
		)
			.select()
			.single()

		if (scanError) {
			console.error('Scan insert error:', scanError)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		// TypeScript assertion pour scan
		const scanData = scan as any

		// Insert scan languages
		const scanLangs = payload.per_language.map(lang => ({
			scan_id: scanData.id,
			language: lang.language,
			files: lang.files,
			total: lang.total,
			code: lang.code,
			comment: lang.comment,
			blank: lang.blank
		}))

		const { error: langsError } = await supabaseInsert(supabaseAdmin, 'scan_langs', scanLangs)

		if (langsError) {
			console.error('Scan languages insert error:', langsError)
			return NextResponse.json({ error: 'Database error' }, { status: 500 })
		}

		console.log('Successfully synced scan:', {
			userId: user.id,
			projectId: projectData.id,
			scanId: scanData.id,
			totalLines: payload.totals.total,
			languages: payload.per_language.length
		})

		// 4. Return success
		return NextResponse.json({
			success: true,
			message: 'Scan synced successfully',
			scan_id: scanData.id
		})
	} catch (error: unknown) {
		console.error('Sync scan error:', error)
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Invalid payload', details: error.errors },
				{ status: 400 }
			)
		}
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
