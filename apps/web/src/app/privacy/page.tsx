import { Code2 } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
	return (
		<div className='min-h-screen bg-background'>
			<header className='border-b'>
				<div className='container mx-auto px-4 py-4'>
					<Link href='/' className='flex items-center gap-2 hover:opacity-80 transition'>
						<Code2 className='h-6 w-6 text-primary' />
						<span className='text-xl font-bold'>CodePulse</span>
					</Link>
				</div>
			</header>

			<main className='container mx-auto px-4 py-16 max-w-4xl'>
				<h1 className='text-4xl font-bold mb-8'>Privacy Policy</h1>

				<div className='prose prose-slate max-w-none'>
					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Our Commitment to Privacy</h2>
						<p className='text-muted-foreground mb-4'>
							CodePulse is built with privacy at its core. We believe your code and
							data should remain yours, always.
						</p>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>What We DON'T Collect</h2>
						<ul className='list-disc list-inside space-y-2 text-muted-foreground'>
							<li>
								<strong>Your source code</strong>: All code analysis happens locally
								on your machine. Your code never touches our servers.
							</li>
							<li>
								<strong>IP addresses</strong>: We never store raw IP addresses. Any
								IP information is immediately hashed with a salt before storage.
							</li>
							<li>
								<strong>Personal information</strong>: No accounts, no emails, no
								tracking cookies.
							</li>
							<li>
								<strong>Browsing behavior</strong>: We don't use analytics trackers
								or third-party scripts on this website.
							</li>
						</ul>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>What We DO Collect</h2>
						<p className='text-muted-foreground mb-4'>
							When you download CodePulse, we collect minimal aggregate statistics to
							understand usage:
						</p>
						<ul className='list-disc list-inside space-y-2 text-muted-foreground'>
							<li>
								<strong>Hashed IP</strong>: A SHA-256 hash of your IP + random salt
								(impossible to reverse)
							</li>
							<li>
								<strong>Geographic region</strong>: Country, region, and city (from
								CDN headers)
							</li>
							<li>
								<strong>Platform</strong>: macOS, Windows, or Linux
							</li>
							<li>
								<strong>Version</strong>: Which version of CodePulse you downloaded
							</li>
							<li>
								<strong>User agent</strong>: Browser information (to detect download
								issues)
							</li>
							<li>
								<strong>Referrer</strong>: Where you came from (to understand how
								people find us)
							</li>
						</ul>
						<p className='text-muted-foreground mt-4'>
							This data is used exclusively for aggregate statistics and to improve
							the product. We never sell or share this data with third parties.
						</p>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Desktop App Privacy</h2>
						<p className='text-muted-foreground mb-4'>
							The CodePulse desktop application operates completely offline:
						</p>
						<ul className='list-disc list-inside space-y-2 text-muted-foreground'>
							<li>No network requests are made</li>
							<li>No telemetry or crash reporting</li>
							<li>No automatic updates checking (manual updates only)</li>
							<li>
								All file system access is read-only and scoped to your selected
								folders
							</li>
						</ul>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Data Retention</h2>
						<p className='text-muted-foreground'>
							Download statistics are retained for analytical purposes. Since all data
							is anonymized and hashed, there's no way to link records back to
							individuals.
						</p>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Third-Party Services</h2>
						<p className='text-muted-foreground mb-4'>We use the following services:</p>
						<ul className='list-disc list-inside space-y-2 text-muted-foreground'>
							<li>
								<strong>Vercel</strong>: Website hosting and CDN (provides
								geographic headers)
							</li>
							<li>
								<strong>Supabase</strong>: Database for download statistics
								(self-hosted option available)
							</li>
							<li>
								<strong>GitHub</strong>: Source code hosting and release
								distribution
							</li>
						</ul>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Open Source</h2>
						<p className='text-muted-foreground'>
							CodePulse is fully open source. You can audit our code, self-host the
							entire stack, or build it yourself. Transparency is our guarantee.
						</p>
					</section>

					<section className='mb-8'>
						<h2 className='text-2xl font-semibold mb-4'>Contact</h2>
						<p className='text-muted-foreground'>
							Questions about privacy? Open an issue on our{' '}
							<a
								href='https://github.com/username/codepulse'
								className='text-primary hover:underline'
							>
								GitHub repository
							</a>
							.
						</p>
					</section>

					<p className='text-sm text-muted-foreground mt-12'>
						Last updated: {new Date().toLocaleDateString()}
					</p>
				</div>
			</main>
		</div>
	)
}
