import { NextRequest, NextResponse } from 'next/server'
import { insertDownload } from '@/lib/supabase'
import { sha256 } from '@/lib/utils'
import { resolveAssetUrl } from '@/lib/assets'
import type { Platform } from '@codepulse/core'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const platform = (searchParams.get('platform') || 'mac') as Platform
		const version = searchParams.get('version') || 'latest'

		// Validate platform
		if (!['mac', 'win', 'linux'].includes(platform)) {
			return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
		}

		// Extract geo and user info from headers
		const country = request.headers.get('x-vercel-ip-country') || 'XX'
		const city = request.headers.get('x-vercel-ip-city') || ''
		const region = request.headers.get('x-vercel-ip-country-region') || ''
		const userAgent = request.headers.get('user-agent') || ''
		const referrer = request.headers.get('referer') || ''

		// Hash IP address (never store raw IP)
		const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || ''
		const salt = process.env.DOWNLOAD_IP_SALT || ''
		const ipHash = await sha256(ip + salt)

		// Resolve asset URL
		let assetUrl: string
		try {
			assetUrl = await resolveAssetUrl(platform, version)
		} catch (error) {
			console.error('Failed to resolve asset:', error)
			return NextResponse.json(
				{ error: 'Asset not found for this platform/version' },
				{ status: 404 }
			)
		}

		// Insert download record
		try {
			await insertDownload({
				ip_hash: ipHash,
				country,
				region,
				city,
				user_agent: userAgent,
				referrer,
				platform,
				version,
				release_channel: 'stable',
				source: 'landing'
			})
		} catch (error) {
			// Log but don't block download
			console.error('Failed to log download:', error)
		}

		// Redirect to asset
		return NextResponse.redirect(assetUrl, 302)
	} catch (error) {
		console.error('Download route error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
