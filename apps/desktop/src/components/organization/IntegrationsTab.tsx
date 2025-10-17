import { useState, useEffect } from 'react'
import { orgApi } from '../../lib/api-org'
import type { Integration } from '../../types/organization'
import { Card } from '../ui/Card'
import { SimpleButton as Button } from '../ui/SimpleButton'
import { Badge } from '../ui/Badge'
import { shell } from '@tauri-apps/api'

interface IntegrationsTabProps {
	orgId: string
}

export default function IntegrationsTab({ orgId }: IntegrationsTabProps) {
	const [integrations, setIntegrations] = useState<Integration[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadIntegrations()
	}, [orgId])

	async function loadIntegrations() {
		try {
			setLoading(true)
			const data = await orgApi.getIntegrations(orgId)
			setIntegrations(data)
		} catch (error) {
			console.error('Failed to load integrations:', error)
		} finally {
			setLoading(false)
		}
	}

	async function handleConnectSlack() {
		try {
			const { auth_url } = await orgApi.connectSlack(orgId)
			await shell.open(auth_url)
		} catch (error) {
			console.error('Failed to connect Slack:', error)
			alert('Failed to start Slack connection')
		}
	}

	async function handleDisconnectSlack() {
		if (!confirm('Are you sure you want to disconnect Slack?')) return

		try {
			await orgApi.disconnectSlack(orgId)
			await loadIntegrations()
		} catch (error) {
			console.error('Failed to disconnect Slack:', error)
			alert('Failed to disconnect Slack')
		}
	}

	const slackIntegration = integrations.find(i => i.provider === 'slack')

	if (loading) {
		return <div className='text-center py-8'>Loading integrations...</div>
	}

	return (
		<div className='space-y-6'>
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

			{/* Coming Soon */}
			<Card>
				<div className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>Coming Soon</h3>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						<div className='border border-gray-200 rounded-lg p-4 opacity-60'>
							<div className='flex items-center gap-3 mb-2'>
								<div className='w-8 h-8 bg-blue-100 rounded flex items-center justify-center'>
									<svg
										className='w-5 h-5 text-blue-600'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
										/>
									</svg>
								</div>
								<h4 className='font-medium text-gray-900'>Email Digest</h4>
							</div>
							<p className='text-sm text-gray-600'>Weekly reports via email</p>
						</div>

						<div className='border border-gray-200 rounded-lg p-4 opacity-60'>
							<div className='flex items-center gap-3 mb-2'>
								<div className='w-8 h-8 bg-purple-100 rounded flex items-center justify-center'>
									<svg
										className='w-5 h-5 text-purple-600'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
										/>
									</svg>
								</div>
								<h4 className='font-medium text-gray-900'>Discord</h4>
							</div>
							<p className='text-sm text-gray-600'>Notifications in Discord</p>
						</div>

						<div className='border border-gray-200 rounded-lg p-4 opacity-60'>
							<div className='flex items-center gap-3 mb-2'>
								<div className='w-8 h-8 bg-orange-100 rounded flex items-center justify-center'>
									<svg
										className='w-5 h-5 text-orange-600'
										fill='none'
										viewBox='0 0 24 24'
										stroke='currentColor'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
										/>
									</svg>
								</div>
								<h4 className='font-medium text-gray-900'>Webhooks</h4>
							</div>
							<p className='text-sm text-gray-600'>Custom webhook endpoints</p>
						</div>
					</div>
				</div>
			</Card>
		</div>
	)
}
