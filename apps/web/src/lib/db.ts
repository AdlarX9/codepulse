import { Pool } from 'pg'

// Create PostgreSQL connection pool
const pool = new Pool({
	host: process.env.POSTGRES_HOST || 'localhost',
	port: parseInt(process.env.POSTGRES_PORT || '5432'),
	database: process.env.POSTGRES_DB || 'codepulse',
	user: process.env.POSTGRES_USER || 'postgres',
	password: process.env.POSTGRES_PASSWORD || 'postgres',
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000
})

// Test connection on startup
pool.on('connect', () => {
	console.log('✅ Connected to PostgreSQL database')
})

pool.on('error', (err: Error) => {
	console.error('❌ Unexpected error on idle PostgreSQL client', err)
	process.exit(-1)
})

export default pool
