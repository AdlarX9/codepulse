import { NextRequest, NextResponse } from 'next/server'
import { getDownloadStats } from '@/lib/supabase'
import { checkBasicAuth, createUnauthorizedResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
	// Check Basic Auth
	if (!checkBasicAuth(request)) {
		return createUnauthorizedResponse()
	}

	try {
		const { searchParams } = new URL(request.url)
		const period = parseInt(searchParams.get('period') || '30')

		const startDate = new Date()
		startDate.setDate(startDate.getDate() - period)

		const downloads = await getDownloadStats(startDate)

		return NextResponse.json({ downloads })
	} catch (error) {
		console.error('Failed to fetch stats:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
