'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/lib/auth-service'
import { Code2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function SignInPageContent({
	callbackUrl,
	deviceCode
}: {
	callbackUrl: string
	deviceCode?: string | null
}) {
	const [formData, setFormData] = useState({ email: '', password: '' })
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const router = useRouter()

	useEffect(() => {
		const checkAuth = async () => {
			const isAuthenticated = await authService.isAuthenticated()
			if (isAuthenticated) {
				router.push(callbackUrl as any)
			}
		}
		checkAuth()
	}, [router, callbackUrl])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError('')

		try {
			await authService.signIn(formData.email, formData.password)
			// Device login completion for desktop app, if requested
			if (deviceCode) {
				try {
					await fetch(
						`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/device/complete`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${authService.getToken()}`
							},
							body: JSON.stringify({ code: deviceCode })
						}
					)
				} catch {}
			}
			router.push(callbackUrl as any)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Sign in failed')
		} finally {
			setIsLoading(false)
		}
	}

	const handleForgotPassword = async () => {
		const email = prompt('Enter your email address:')
		if (!email) return

		try {
			await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1'}/auth/forgot-password`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ email })
				}
			)
			alert('If the email exists, a reset link has been sent')
		} catch (err) {
			alert('Failed to send reset email')
		}
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData(prev => ({
			...prev,
			[e.target.name]: e.target.value
		}))
	}

	return (
		<div className='min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center'>
			<div className='max-w-md w-full space-y-8 p-8'>
				<div className='text-center'>
					<Link
						href='/'
						className='inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4'
					>
						<ArrowLeft className='h-4 w-4' />
						Back to Home
					</Link>
					<div className='flex items-center justify-center gap-2 mb-4'>
						<Code2 className='h-8 w-8 text-blue-600' />
						<span className='text-2xl font-bold'>CodePulse</span>
					</div>
					<h2 className='text-3xl font-bold text-gray-900'>Welcome Back</h2>
					<p className='mt-2 text-gray-600'>
						Sign in to sync your projects across devices
					</p>
				</div>

				<form onSubmit={handleSubmit} className='space-y-6'>
					{error && (
						<div className='bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md'>
							{error}
						</div>
					)}

					<div>
						<label htmlFor='email' className='block text-sm font-medium text-gray-700'>
							Email address
						</label>
						<input
							id='email'
							name='email'
							type='email'
							required
							value={formData.email}
							onChange={handleChange}
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500'
							placeholder='Enter your email'
						/>
					</div>

					<div>
						<label
							htmlFor='password'
							className='block text-sm font-medium text-gray-700'
						>
							Password
						</label>
						<input
							id='password'
							name='password'
							type='password'
							required
							value={formData.password}
							onChange={handleChange}
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500'
							placeholder='Enter your password'
						/>
					</div>

					<button
						type='submit'
						disabled={isLoading}
						className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
					>
						{isLoading ? 'Signing in...' : 'Sign In'}
					</button>

					<div className='text-center'>
						<button
							type='button'
							onClick={handleForgotPassword}
							className='text-sm text-blue-600 hover:text-blue-700 font-medium'
						>
							Forgot your password?
						</button>
					</div>
				</form>

				<div className='text-center'>
					<p className='text-sm text-gray-600'>
						Don't have an account?{' '}
						<Link
							href='/auth/signup'
							className='text-blue-600 hover:text-blue-700 font-medium'
						>
							Create one here
						</Link>
					</p>
				</div>

				<div className='text-center text-xs text-gray-500'>
					<p>
						By signing in, you agree to sync your project data across devices.
						<br />
						We only store project metadata, never your source code.
					</p>
				</div>
			</div>
		</div>
	)
}

export default function SignInPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<SearchParamsHandler />
		</Suspense>
	)
}

function SearchParamsHandler() {
	const searchParams = useSearchParams()
	const callbackUrl: string = searchParams.get('callbackUrl') ?? '/'
	const deviceCode = searchParams.get('device_code')

	return <SignInPageContent callbackUrl={callbackUrl} deviceCode={deviceCode} />
}
