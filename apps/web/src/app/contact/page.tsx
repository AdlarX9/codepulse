import { Code2, Mail, MessageSquare, Github, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
	return (
		<div className='min-h-screen bg-background relative'>
			<header className='border-b'>
				<div className='container mx-auto px-4 py-4'>
					<div className='flex items-center gap-4'>
						<Link
							href='/'
							className='flex items-center gap-2 hover:opacity-80 transition'
						>
							<ArrowLeft className='h-5 w-5' />
							<span>Back to Home</span>
						</Link>
						<div className='h-4 w-px bg-border' />
						<div className='flex items-center gap-2'>
							<Code2 className='h-6 w-6 text-primary' />
							<span className='text-xl font-bold'>CodePulse</span>
						</div>
					</div>
				</div>
			</header>

			<main className='container mx-auto px-4 py-16 max-w-4xl'>
				<h1 className='text-4xl font-bold mb-8'>Contact Us</h1>

				<div className='prose prose-slate max-w-none'>
					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Get in Touch</h2>
						<p className='text-muted-foreground mb-6'>
							We're here to help! Whether you have questions about CodePulse, need
							support, want to contribute to the project, or wish to report a bug,
							we'd love to hear from you.
						</p>
						<p className='text-muted-foreground mb-6'>
							<strong>Bug reports</strong> are welcome! If you find an issue or have
							an idea for a new feature, don't hesitate to contact us directly.
						</p>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Ways to Reach Us</h2>
						<div className='grid md:grid-cols-2 gap-6'>
							{/* Email Contact */}
							<div className='bg-card rounded-lg border p-6'>
								<div className='flex items-center gap-3 mb-3'>
									<Mail className='h-6 w-6 text-primary' />
									<h3 className='text-lg font-semibold'>Email</h3>
								</div>
								<p className='text-muted-foreground mb-4'>
									For general inquiries, partnerships, or if you prefer direct
									communication.
								</p>
								{process.env.NEXT_ADMIN_EMAILS?.split(',')?.map(email => (
									<a
										key={email}
										href={`mailto:${email}`}
										className='text-primary hover:underline'
									>
										{email}
									</a>
								))}
							</div>
							{/* Instagram Contact */}
							<div className='bg-card rounded-lg border p-6'>
								<div className='flex items-center gap-3 mb-3'>
									{/* You can use an Instagram icon from lucide-react or any other icon set */}
									<svg
										className='h-6 w-6 text-primary'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<rect
											width='20'
											height='20'
											x='2'
											y='2'
											rx='5'
											stroke='currentColor'
											strokeWidth='2'
										/>
										<circle
											cx='12'
											cy='12'
											r='5'
											stroke='currentColor'
											strokeWidth='2'
										/>
										<circle cx='17' cy='7' r='1.5' fill='currentColor' />
									</svg>
									<h3 className='text-lg font-semibold'>Instagram</h3>
								</div>
								<p className='text-muted-foreground mb-4'>
									Follow us or send us a direct message on Instagram for updates,
									feature requests, or bug reports.
								</p>
								{process.env.NEXT_INSTAGRAM && (
									<a
										href={`https://instagram.com/${process.env.NEXT_INSTAGRAM.replace(/^@/, '')}`}
										className='text-primary hover:underline'
										target='_blank'
										rel='noopener noreferrer'
									>
										@{process.env.NEXT_INSTAGRAM.replace(/^@/, '')}
									</a>
								)}
							</div>
						</div>
					</section>
				</div>
			</main>

			<footer className='border-t w-screen absolute bottom-0'>
				<div className='container mx-auto px-4 py-8'>
					<div className='flex flex-col md:flex-row items-center justify-between gap-4'>
						<div className='flex items-center gap-2'>
							<Code2 className='h-6 w-6 text-primary' />
							<span className='font-semibold'>CodePulse</span>
						</div>
						<div className='flex items-center gap-6 text-sm text-muted-foreground'>
							<Link href='/privacy' className='hover:text-foreground transition'>
								Privacy Policy
							</Link>
							<Link href='/contact' className='hover:text-foreground transition'>
								Contact
							</Link>
							<a
								href='https://github.com/AdlarX9/code-pulse'
								target='_blank'
								rel='noopener noreferrer'
								className='hover:text-foreground transition'
							>
								GitHub
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
