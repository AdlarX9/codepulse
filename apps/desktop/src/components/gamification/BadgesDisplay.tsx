import { useState, useEffect } from 'react'
import { Award, Lock } from 'lucide-react'
import { Card } from '../ui/Card'
import * as gamification from '@/lib/gamification'

interface BadgesDisplayProps {
	compact?: boolean
	limit?: number
}

const AVAILABLE_BADGES = [
	{
		id: 'first_commit',
		name: 'First Steps',
		description: 'Make your first commit',
		icon: '🎯',
		category: 'milestone'
	},
	{
		id: 'week_streak',
		name: 'Consistent',
		description: '7-day commit streak',
		icon: '🔥',
		category: 'consistency'
	},
	{
		id: 'month_streak',
		name: 'Dedicated',
		description: '30-day commit streak',
		icon: '💪',
		category: 'consistency'
	},
	{
		id: 'hundred_commits',
		name: 'Century',
		description: '100 commits',
		icon: '💯',
		category: 'commit'
	},
	{
		id: 'quality_master',
		name: 'Quality Master',
		description: '90+ quality score',
		icon: '⭐',
		category: 'quality'
	},
	{
		id: 'early_bird',
		name: 'Early Bird',
		description: 'Commit before 8 AM',
		icon: '🌅',
		category: 'commit'
	},
	{
		id: 'night_owl',
		name: 'Night Owl',
		description: 'Commit after 10 PM',
		icon: '🦉',
		category: 'commit'
	},
	{
		id: 'weekend_warrior',
		name: 'Weekend Warrior',
		description: 'Commit on weekends',
		icon: '🏋️',
		category: 'consistency'
	}
]

export default function BadgesDisplay({ compact = false, limit }: BadgesDisplayProps) {
	const [badges, setBadges] = useState<gamification.Badge[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadBadges()
	}, [])

	async function loadBadges() {
		try {
			setLoading(true)
			const data = await gamification.getBadges()
			setBadges(data)
		} catch (error) {
			console.error('Failed to load badges:', error)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<Card className='p-6'>
				<div className='animate-pulse'>
					<div className='h-4 w-24 bg-gray-200 rounded mb-4' />
					<div className='grid grid-cols-4 gap-3'>
						{[...Array(8)].map((_, i) => (
							<div key={i} className='h-20 bg-gray-200 rounded' />
						))}
					</div>
				</div>
			</Card>
		)
	}

	const unlockedIds = new Set(badges.map(b => b.id))
	const displayBadges = limit ? AVAILABLE_BADGES.slice(0, limit) : AVAILABLE_BADGES

	if (compact) {
		return (
			<div className='flex gap-2 flex-wrap'>
				{badges.slice(0, limit || 5).map(badge => {
					const badgeInfo = AVAILABLE_BADGES.find(b => b.id === badge.id)
					return (
						<div
							key={badge.id}
							className='relative group'
							title={badgeInfo?.description}
						>
							<div className='text-3xl'>{badgeInfo?.icon || '🏆'}</div>
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<Card className='p-6'>
			<div className='flex items-center justify-between mb-4'>
				<h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
					<Award className='h-5 w-5' />
					Badges
				</h3>
				<span className='text-sm text-gray-600'>
					{badges.length} / {AVAILABLE_BADGES.length} unlocked
				</span>
			</div>

			<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
				{displayBadges.map(availableBadge => {
					const isUnlocked = unlockedIds.has(availableBadge.id)
					const badge = badges.find(b => b.id === availableBadge.id)

					return (
						<div
							key={availableBadge.id}
							className={`
								p-4 rounded-lg border-2 text-center transition-all
								${
									isUnlocked
										? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-sm'
										: 'bg-gray-50 border-gray-200 opacity-60'
								}
								hover:scale-105
							`}
						>
							<div className='relative inline-block mb-2'>
								<div className='text-4xl'>{availableBadge.icon}</div>
								{!isUnlocked && (
									<div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full'>
										<Lock className='h-5 w-5 text-white' />
									</div>
								)}
							</div>
							<div className='font-semibold text-sm text-gray-900 mb-1'>
								{availableBadge.name}
							</div>
							<div className='text-xs text-gray-600'>
								{availableBadge.description}
							</div>
							{isUnlocked && badge?.unlockedAt && (
								<div className='text-xs text-green-600 mt-2'>
									{new Date(badge.unlockedAt).toLocaleDateString()}
								</div>
							)}
						</div>
					)
				})}
			</div>

			{badges.length === 0 && (
				<div className='text-center py-8'>
					<Award className='h-12 w-12 text-gray-400 mx-auto mb-3' />
					<p className='text-gray-500'>No badges yet</p>
					<p className='text-sm text-gray-400 mt-1'>Start committing to unlock badges!</p>
				</div>
			)}
		</Card>
	)
}
