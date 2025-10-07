import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { supabaseUpdate } from '@/lib/supabase-temp'

/**
 * POST /api/github/webhook
 * Handle GitHub webhooks for repository events
 */

function verifySignature(body: string, signature: string, secret: string) {
	const expectedSignature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
	return signature === expectedSignature
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.text()
		const signature = req.headers.get('x-hub-signature-256')
		const event = req.headers.get('x-github-event')

		if (!signature || !process.env.GITHUB_WEBHOOK_SECRET) {
			return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
		}

		if (!verifySignature(body, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
			return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
		}

		const payload = JSON.parse(body)

		switch (event) {
			case 'release':
				await handleReleaseEvent(payload)
				break
			case 'push':
				await handlePushEvent(payload)
				break
			case 'star':
				await handleStarEvent(payload)
				break
			default:
				console.log(`Unhandled GitHub event: ${event}`)
		}

		return NextResponse.json({ success: true })
	} catch (error: unknown) {
		console.error('GitHub webhook error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

async function handleReleaseEvent(payload: any) {
	if (payload.action !== 'published') return

	const repoFullName = payload.repository.full_name
	const release = payload.release

	// Update all linked projects with new release info
	const updateData: Database['public']['Tables']['github_links']['Update'] = {
		latest_release: {
			tag_name: release.tag_name,
			name: release.name,
			published_at: release.published_at,
			html_url: release.html_url
		}
	}

	const { error } = await supabaseUpdate(supabaseAdmin, 'github_links', updateData)
		.eq('repo_full_name', repoFullName)

	if (error) {
		console.error('Error updating release info:', error)
	}
}

async function handlePushEvent(payload: any) {
	if (payload.ref !== 'refs/heads/main' && payload.ref !== 'refs/heads/master') return

	const repoFullName = payload.repository.full_name
	const commit = payload.head_commit

	if (!commit) return

	// Update last commit info
	const commitUpdateData: Database['public']['Tables']['github_links']['Update'] = {
		last_commit: {
			sha: commit.id,
			message: commit.message,
			timestamp: commit.timestamp,
			author: commit.author,
			url: commit.url
		}
	}

	const { error } = await supabaseUpdate(supabaseAdmin, 'github_links', commitUpdateData)
		.eq('repo_full_name', repoFullName)

	if (error) {
		console.error('Error updating commit info:', error)
	}
}

async function handleStarEvent(payload: any) {
	const repoFullName = payload.repository.full_name
	const starCount = payload.repository.stargazers_count

	// Update star count
	const starUpdateData: Database['public']['Tables']['github_links']['Update'] = {
		stars_count: starCount
	}

	const { error } = await supabaseUpdate(supabaseAdmin, 'github_links', starUpdateData)
		.eq('repo_full_name', repoFullName)

	if (error) {
		console.error('Error updating star count:', error)
	}
}
