import { useState, useEffect } from 'react'
import { Flame, TrendingUp, Calendar } from 'lucide-react'
import { Card } from '../ui/Card'
import * as gamification from '@/lib/gamification'

interface StreakWidgetProps {
	compact?: boolean
}

export default function StreakWidget({ compact = false }: StreakWidgetProps) {
	const [streak, setStreak] = useState<gamification.Streak | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		loadStreak()
	}, [])

	async function loadStreak() {
		try {
			setLoading(true)
			const data = await gamification.getStreak()
			setStreak(data)
		} catch (error) {
			console.error('Failed to load streak:', error)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<Card className='p-4 animate-pulse'>
				<div className='h-16 bg-gray-200 rounded' />
			</Card>
		)
	}

	if (!streak) {
		return null
	}

	const isOnStreak = streak.current > 0
	const lastActivity = streak.lastActivityDate
		? new Date(streak.lastActivityDate).toLocaleDateString()
		: 'Never'

	if (compact) {
		return (
			<div className='flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200'>
				<Flame className={`h-6 w-6 ${isOnStreak ? 'text-orange-500' : 'text-gray-400'}`} />
				<div>
					<div className='text-2xl font-bold text-gray-900'>{streak.current}</div>
					<div className='text-xs text-gray-600'>day streak</div>
				</div>
			</div>
		)
	}

	return (
		<Card className='p-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 border-orange-200'>
			<div className='flex items-center justify-between mb-4'>
				<h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
					<Flame
						className={`h-5 w-5 ${isOnStreak ? 'text-orange-500' : 'text-gray-400'}`}
					/>
					Commit Streak
				</h3>
				{isOnStreak && (
					<span className='px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full'>
						🔥 ON FIRE
					</span>
				)}
			</div>

			<div className='grid grid-cols-2 gap-4 mb-4'>
				<div>
					<div className='text-4xl font-bold text-orange-600 mb-1'>{streak.current}</div>
					<div className='text-sm text-gray-600 flex items-center gap-1'>
						<Calendar className='h-3 w-3' />
						Current Streak
					</div>
				</div>
				<div>
					<div className='text-4xl font-bold text-purple-600 mb-1'>{streak.longest}</div>
					<div className='text-sm text-gray-600 flex items-center gap-1'>
						<TrendingUp className='h-3 w-3' />
						Longest Streak
					</div>
				</div>
			</div>

			{streak.lastActivityDate && (
				<div className='text-xs text-gray-500 border-t pt-3'>
					Last activity: {lastActivity}
				</div>
			)}

			{!isOnStreak && (
				<div className='mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800'>
					💡 Make a commit today to start a new streak!
				</div>
			)}

			{isOnStreak && streak.current >= 7 && (
				<div className='mt-3 p-3 bg-green-100 border border-green-300 rounded text-sm text-green-800'>
					🌟 Amazing! Keep the momentum going!
				</div>
			)}
		</Card>
	)
}
