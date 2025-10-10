import { Code2, ArrowRight, User } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'

interface WelcomePageProps {
	onContinueWithAccount: () => void
	onContinueWithoutAccount: () => void
}

export default function WelcomePage({
	onContinueWithAccount,
	onContinueWithoutAccount
}: WelcomePageProps) {
	return (
		<div className='min-h-screen bg-background flex items-center justify-center p-4'>
			<div className='w-full max-w-2xl'>
				<div className='text-center mb-12'>
					<div className='flex items-center justify-center gap-3 mb-6'>
						<div className='w-16 h-16 bg-primary rounded-2xl flex items-center justify-center'>
							<Code2 className='h-8 w-8 text-primary-foreground' />
						</div>
						<h1 className='text-4xl font-bold'>CodePulse</h1>
					</div>
					<p className='text-xl text-muted-foreground max-w-lg mx-auto'>
						Beautiful, privacy-first code analysis for developers. Fast, powerful, and
						completely offline.
					</p>
				</div>

				<div className='grid gap-6 md:grid-cols-2 max-w-lg mx-auto'>
					<Card
						className='cursor-pointer hover:shadow-lg transition-shadow'
						onClick={onContinueWithoutAccount}
					>
						<CardHeader className='text-center pb-4'>
							<CardTitle className='text-2xl mb-2'>Start Analyzing</CardTitle>
							<CardDescription>
								Jump right into code analysis without creating an account
							</CardDescription>
						</CardHeader>
						<CardContent className='pt-0'>
							<Button className='w-full' size='lg' onClick={onContinueWithoutAccount}>
								Get Started
								<ArrowRight className='h-4 w-4 ml-2' />
							</Button>
						</CardContent>
					</Card>

					<Card
						className='cursor-pointer hover:shadow-lg transition-shadow'
						onClick={onContinueWithAccount}
					>
						<CardHeader className='text-center pb-4'>
							<CardTitle className='text-2xl mb-2'>Sign In</CardTitle>
							<CardDescription>
								Sync your projects across devices and access cloud features
							</CardDescription>
						</CardHeader>
						<CardContent className='pt-0'>
							<Button
								variant='outline'
								className='w-full'
								size='lg'
								onClick={onContinueWithAccount}
							>
								<User className='h-4 w-4 mr-2' />
								Sign In / Create Account
							</Button>
						</CardContent>
					</Card>
				</div>

				<div className='mt-8 text-center'>
					<p className='text-sm text-muted-foreground'>
						Choose how you'd like to get started with CodePulse
					</p>
				</div>
			</div>
		</div>
	)
}
