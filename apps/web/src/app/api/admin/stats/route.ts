import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

// Define types for database query results
interface PlatformRow {
	platform: string
	count: string
}

interface CountryRow {
	country: string
	count: string
}

interface VersionRow {
	version: string
	count: string
}

interface TrendRow {
	date: string
	count: string
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const period = parseInt(searchParams.get('period') || '30')

		const startDate = new Date()
		startDate.setDate(startDate.getDate() - period)

		const client = await pool.connect()
		try {
			// Get total downloads
			const totalResult = await client.query(
				'SELECT COUNT(*) as total FROM downloads WHERE created_at >= $1',
				[startDate]
			)
			const total = parseInt(totalResult.rows[0].total)

			// Get platform breakdown
			const platformResult = await client.query(
				'SELECT platform, COUNT(*) as count FROM downloads WHERE created_at >= $1 GROUP BY platform',
				[startDate]
			)

			// Get country breakdown (top 10)
			const countryResult = await client.query(
				"SELECT COALESCE(country, 'Unknown') as country, COUNT(*) as count FROM downloads WHERE created_at >= $1 GROUP BY country ORDER BY count DESC LIMIT 10",
				[startDate]
			)

			// Get version breakdown
			const versionResult = await client.query(
				'SELECT version, COUNT(*) as count FROM downloads WHERE created_at >= $1 GROUP BY version ORDER BY count DESC',
				[startDate]
			)

			// Get daily trend
			const trendResult = await client.query(
				'SELECT DATE(created_at) as date, COUNT(*) as count FROM downloads WHERE created_at >= $1 GROUP BY DATE(created_at) ORDER BY date',
				[startDate]
			)

			const downloads = {
				total,
				by_platform: Object.fromEntries(
					platformResult.rows.map((row: PlatformRow) => [
						row.platform,
						parseInt(row.count)
					])
				),
				by_country: Object.fromEntries(
					countryResult.rows.map((row: CountryRow) => [row.country, parseInt(row.count)])
				),
				by_version: Object.fromEntries(
					versionResult.rows.map((row: VersionRow) => [row.version, parseInt(row.count)])
				),
				trend: trendResult.rows.map((row: TrendRow) => ({
					date: row.date,
					downloads: parseInt(row.count)
				}))
			}

			return NextResponse.json({ downloads })
		} finally {
			client.release()
		}
	} catch (error) {
		console.error('Failed to fetch stats:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
