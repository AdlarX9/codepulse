import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { SimpleButton as Button } from '../ui/SimpleButton'
import type { Subscription } from '../../types/organization'
import { orgApi } from '../../lib/api-org'

let openExternal: (url: string) => Promise<void>
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const mod = require('@tauri-apps/api/shell') as { open: (url: string) => Promise<void> }
	openExternal = mod.open
} catch {
	openExternal = async (url: string) => {
		window.open(url, '_blank', 'noopener,noreferrer')
	}
}

interface RepositoriesTabProps {
	orgId: string
}

export default function RepositoriesTab({ orgId }: RepositoriesTabProps) {
	const [subscription, setSubscription] = useState<Subscription | null>(null)
	const plan = subscription?.plan || 'free'

	useEffect(() => {
		void (async () => {
			try {
				const sub = await orgApi.getSubscription(orgId)
				setSubscription(sub)
			} catch {
				setSubscription(null)
			}
		})()
	}, [orgId])

	async function handleInstallGithubApp() {
		if (plan === 'free') return
		await openExternal('https://github.com/apps/codepulse-quality/installations/new')
	}

	async function handleUpgrade() {
		try {
			const { checkout_url } = await orgApi.createCheckoutSession(orgId, {
				plan: 'pro',
				seats: 1,
				success_url: window.location.href,
				cancel_url: window.location.href
			})
			await openExternal(checkout_url)
		} catch (e) {
			alert('Failed to start upgrade')
		}
	}

	return (
		<Card>
			<div className='p-6'>
				<div className='flex items-center justify-between mb-6'>
					<div>
						<h3 className='text-lg font-semibold text-gray-900'>
							Connected Repositories
						</h3>
						<p className='text-sm text-gray-600 mt-1'>
							Manage GitHub repositories linked to this organization
						</p>
					</div>
					<Button onClick={plan === 'free' ? handleUpgrade : handleInstallGithubApp}>
						<svg className='w-5 h-5 mr-2' fill='currentColor' viewBox='0 0 24 24'>
							<path
								fillRule='evenodd'
								d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
								clipRule='evenodd'
							/>
						</svg>
						{plan === 'free' ? 'Upgrade to Connect GitHub App' : 'Connect GitHub App'}
					</Button>
				</div>

				<div className='text-center py-12'>
					<div className='mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
						<svg
							className='w-8 h-8 text-gray-400'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
							/>
						</svg>
					</div>
					<h3 className='text-lg font-medium text-gray-900 mb-2'>
						No Repositories Connected
					</h3>
					<p className='text-gray-600 mb-6 max-w-md mx-auto'>
						Connect the CodePulse GitHub App to enable PR checks and automated quality
						scans for your repositories.
					</p>
					<div className='flex flex-col items-center gap-4'>
						<Button onClick={plan === 'free' ? handleUpgrade : handleInstallGithubApp}>
							{plan === 'free' ? 'Upgrade to Install' : 'Install GitHub App'}
						</Button>
						<a
							href='https://docs.codepulse.dev/github-integration'
							target='_blank'
							rel='noopener noreferrer'
							className='text-sm text-blue-600 hover:text-blue-800'
						>
							Learn more about GitHub integration →
						</a>
					</div>
				</div>
			</div>
		</Card>
	)
}
