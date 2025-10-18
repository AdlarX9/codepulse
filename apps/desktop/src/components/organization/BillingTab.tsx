import { useState } from 'react'
import { orgApi } from '../../lib/api-org'
import type { Subscription } from '../../types/organization'
import { Card } from '../ui/Card'
import { SimpleButton as Button } from '../ui/SimpleButton'
import { Badge } from '../ui/Badge'
import { shell } from '@tauri-apps/api'
import { WEB_BASE } from '@/lib/api'

interface BillingTabProps {
	orgId: string
	subscription?: Subscription
}

const PLANS = [
	{
		id: 'free',
		name: 'Free',
		price: '$0',
		period: '/month',
		features: [
			'Up to 3 projects',
			'90 days scan history',
			'3 repositories',
			'1 quality policy',
			'Community support'
		],
		limitations: ['No PR checks', 'No Slack/Email digest']
	},
	{
		id: 'pro',
		name: 'Pro',
		price: '$29',
		period: '/user/month',
		features: [
			'Unlimited projects',
			'365 days scan history',
			'Unlimited repositories',
			'5 quality policies',
			'PR checks (soft mode)',
			'Weekly Slack/Email digest',
			'Email support'
		],
		popular: true
	},
	{
		id: 'team',
		name: 'Team',
		price: '$99',
		period: '/month',
		features: [
			'Everything in Pro',
			'Unlimited scan history',
			'Unlimited policies',
			'PR checks (blocking mode)',
			'Configurable digest frequency',
			'Priority email + Slack support',
			'Up to 10 users + $10/additional'
		]
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		price: 'Custom',
		period: '',
		features: [
			'Everything in Team',
			'Custom quality rules',
			'SSO/SAML',
			'On-premise option',
			'99.9% SLA',
			'Dedicated account manager',
			'Custom integrations'
		]
	}
]

export default function BillingTab({ orgId, subscription }: BillingTabProps) {
	const [loading, setLoading] = useState(false)

	const currentPlan = subscription?.plan || 'free'

	async function handleUpgrade(planId: string) {
		if (planId === 'enterprise') {
			// Open contact sales
			await shell.open(WEB_BASE + '/contact')
			return
		}

		try {
			setLoading(true)
			const { checkout_url } = await orgApi.createCheckoutSession(orgId, {
				plan: planId,
				seats: 1,
				success_url: window.location.href,
				cancel_url: window.location.href
			})
			await shell.open(checkout_url)
		} catch (error) {
			console.error('Failed to create checkout:', error)
			alert('Failed to start checkout process')
		} finally {
			setLoading(false)
		}
	}

	async function handleManageSubscription() {
		try {
			setLoading(true)
			const { portal_url } = await orgApi.createPortalSession(orgId, window.location.href)
			await shell.open(portal_url)
		} catch (error) {
			console.error('Failed to open billing portal:', error)
			alert('Failed to open billing portal')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='space-y-6'>
			{/* Current Plan */}
			{subscription && (
				<Card>
					<div className='p-6'>
						<h3 className='text-lg font-semibold text-gray-900 mb-4'>
							Current Subscription
						</h3>
						<div className='flex items-center justify-between'>
							<div>
								<div className='flex items-center gap-3 mb-2'>
									<span className='text-2xl font-bold text-gray-900'>
										{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
									</span>
									<Badge
										variant={
											subscription.status === 'active' ? 'success' : 'warning'
										}
									>
										{subscription.status}
									</Badge>
								</div>
								<div className='text-sm text-gray-600'>
									{subscription.seats}{' '}
									{subscription.seats === 1 ? 'seat' : 'seats'}
									{subscription.current_period_end && (
										<>
											{' '}
											• Renews{' '}
											{new Date(
												subscription.current_period_end
											).toLocaleDateString()}
										</>
									)}
								</div>
							</div>
							<Button
								onClick={handleManageSubscription}
								variant='secondary'
								disabled={loading}
							>
								Manage Subscription
							</Button>
						</div>
					</div>
				</Card>
			)}

			{/* Available Plans */}
			<div>
				<h3 className='text-lg font-semibold text-gray-900 mb-4'>Available Plans</h3>
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
					{PLANS.map(plan => (
						<Card
							key={plan.id}
							className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}
						>
							{plan.popular && (
								<div className='absolute -top-3 left-1/2 -translate-x-1/2'>
									<Badge variant='primary'>Most Popular</Badge>
								</div>
							)}
							<div className='p-6'>
								<h4 className='text-xl font-bold text-gray-900 mb-2'>
									{plan.name}
								</h4>
								<div className='mb-4'>
									<span className='text-3xl font-bold text-gray-900'>
										{plan.price}
									</span>
									<span className='text-gray-600'>{plan.period}</span>
								</div>

								<ul className='space-y-2 mb-6'>
									{plan.features.map((feature, i) => (
										<li key={i} className='flex items-start gap-2 text-sm'>
											<svg
												className='w-5 h-5 text-green-500 flex-shrink-0'
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
											<span className='text-gray-700'>{feature}</span>
										</li>
									))}
									{plan.limitations?.map((limitation, i) => (
										<li
											key={`limit-${i}`}
											className='flex items-start gap-2 text-sm'
										>
											<svg
												className='w-5 h-5 text-gray-400 flex-shrink-0'
												fill='none'
												viewBox='0 0 24 24'
												stroke='currentColor'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M6 18L18 6M6 6l12 12'
												/>
											</svg>
											<span className='text-gray-500'>{limitation}</span>
										</li>
									))}
								</ul>

								{currentPlan === plan.id ? (
									<Button variant='secondary' className='w-full' disabled>
										Current Plan
									</Button>
								) : (
									<Button
										onClick={() => handleUpgrade(plan.id)}
										className='w-full'
										disabled={loading}
										variant={plan.popular ? 'default' : 'secondary'}
									>
										{plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
									</Button>
								)}
							</div>
						</Card>
					))}
				</div>
			</div>

			{/* FAQ */}
			<Card>
				<div className='p-6'>
					<h3 className='text-lg font-semibold text-gray-900 mb-4'>
						Frequently Asked Questions
					</h3>
					<div className='space-y-4'>
						<div>
							<h4 className='font-medium text-gray-900 mb-1'>
								Can I change plans at any time?
							</h4>
							<p className='text-sm text-gray-600'>
								Yes! You can upgrade or downgrade your plan at any time. Changes
								take effect immediately for upgrades, and at the end of your billing
								period for downgrades.
							</p>
						</div>
						<div>
							<h4 className='font-medium text-gray-900 mb-1'>
								What payment methods do you accept?
							</h4>
							<p className='text-sm text-gray-600'>
								We accept all major credit cards (Visa, Mastercard, American
								Express) via Stripe. Enterprise customers can also pay via invoice.
							</p>
						</div>
						<div>
							<h4 className='font-medium text-gray-900 mb-1'>
								Is there a money-back guarantee?
							</h4>
							<p className='text-sm text-gray-600'>
								Yes! We offer a 14-day money-back guarantee on all paid plans. No
								questions asked.
							</p>
						</div>
					</div>
				</div>
			</Card>
		</div>
	)
}
