import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { LoginForm, RegisterForm } from '../components/AuthForms'

export default function AuthPage({
	onSuccess,
	onBack
}: {
	onSuccess: (user: any, token: string) => void
	onBack?: () => void
}) {
	const [mode, setMode] = useState<'login' | 'register'>('login')

	return (
		<div className='min-h-screen bg-background flex items-center justify-center p-4'>
			<div className='w-full max-w-md'>
				<div className='mb-4'>
					{onBack && (
						<Button variant='ghost' size='sm' onClick={onBack} className='mb-4'>
							<ArrowLeft className='h-4 w-4 mr-2' />
							Back to Welcome
						</Button>
					)}
				</div>
				<div className='text-center mb-8'>
					<h1 className='text-3xl font-bold'>Welcome to CodePulse</h1>
					<p className='text-muted-foreground mt-2'>
						Sign in to access your projects or create a new account
					</p>
				</div>

				{mode === 'login' ? (
					<LoginForm onSuccess={onSuccess} />
				) : (
					<RegisterForm onSuccess={onSuccess} />
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
