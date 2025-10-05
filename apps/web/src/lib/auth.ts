/**
 * Simple Basic Auth for admin dashboard
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
