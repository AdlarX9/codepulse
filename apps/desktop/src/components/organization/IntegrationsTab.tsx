import { useState, useEffect } from 'react'
import { orgApi } from '../../lib/api-org'
import type { Integration, Subscription } from '../../types/organization'
import { Card } from '../ui/Card'
import { SimpleButton as Button } from '../ui/SimpleButton'
import { Badge } from '../ui/Badge'

// Prefer the dedicated shell API; fallback to window.open if not available (e.g., non-Tauri env)
let openExternal: (url: string) => Promise<void>
try {
	// Tauri v1
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const mod = require('@tauri-apps/api/shell') as { open: (url: string) => Promise<void> }
	openExternal = mod.open
} catch {
	openExternal = async (url: string) => {
		window.open(url, '_blank', 'noopener,noreferrer')
	}
}

interface IntegrationsTabProps {
	orgId: string
}

export default function IntegrationsTab({ orgId }: IntegrationsTabProps) {
	const [integrations, setIntegrations] = useState<Integration[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [subscription, setSubscription] = useState<Subscription | null>(null)
	const plan = subscription?.plan || 'free'

	useEffect(() => {
		void loadIntegrations()
		void loadSubscription()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [orgId])

	async function loadIntegrations() {
		try {
			setLoading(true)
			setError(null)
			const data = await orgApi.getIntegrations(orgId)

			// Robust shape handling: accept either an array or an object with an "integrations" array
			const list: Integration[] = Array.isArray(data)
				? data
				: Array.isArray((data as any)?.integrations)
					? (data as any).integrations
					: []

			setIntegrations(list)
		} catch (err) {
			console.error('Failed to load integrations:', err)
			setError(err instanceof Error ? err.message : 'Failed to load integrations')
			// Ensure state stays an array to avoid .find/.map crashes
			setIntegrations([])
		} finally {
			setLoading(false)
		}
	}

	async function loadSubscription() {
		try {
			const sub = await orgApi.getSubscription(orgId)
			setSubscription(sub)
		} catch (err) {
			console.error('Failed to load subscription:', err)
			setSubscription(null)
		}
	}

	async function handleConnectSlack() {
		try {
			const { auth_url } = await orgApi.connectSlack(orgId)
			if (!auth_url) throw new Error('No auth_url returned')
			await openExternal(auth_url)
		} catch (err) {
			console.error('Failed to connect Slack:', err)
			alert('Failed to start Slack connection')
		}
	}

	async function handleDisconnectSlack() {
		if (!confirm('Are you sure you want to disconnect Slack?')) return

		try {
			await orgApi.disconnectSlack(orgId)
			await loadIntegrations()
		} catch (err) {
			console.error('Failed to disconnect Slack:', err)
			alert('Failed to disconnect Slack')
		}
	}

	const slackIntegration = integrations.find(i => i.provider === 'slack')

	if (loading) {
		return <div className='text-center py-8'>Loading integrations...</div>
	}

	return (
		<div className='space-y-6'>
			{error && (
				<Card>
					<div className='p-6'>
						<div className='flex items-center gap-3 text-amber-600 mb-2'>
							<svg
								className='w-5 h-5'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
								/>
							</svg>
							<span className='font-semibold'>Unable to load integrations</span>
						</div>
						<p className='text-sm text-gray-600'>
							{error}. You can still configure integrations below.
						</p>
					</div>
				</Card>
			)}

			{/* Slack Integration */}
			<Card>
				<div className='p-6'>
					<div className='flex items-start gap-4'>
						<div className='flex-shrink-0'>
							<div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center'>
								<svg
									className='w-7 h-7 text-white'
									fill='currentColor'
									viewBox='0 0 24 24'
								>
									<path d='M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z' />
								</svg>
							</div>
						</div>
						<div className='flex-1'>
							<div className='flex items-center gap-3 mb-2'>
								<h3 className='text-lg font-semibold text-gray-900'>Slack</h3>
								{slackIntegration?.enabled && (
									<Badge variant='success'>Connected</Badge>
								)}
							</div>
							<p className='text-sm text-gray-600 mb-4'>
								Receive weekly quality digests and real-time alerts in your Slack
								workspace.
							</p>
							<ul className='text-sm text-gray-600 space-y-1 mb-4'>
								<li className='flex items-center gap-2'>
									<svg
										className='w-4 h-4 text-green-500'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M5 13l4 4L19 7'
										/>
									</svg>
									Weekly quality digest
								</li>
								<li className='flex items-center gap-2'>
									<svg
										className='w-4 h-4 text-green-500'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M5 13l4 4L19 7'
										/>
									</svg>
									Policy violation alerts
								</li>
								<li className='flex items-center gap-2'>
									<svg
										className='w-4 h-4 text-green-500'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M5 13l4 4L19 7'
										/>
									</svg>
									PR check notifications
								</li>
							</ul>
							{slackIntegration?.enabled ? (
								<Button variant='secondary' onClick={handleDisconnectSlack}>
									Disconnect Slack
								</Button>
							) : plan === 'free' ? (
								<div className='flex items-center gap-3'>
									<Button variant='secondary' disabled>
										Connect to Slack (Pro+)
									</Button>
									<Button
										onClick={async () => {
											try {
												const { checkout_url } =
													await orgApi.createCheckoutSession(orgId, {
														plan: 'pro',
														seats: 1,
														success_url: window.location.href,
														cancel_url: window.location.href
													})
												await openExternal(checkout_url)
											} catch (e) {
												console.error('Upgrade failed:', e)
												alert('Failed to start upgrade')
											}
										}}
									>
										Upgrade
									</Button>
								</div>
							) : (
								<Button onClick={handleConnectSlack}>Connect to Slack</Button>
							)}
						</div>
					</div>
				</div>
			</Card>

			{/* GitHub Integration */}
			<Card>
				<div className='p-6'>
					<div className='flex items-start gap-4'>
						<div className='flex-shrink-0'>
							<div className='w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center'>
								<svg
									className='w-7 h-7 text-white'
									fill='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										fillRule='evenodd'
										d='M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z'
										clipRule='evenodd'
									/>
								</svg>
							</div>
						</div>
						<div className='flex-1'>
							<div className='flex items-center gap-3 mb-2'>
								<h3 className='text-lg font-semibold text-gray-900'>GitHub App</h3>
								<Badge variant='default'>App-based</Badge>
							</div>
							<p className='text-sm text-gray-600 mb-4'>
								Connect your GitHub repositories to enable automated PR checks and
								webhook integration.
							</p>
							<ul className='text-sm text-gray-600 space-y-1 mb-4'>
								<li className='flex items-center gap-2'>
									<svg
										className='w-4 h-4 text-green-500'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M5 13l4 4L19 7'
										/>
									</svg>
									Automated PR quality checks
								</li>
								<li className='flex items-center gap-2'>
									<svg
										className='w-4 h-4 text-green-500'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M5 13l4 4L19 7'
										/>
									</svg>
									Real-time webhook events
								</li>
								<li className='flex items-center gap-2'>
									<svg
										className='w-4 h-4 text-green-500'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M5 13l4 4L19 7'
										/>
									</svg>
									Commit status reporting
								</li>
							</ul>
							<p className='text-sm text-gray-600 mb-4'>
								See the <strong>Repositories</strong> tab to manage connected
								repositories.
							</p>
						</div>
					</div>
				</div>
			</Card>
		</div>
	)
}
