import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
	throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

// Admin client (server-side only)
export const supabaseAdmin = createClient<Database>(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	}
)

// Client-side client
export const createSupabaseClient = () => {
	return createClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	)
}

export interface DownloadRecord {
	ip_hash?: string | null
	country?: string | null
	region?: string | null
	city?: string | null
	user_agent?: string | null
	referrer?: string | null
	platform: string
	version: string
}

export async function insertDownload(data: DownloadRecord) {
	const { error } = await supabaseAdmin.from('downloads').insert({
		...data,
		created_at: new Date().toISOString()
	})

	if (error) {
		console.error('Failed to insert download record:', error)
		throw error
	}
}

export async function getDownloadStats(startDate?: Date, endDate?: Date, platform?: string) {
	let query = supabaseAdmin
		.from('downloads')
		.select('*')
		.order('created_at', { ascending: false })

	if (startDate) {
		query = query.gte('created_at', startDate.toISOString())
	}
	if (endDate) {
		query = query.lte('created_at', endDate.toISOString())
	}
	if (platform) {
		query = query.eq('platform', platform)
	}

	const { data, error } = await query

	if (error) {
		console.error('Failed to fetch download stats:', error)
		throw error
	}

	return data
}
