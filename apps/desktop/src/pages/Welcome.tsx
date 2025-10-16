import { useCallback, useEffect, useState } from 'react'
import { Code2, ArrowRight, User, FolderOpen, ShieldCheck, Sparkles } from 'lucide-react'
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
	const [hoveringAnalyze, setHoveringAnalyze] = useState(false)

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				onContinueWithoutAccount()
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [onContinueWithoutAccount])

	const handleAnalyze = useCallback(() => {
		onContinueWithoutAccount()
	}, [onContinueWithoutAccount])

	return (
		<div className='relative min-h-screen w-screen flex flex-col'>
			{/* Decorative background */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background'
			/>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute h-full w-full rounded-full bg-primary/10 blur-3xl opacity-20'
			/>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute h-full w-full rounded-full bg-primary/10 blur-3xl opacity-10'
			/>

			{/* Header */}
			<header className='relative z-10 flex items-center justify-between max-w-5xl w-full mx-auto px-6 py-5'>
				<div className='flex items-center gap-3 group'>
					<div className='w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-sm ring-1 ring-primary/30 group-hover:scale-105 transition-transform'>
						<Code2 className='h-5 w-5 text-primary-foreground' />
					</div>
					<h1 className='text-2xl font-bold tracking-tight'>
						<span className='bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
							CodePulse
						</span>
					</h1>
				</div>
				<Button variant='ghost' onClick={onContinueWithAccount} className='gap-2'>
					<User className='h-4 w-4' />
					Sign in
				</Button>
			</header>

			{/* Main Content */}
			<main className='relative z-10 flex-1 flex items-center justify-center px-6 pb-16'>
				<div className='w-full max-w-3xl'>
					{/* Hero */}
					<div className='text-center mb-12 space-y-5'>
						<div className='inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/20'>
							<Sparkles className='h-3.5 w-3.5' />
							Local & privacy-first analysis
						</div>
						<h2 className='text-4xl font-semibold tracking-tight leading-tight'>
							Understand your code. <br className='hidden sm:block' />
							<span className='text-primary'>Locally.</span> Effortlessly.
						</h2>
						<p className='text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
							CodePulse inspects your project locally. Your source never leaves your
							machine. Start an analysis right now, and sign in later if you want
							syncing or enhanced dashboards.
						</p>
					</div>

					{/* Action Cards */}
					<div className='grid gap-8 lg:gap-10 md:grid-cols-2'>
						{/* Analyze Card */}
						<Card className='relative overflow-hidden border-primary/30 hover:border-primary/60 transition-colors group focus-within:border-primary rounded-md border'>
							<div
								aria-hidden='true'
								className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-transparent to-transparent'
							/>
							<CardHeader className='pb-4 relative'>
								<CardTitle className='flex items-center gap-2 text-xl'>
									<FolderOpen className='h-5 w-5 text-primary' />
									Analyze a folder
								</CardTitle>
								<CardDescription className='leading-relaxed'>
									Pick a folder to instantly get metrics and an overview of its
									structure and code.
								</CardDescription>
							</CardHeader>
							<CardContent className='flex flex-col gap-4 pt-0 relative'>
								<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
									<span className='inline-flex items-center gap-1 rounded bg-muted px-2 py-1'>
										<ShieldCheck className='h-3 w-3 text-primary' />
										Local only
									</span>
									<span className='inline-flex items-center gap-1 rounded bg-muted px-2 py-1'>
										<ArrowRight className='h-3 w-3 text-primary' />
										No account required
									</span>
									<span className='inline-flex items-center gap-1 rounded bg-muted px-2 py-1'>
										<Code2 className='h-3 w-3 text-primary' />
										Fast results
									</span>
								</div>
								<Button
									size='lg'
									className='w-full gap-2'
									onClick={handleAnalyze}
									onMouseEnter={() => setHoveringAnalyze(true)}
									onMouseLeave={() => setHoveringAnalyze(false)}
								>
									Start analysis
									<ArrowRight
										className={`h-4 w-4 transition-transform ${
											hoveringAnalyze ? 'translate-x-1' : ''
										}`}
									/>
								</Button>
								<p className='text-xs text-muted-foreground text-center'>
									Tip: press{' '}
									<kbd className='px-1 py-0.5 bg-muted rounded'>Enter</kbd> to
									launch immediately.
								</p>
							</CardContent>
						</Card>

						{/* Sign In Card */}
						<Card className='relative overflow-hidden border border-border/70 hover:border-primary/50 transition-colors group rounded-md'>
							<div
								aria-hidden='true'
								className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-transparent to-transparent'
							/>
							<CardHeader className='pb-4 relative'>
								<CardTitle className='flex items-center gap-2 text-xl'>
									<User className='h-5 w-5 text-primary' />
									Sign in
								</CardTitle>
								<CardDescription className='leading-relaxed'>
									Unlock multi-device sync, enriched dashboards and personalized
									insights.
								</CardDescription>
							</CardHeader>
							<CardContent className='flex flex-col gap-4 pt-0 relative'>
								<ul className='text-sm space-y-2 text-muted-foreground'>
									<li className='flex gap-2'>
										<span className='text-primary'>•</span> Sync whenever you
										want
									</li>
									<li className='flex gap-2'>
										<span className='text-primary'>•</span> Consolidated
										statistics
									</li>
									<li className='flex gap-2'>
										<span className='text-primary'>•</span> Personalized project
										context
									</li>
								</ul>
								<Button
									variant='outline'
									size='lg'
									className='w-full gap-2'
									onClick={onContinueWithAccount}
								>
									<User className='h-4 w-4' />
									Sign in
								</Button>
								<p className='text-xs text-muted-foreground text-center'>
									You can also sign in later from the top-right corner.
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Trust Note */}
					<div className='mt-10 text-center text-xs md:text-sm text-muted-foreground space-y-1'>
						<p>
							CodePulse does not send your source code to remote servers during local
							analysis.
						</p>
						<p>
							When you sign in, only the metadata needed for syncing is transmitted.
						</p>
					</div>
				</div>
			</main>
		</div>
	)
}
