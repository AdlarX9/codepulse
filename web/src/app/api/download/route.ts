import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const platform = searchParams.get('platform') || 'mac'
		const version = searchParams.get('version') || 'latest'

		// Validate platform
		const validPlatforms = ['mac', 'win', 'linux']
		if (!validPlatforms.includes(platform)) {
			return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
		}

		// Call the Go API for download tracking and redirect
		const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
		const response = await fetch(
			`${apiUrl}/v1/download?platform=${platform}&version=${version}`,
			{
				redirect: 'manual'
			}
		)

		if (!response.ok) {
			return NextResponse.json(
				{ error: 'Download not available' },
				{ status: response.status }
			)
		}

		// Get the redirect URL from the API response
		const redirectUrl = response.headers.get('Location')

		if (!redirectUrl) {
			return NextResponse.json({ error: 'No download URL available' }, { status: 404 })
		}

		// Redirect to the actual download URL
		return NextResponse.redirect(redirectUrl)
	} catch (error) {
		console.error('Download proxy error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
