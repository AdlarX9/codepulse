import { NextAuthOptions, DefaultSession } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from './supabase'

declare module 'next-auth' {
	interface Session extends DefaultSession {
		user: {
			id: string
			isAdmin?: boolean
		} & DefaultSession['user']
	}

	interface User {
		id: string
		isAdmin?: boolean
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		id: string
		isAdmin?: boolean
	}
}

export const authOptions: NextAuthOptions = {
	providers: [
		GitHubProvider({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!
		}),
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!
		})
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id
				// Check if user is admin
				const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
				token.isAdmin = adminEmails.includes(user.email || '')
			}
			return token
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.id = token.id
				session.user.isAdmin = token.isAdmin
			}
			return session
		},
		async signIn({ user, account, profile }) {
			if (account?.provider === 'github' && profile) {
				// Create or update profile with GitHub data
				try {
					const githubProfile = profile as any
					const { error } = await supabaseAdmin.from('profiles').upsert(
						{
							user_id: user.id,
							handle: githubProfile.login || user.email?.split('@')[0] || '',
							display_name: user.name || githubProfile.name || '',
							avatar_url: user.image || '',
							bio: githubProfile.bio || null,
							links: {
								github: `https://github.com/${githubProfile.login}`,
								...(githubProfile.blog && { website: githubProfile.blog }),
								...(githubProfile.twitter_username && {
									twitter: `https://twitter.com/${githubProfile.twitter_username}`
								})
							}
						},
						{
							onConflict: 'user_id'
						}
					)

					if (error) console.error('Profile upsert error:', error)
				} catch (error) {
					console.error('Profile creation error:', error)
				}
			}
			return true
		}
	},
	pages: {
		signIn: '/auth/signin',
		error: '/auth/error'
	},
	session: {
		strategy: 'jwt'
	}
}

/**
 * Simple Basic Auth for admin dashboard (fallback)
 */
export function checkBasicAuth(request: Request): boolean {
	const authHeader = request.headers.get('authorization')

	if (!authHeader || !authHeader.startsWith('Basic ')) {
		return false
	}

	const base64Credentials = authHeader.split(' ')[1]
	const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
	const [username, password] = credentials.split(':')

	const validUsername = process.env.NEXT_ADMIN_USER || 'admin'
	const validPassword = process.env.NEXT_ADMIN_PASS || 'admin'

	return username === validUsername && password === validPassword
}

export function createUnauthorizedResponse(): Response {
	return new Response('Unauthorized', {
		status: 401,
		headers: {
			'WWW-Authenticate': 'Basic realm="CodePulse Admin"'
		}
	})
}

// Auth helpers
export async function requireAuth(request: Request) {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		throw new Error('Unauthorized')
	}
	return session.user
}

export async function requireAdmin(request: Request) {
	const user = await requireAuth(request)
	if (!user.isAdmin) {
		throw new Error('Admin access required')
	}
	return user
}

// Import for server components
import { getServerSession } from 'next-auth'
