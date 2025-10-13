'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth-service'
import { Code2, LogIn, User, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function Header() {
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const checkAuth = async () => {
			const authenticated = await authService.isAuthenticated()
			setIsAuthenticated(authenticated)
			setIsLoading(false)
		}
		checkAuth()
	}, [])

	const handleLogout = async () => {
		await authService.logout()
		setIsAuthenticated(false)
		window.location.reload() // Refresh to update state
	}

	if (isLoading) {
		return (
			<header className='border-b bg-white'>
				<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<Code2 className='h-8 w-8 text-blue-600' />
						<span className='text-2xl font-bold'>CodePulse</span>
					</div>
				</div>
			</header>
		)
	}

	return (
		<header className='border-b bg-white'>
			<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
				<Link href='/' className='flex items-center gap-2'>
					<Code2 className='h-8 w-8 text-blue-600' />
					<span className='text-2xl font-bold'>CodePulse</span>
				</Link>
				<div className='flex items-center gap-4'>
					{isAuthenticated ? (
						<>
							<Link
								href='/account'
								className='text-gray-600 hover:text-gray-900 transition flex items-center gap-2'
							>
								<Settings className='h-6 w-6' />
								<span className='hidden sm:inline'>Account</span>
							</Link>
							<button
								onClick={handleLogout}
								className='text-gray-600 hover:text-gray-900 transition flex items-center gap-2'
							>
								<LogOut className='h-6 w-6' />
								<span className='hidden sm:inline'>Logout</span>
							</button>
						</>
					) : (
						<>
							<Link
								href='/auth/signin'
								className='text-gray-600 hover:text-gray-900 transition flex items-center gap-2'
							>
								<LogIn className='h-6 w-6' />
								<span className='hidden sm:inline'>Sign In</span>
							</Link>
							<Link
								href='/auth/signup'
								className='text-gray-600 hover:text-gray-900 transition flex items-center gap-2'
							>
								<User className='h-6 w-6' />
								<span className='hidden sm:inline'>Sign Up</span>
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	)
}
