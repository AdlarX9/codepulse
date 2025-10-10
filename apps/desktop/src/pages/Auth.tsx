import { useState } from 'react'
import { LoginForm, RegisterForm } from '../components/AuthForms'

export default function AuthPage() {
	const [mode, setMode] = useState<'login' | 'register'>('login')

	return (
		<div className='min-h-screen bg-background flex items-center justify-center p-4'>
			<div className='w-full max-w-md'>
				<div className='text-center mb-8'>
					<h1 className='text-3xl font-bold'>Welcome to CodePulse</h1>
					<p className='text-muted-foreground mt-2'>
						Sign in to access your projects or create a new account
					</p>
				</div>

				{mode === 'login' ? (
					<LoginForm onSuccess={() => window.location.reload()} />
				) : (
					<RegisterForm onSuccess={() => window.location.reload()} />
				)}

				<div className='mt-6 text-center'>
					<p className='text-sm text-muted-foreground'>
						{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
						<button
							onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
							className='text-primary hover:underline font-medium'
						>
							{mode === 'login' ? 'Create account' : 'Sign in'}
						</button>
					</p>
				</div>
			</div>
		</div>
	)
}
