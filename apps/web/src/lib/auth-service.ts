export interface User {
	id: string
	email: string
	handle: string
	is_admin?: boolean
	created_at?: string
}

export interface AuthResponse {
	token: string
	user: User
}

export interface AuthError {
	error: string
}

class AuthService {
	private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1'

	async signIn(email: string, password: string): Promise<AuthResponse> {
		const response = await fetch(`${this.baseUrl}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, password })
		})

		if (!response.ok) {
			const error: AuthError = await response.json()
			throw new Error(error.error)
		}

		const data: AuthResponse = await response.json()

		// Store token in localStorage for client-side access
		localStorage.setItem('auth-token', data.token)

		return data
	}

	async signUp(email: string, password: string, handle: string): Promise<AuthResponse> {
		const response = await fetch(`${this.baseUrl}/auth/register`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, password, handle })
		})

		if (!response.ok) {
			const error: AuthError = await response.json()
			throw new Error(error.error)
		}

		const data: AuthResponse = await response.json()

		// Store token in localStorage for client-side access
		localStorage.setItem('auth-token', data.token)

		return data
	}

	async getCurrentUser(): Promise<User | null> {
		const token = localStorage.getItem('auth-token')

		if (!token) {
			return null
		}

		try {
			const response = await fetch(`${this.baseUrl}/auth/me`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			})

			if (!response.ok) {
				// Token might be expired, clear it
				localStorage.removeItem('auth-token')
				return null
			}

			const data: AuthResponse = await response.json()
			return data.user
		} catch {
			localStorage.removeItem('auth-token')
			return null
		}
	}

	async logout(): Promise<void> {
		localStorage.removeItem('auth-token')
	}

	async isAuthenticated(): Promise<boolean> {
		const user = await this.getCurrentUser()
		return user !== null
	}

	getToken(): string | null {
		return localStorage.getItem('auth-token')
	}
}

export const authService = new AuthService()
