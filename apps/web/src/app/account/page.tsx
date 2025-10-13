'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService, User } from '@/lib/auth-service'
import { Code2, ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function AccountSettingsPage() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('profile')
	const [formData, setFormData] = useState({
		email: '',
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
		deletePassword: ''
	})
	const [isUpdating, setIsUpdating] = useState(false)
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const router = useRouter()

	useEffect(() => {
		const checkAuth = async () => {
			const isAuthenticated = await authService.isAuthenticated()
			if (!isAuthenticated) {
				router.push('/auth/signin?callbackUrl=/account')
				return
			}

			const currentUser = await authService.getCurrentUser()
			if (currentUser) {
				setUser(currentUser)
				setFormData(prev => ({ ...prev, email: currentUser.email }))
			}
			setIsLoading(false)
		}
		checkAuth()
	}, [router])

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData(prev => ({
			...prev,
			[e.target.name]: e.target.value
		}))
	}

	const handleUpdateEmail = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsUpdating(true)
		setError('')
		setMessage('')

		if (formData.email === user?.email) {
			setError('New email must be different from current email')
			setIsUpdating(false)
			return
		}

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1'}/auth/email`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${authService.getToken()}`
				},
				body: JSON.stringify({
					new_email: formData.email,
					password: formData.currentPassword
				})
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to update email')
			}

			setMessage('Email updated successfully')
			setUser((prev: User | null) => prev ? { ...prev, email: formData.email } : prev)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update email')
		} finally {
			setIsUpdating(false)
		}
	}

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsUpdating(true)
		setError('')
		setMessage('')

		if (formData.newPassword !== formData.confirmPassword) {
			setError('New passwords do not match')
			setIsUpdating(false)
			return
		}

		if (formData.newPassword.length < 8) {
			setError('New password must be at least 8 characters long')
			setIsUpdating(false)
			return
		}

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1'}/auth/password`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${authService.getToken()}`
				},
				body: JSON.stringify({
					current_password: formData.currentPassword,
					new_password: formData.newPassword
				})
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to update password')
			}

			setMessage('Password updated successfully')
			setFormData(prev => ({
				...prev,
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			}))
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update password')
		} finally {
			setIsUpdating(false)
		}
	}

	const handleDeleteAccount = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
			return
		}

		setIsUpdating(true)
		setError('')
		setMessage('')

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1'}/auth/account`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${authService.getToken()}`
				},
				body: JSON.stringify({
					password: formData.deletePassword
				})
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Failed to delete account')
			}

			await authService.logout()
			router.push('/')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete account')
		} finally {
			setIsUpdating(false)
		}
	}

	const handleLogout = async () => {
		await authService.logout()
		router.push('/')
	}

	if (isLoading) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600'></div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			<header className='border-b bg-white'>
				<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<Code2 className='h-8 w-8 text-blue-600' />
						<span className='text-2xl font-bold'>CodePulse</span>
					</div>
					<div className='flex items-center gap-4'>
						<Link
							href='/'
							className='text-gray-600 hover:text-gray-900 transition'
						>
							<ArrowLeft className='h-6 w-6' />
						</Link>
						<button
							onClick={handleLogout}
							className='text-gray-600 hover:text-gray-900 transition'
						>
							Logout
						</button>
					</div>
				</div>
			</header>

			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-4xl mx-auto'>
					<h1 className='text-3xl font-bold mb-8'>Account Settings</h1>

					<div className='bg-white rounded-lg border shadow-sm'>
						<div className='border-b'>
							<nav className='flex'>
								<button
									onClick={() => setActiveTab('profile')}
									className={`px-6 py-4 font-medium ${
										activeTab === 'profile'
											? 'border-b-2 border-blue-600 text-blue-600'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									Profile
								</button>
								<button
									onClick={() => setActiveTab('security')}
									className={`px-6 py-4 font-medium ${
										activeTab === 'security'
											? 'border-b-2 border-blue-600 text-blue-600'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									Security
								</button>
								<button
									onClick={() => setActiveTab('danger')}
									className={`px-6 py-4 font-medium ${
										activeTab === 'danger'
											? 'border-b-2 border-red-600 text-red-600'
											: 'text-gray-600 hover:text-gray-900'
									}`}
								>
									Danger Zone
								</button>
							</nav>
						</div>

						<div className='p-6'>
							{activeTab === 'profile' && (
								<div>
									<h2 className='text-xl font-semibold mb-4'>Profile Information</h2>
									<div className='space-y-4'>
										<div>
											<label className='block text-sm font-medium text-gray-700 mb-1'>
												Username
											</label>
											<p className='text-gray-900'>{user?.handle}</p>
										</div>
										<div>
											<label className='block text-sm font-medium text-gray-700 mb-1'>
												Email
											</label>
											<p className='text-gray-900'>{user?.email}</p>
										</div>
									</div>
								</div>
							)}

							{activeTab === 'security' && (
								<div className='space-y-8'>
									<div>
										<h2 className='text-xl font-semibold mb-4'>Change Email</h2>
										<form onSubmit={handleUpdateEmail} className='space-y-4'>
											<div>
												<label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1'>
													New Email Address
												</label>
												<input
													id='email'
													name='email'
													type='email'
													required
													value={formData.email}
													onChange={handleInputChange}
													className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500'
												/>
											</div>
											<div>
												<label htmlFor='currentPassword' className='block text-sm font-medium text-gray-700 mb-1'>
													Current Password
												</label>
												<input
													id='currentPassword'
													name='currentPassword'
													type='password'
													required
													value={formData.currentPassword}
													onChange={handleInputChange}
													className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500'
												/>
											</div>
											<button
												type='submit'
												disabled={isUpdating}
												className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50'
											>
												{isUpdating ? 'Updating...' : 'Update Email'}
											</button>
										</form>
									</div>

									<div>
										<h2 className='text-xl font-semibold mb-4'>Change Password</h2>
										<form onSubmit={handleUpdatePassword} className='space-y-4'>
											<div>
												<label htmlFor='currentPassword' className='block text-sm font-medium text-gray-700 mb-1'>
													Current Password
												</label>
												<input
													id='currentPassword'
													name='currentPassword'
													type='password'
													required
													value={formData.currentPassword}
													onChange={handleInputChange}
													className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500'
												/>
											</div>
											<div>
												<label htmlFor='newPassword' className='block text-sm font-medium text-gray-700 mb-1'>
													New Password
												</label>
												<input
													id='newPassword'
													name='newPassword'
													type='password'
													required
													value={formData.newPassword}
													onChange={handleInputChange}
													className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500'
												/>
											</div>
											<div>
												<label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700 mb-1'>
													Confirm New Password
												</label>
												<input
													id='confirmPassword'
													name='confirmPassword'
													type='password'
													required
													value={formData.confirmPassword}
													onChange={handleInputChange}
													className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500'
												/>
											</div>
											<button
												type='submit'
												disabled={isUpdating}
												className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50'
											>
												{isUpdating ? 'Updating...' : 'Update Password'}
											</button>
										</form>
									</div>
								</div>
							)}

							{activeTab === 'danger' && (
								<div>
									<h2 className='text-xl font-semibold mb-4 text-red-600'>Danger Zone</h2>
									<div className='border border-red-200 rounded-md p-4'>
										<h3 className='font-medium mb-2'>Delete Account</h3>
										<p className='text-sm text-gray-600 mb-4'>
											Once you delete your account, there is no going back. Please be certain.
										</p>
										<form onSubmit={handleDeleteAccount} className='space-y-4'>
											<div>
												<label htmlFor='deletePassword' className='block text-sm font-medium text-gray-700 mb-1'>
													Confirm Password
												</label>
												<input
													id='deletePassword'
													name='deletePassword'
													type='password'
													required
													value={formData.deletePassword}
													onChange={handleInputChange}
													className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500'
												/>
											</div>
											<button
												type='submit'
												disabled={isUpdating}
												className='bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2'
											>
												<Trash2 className='h-4 w-4' />
												{isUpdating ? 'Deleting...' : 'Delete Account'}
											</button>
										</form>
									</div>
								</div>
							)}

							{message && (
								<div className='mt-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md'>
									{message}
								</div>
							)}

							{error && (
								<div className='mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md'>
									{error}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
