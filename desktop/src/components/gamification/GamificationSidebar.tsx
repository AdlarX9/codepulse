import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp } from 'lucide-react'
import StreakWidget from './StreakWidget'
import BadgesDisplay from './BadgesDisplay'
import ChallengesList from './ChallengesList'
import * as gamification from '@/lib/gamification'

interface GamificationSidebarProps {
	projectId?: string
}

export default function GamificationSidebar({ projectId }: GamificationSidebarProps) {
	const [stats, setStats] = useState<gamification.UserGamificationStats | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadStats()
	}, [])

	async function loadStats() {
		try {
			setLoading(true)
			const data = await gamification.getGamificationStats()
			setStats(data)
		} catch (error) {
			console.error('Failed to load gamification stats:', error)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<div className='w-80 border-l bg-gray-50 p-4 space-y-4'>
				<div className='animate-pulse space-y-4'>
					<div className='h-32 bg-gray-200 rounded' />
					<div className='h-40 bg-gray-200 rounded' />
					<div className='h-48 bg-gray-200 rounded' />
				</div>
			</div>
		)
	}

	return (
		<div className='w-80 border-l bg-gray-50 p-4 overflow-y-auto space-y-4'>
			{/* User Level */}
			{stats && (
				<div className='bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-4'>
					<div className='flex items-center gap-2 mb-2'>
						<Sparkles className='h-5 w-5' />
						<span className='font-semibold'>Your Progress</span>
					</div>
					<div className='flex items-baseline gap-2 mb-1'>
						<div className='text-3xl font-bold'>Level {stats.level}</div>
						<TrendingUp className='h-4 w-4' />
					</div>
					<div className='text-sm opacity-90'>{stats.xp} XP</div>
					<div className='mt-3 w-full bg-white bg-opacity-30 rounded-full h-2'>
						<div
							className='bg-white h-2 rounded-full transition-all'
							style={{ width: `${stats.xp % 100}%` }}
						/>
					</div>
				</div>
			)}

			{/* Streak Widget */}
			<StreakWidget />

			{/* Badges */}
			<BadgesDisplay compact limit={8} />

			{/* Challenges */}
			<ChallengesList projectId={projectId} showCompleted={false} />
		</div>
	)
}
