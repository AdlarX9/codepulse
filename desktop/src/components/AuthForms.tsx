import { useState } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { API_BASE } from '../lib/api'

// Types locaux temporairement définis ici
interface LoginCredentials {
	email: string
	password: string
}

interface RegisterData {
	email: string
	password: string
	handle: string
}

interface User {
	id: string
	email: string
	name?: string
	image?: string
	isAdmin?: boolean
	createdAt: string
	updatedAt: string
	profile?: {
		id: string
		handle: string
		visibility: string
	}
}

interface AuthResponse {
	success: boolean
	message?: string
	user?: User
	token?: string
}

interface AuthService {
	login(credentials: LoginCredentials): Promise<AuthResponse>
	register(data: RegisterData): Promise<AuthResponse>
	logout(): Promise<void>
	getCurrentUser(): Promise<User | null>
	isAuthenticated(): boolean
}

class ApiAuthService implements AuthService {
	private apiUrl: string
	private token: string | null = null

	constructor(apiUrl: string = API_BASE) {
		this.apiUrl = apiUrl
		// Try to load token from localStorage
		this.token = localStorage.getItem('auth-token')
	}

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		try {
			const response = await fetch(`${this.apiUrl}/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(credentials)
			})

			const data = await response.json()

			if (response.ok && data.token) {
				this.token = data.token
				localStorage.setItem('auth-token', data.token)

				return {
					success: true,
					user: data.user,
					token: data.token
				}
			} else {
				return {
					success: false,
					message: data.error || 'Login failed'
				}
			}
		} catch (error) {
			console.error('Login error:', error)
			return {
				success: false,
				message: 'Network error occurred'
			}
		}
	}

	async register(data: RegisterData): Promise<AuthResponse> {
		try {
			const response = await fetch(`${this.apiUrl}/auth/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			})

			const responseData = await response.json()

			if (response.ok && responseData.token) {
				this.token = responseData.token
				localStorage.setItem('auth-token', responseData.token)

				return {
					success: true,
					user: responseData.user,
					token: responseData.token
				}
			} else {
				return {
					success: false,
					message: responseData.error || 'Registration failed'
				}
			}
		} catch (error) {
			console.error('Registration error:', error)
			return {
				success: false,
				message: 'Network error occurred'
			}
		}
	}

	async logout(): Promise<void> {
		try {
			if (this.token) {
				await fetch(`${this.apiUrl}/auth/logout`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${this.token}`
					}
				})
			}
		} catch (error) {
			console.error('Logout error:', error)
		} finally {
			this.token = null
			localStorage.removeItem('auth-token')
		}
	}

	async getCurrentUser(): Promise<User | null> {
		if (!this.token) {
			return null
		}

		try {
			const response = await fetch(`${this.apiUrl}/auth/me`, {
				headers: {
					Authorization: `Bearer ${this.token}`
				}
			})

			if (response.ok) {
				const data = await response.json()
				return data.user
			} else {
				// Token might be invalid, clear it
				this.token = null
				localStorage.removeItem('auth-token')
				return null
			}
		} catch (error) {
			console.error('Get current user error:', error)
			return null
		}
	}

	isAuthenticated(): boolean {
		return this.token !== null
	}
}

function createAuthService(): AuthService {
	return new ApiAuthService()
}

interface AuthFormProps {
	onSuccess: (user: User, token: string) => void
}

export function LoginForm({ onSuccess }: AuthFormProps) {
	const [credentials, setCredentials] = useState<LoginCredentials>({
		email: '',
		password: ''
	})
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const authService = createAuthService()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			const result = await authService.login(credentials)
			if (result.success && result.user && result.token) {
				onSuccess(result.user, result.token)
			} else {
				setError(result.message || 'Login failed')
			}
		} catch (err) {
			setError('An error occurred during login')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='w-full max-w-md mx-auto'>
			<CardHeader className='space-y-1'>
				<CardTitle className='text-2xl text-center'>Sign In</CardTitle>
				<CardDescription className='text-center'>
					Enter your credentials to access your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<label htmlFor='email' className='text-sm font-medium'>
							Email
						</label>
						<input
							id='email'
							type='email'
							placeholder='demo@codepulse.app'
							value={credentials.email}
							onChange={e =>
								setCredentials((prev: LoginCredentials) => ({
									...prev,
									email: e.target.value
								}))
							}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
						/>
					</div>
					<div className='space-y-2'>
						<label htmlFor='password' className='text-sm font-medium'>
							Password
						</label>
						<input
							id='password'
							type='password'
							placeholder='demo'
							value={credentials.password}
							onChange={e =>
								setCredentials((prev: LoginCredentials) => ({
									...prev,
									password: e.target.value
								}))
							}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
						/>
					</div>
					{error && (
						<div className='text-sm text-red-600 bg-red-50 p-2 rounded'>{error}</div>
					)}
					<Button type='submit' className='w-full' disabled={isLoading}>
						{isLoading ? 'Signing In...' : 'Sign In'}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}

export function RegisterForm({ onSuccess }: AuthFormProps) {
	const [formData, setFormData] = useState<RegisterData>({
		email: '',
		password: '',
		handle: ''
	})
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const authService = createAuthService()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError(null)

		try {
			const result = await authService.register(formData)
			if (result.success && result.user && result.token) {
				onSuccess(result.user, result.token)
			} else {
				setError(result.message || 'Registration failed')
			}
		} catch (err) {
			setError('An error occurred during registration')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Card className='w-full max-w-md mx-auto'>
			<CardHeader className='space-y-1'>
				<CardTitle className='text-2xl text-center'>Create Account</CardTitle>
				<CardDescription className='text-center'>
					Enter your information to create your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className='space-y-4'>
					<div className='space-y-2'>
						<label htmlFor='handle' className='text-sm font-medium'>
							Username
						</label>
						<input
							id='handle'
							type='text'
							placeholder='your-username'
							value={formData.handle}
							onChange={e =>
								setFormData((prev: RegisterData) => ({
									...prev,
									handle: e.target.value
								}))
							}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
							minLength={3}
							maxLength={50}
						/>
					</div>
					<div className='space-y-2'>
						<label htmlFor='email' className='text-sm font-medium'>
							Email
						</label>
						<input
							id='email'
							type='email'
							placeholder='your@email.com'
							value={formData.email}
							onChange={e =>
								setFormData((prev: RegisterData) => ({
									...prev,
									email: e.target.value
								}))
							}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
						/>
					</div>
					<div className='space-y-2'>
						<label htmlFor='password' className='text-sm font-medium'>
							Password
						</label>
						<input
							id='password'
							type='password'
							placeholder='Password'
							value={formData.password}
							onChange={e =>
								setFormData((prev: RegisterData) => ({
									...prev,
									password: e.target.value
								}))
							}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
						/>
					</div>
					{error && (
						<div className='text-sm text-red-600 bg-red-50 p-2 rounded'>{error}</div>
					)}
					<Button type='submit' className='w-full' disabled={isLoading}>
						{isLoading ? 'Creating Account...' : 'Create Account'}
					</Button>
				</form>
			</CardContent>
		</Card>
	)
}
