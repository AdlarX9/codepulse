import { useState, useEffect } from 'react'
import { Target, Clock, Trophy, CheckCircle, XCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import * as gamification from '@/lib/gamification'

interface ChallengesListProps {
	projectId?: string
	showCompleted?: boolean
}

export default function ChallengesList({ projectId: _projectId, showCompleted = false }: ChallengesListProps) {
	const [challenges, setChallenges] = useState<gamification.Challenge[]>([])
	const [loading, setLoading] = useState(true)
	const [filter, setFilter] = useState<'active' | 'completed'>('active')

	useEffect(() => {
		loadChallenges()
	}, [filter])

	async function loadChallenges() {
		try {
			setLoading(true)
			const data = await gamification.getChallenges(filter)
			setChallenges(data)
		} catch (error) {
			console.error('Failed to load challenges:', error)
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return (
			<Card className='p-6'>
				<div className='animate-pulse space-y-3'>
					<div className='h-20 bg-gray-200 rounded' />
					<div className='h-20 bg-gray-200 rounded' />
					<div className='h-20 bg-gray-200 rounded' />
				</div>
			</Card>
		)
	}

	const activeChallenges = challenges.filter(c => c.status === 'active')
	const completedChallenges = challenges.filter(c => c.status === 'completed')

	return (
		<div className='space-y-4'>
			{/* Header with filters */}
			<div className='flex items-center justify-between'>
				<h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
					<Target className='h-5 w-5' />
					Challenges
				</h3>
				{showCompleted && (
					<div className='flex gap-2'>
						<Button
							size='sm'
							variant={filter === 'active' ? 'default' : 'outline'}
							onClick={() => setFilter('active')}
						>
							Active ({activeChallenges.length})
						</Button>
						<Button
							size='sm'
							variant={filter === 'completed' ? 'default' : 'outline'}
							onClick={() => setFilter('completed')}
						>
							Completed ({completedChallenges.length})
						</Button>
					</div>
				)}
			</div>

			{/* Challenges list */}
			<div className='space-y-3'>
				{challenges.length === 0 ? (
					<Card className='p-8 text-center'>
						<Target className='h-12 w-12 text-gray-400 mx-auto mb-3' />
						<p className='text-gray-500'>No {filter} challenges</p>
						<p className='text-sm text-gray-400 mt-1'>
							Keep coding and new challenges will appear!
						</p>
					</Card>
				) : (
					challenges.map(challenge => (
						<ChallengeCard key={challenge.id} challenge={challenge} />
					))
				)}
			</div>
		</div>
	)
}

function ChallengeCard({ challenge }: { challenge: gamification.Challenge }) {
	const progress = gamification.calculateChallengeProgress(challenge)
	const daysRemaining = gamification.getDaysRemaining(challenge)
	const statusEmoji = gamification.getChallengeStatusEmoji(challenge.status)

	const isActive = challenge.status === 'active'
	const isCompleted = challenge.status === 'completed'
	const isFailed = challenge.status === 'failed'

	return (
		<Card
			className={`p-4 transition-all hover:shadow-md ${
				isCompleted
					? 'bg-green-50 border-green-200'
					: isFailed
						? 'bg-red-50 border-red-200'
						: 'bg-white'
			}`}
		>
			<div className='flex items-start justify-between mb-3'>
				<div className='flex-1'>
					<div className='flex items-center gap-2 mb-1'>
						<h4 className='font-semibold text-gray-900'>{challenge.title}</h4>
						<span className='text-xl'>{statusEmoji}</span>
					</div>
					<p className='text-sm text-gray-600'>{challenge.description}</p>
					<div className='flex items-center gap-3 mt-2 text-xs text-gray-500'>
						<span className='flex items-center gap-1'>
							<Target className='h-3 w-3' />
							{gamification.formatChallengeType(challenge.type)}
						</span>
						{isActive && (
							<span className='flex items-center gap-1'>
								<Clock className='h-3 w-3' />
								{daysRemaining} days left
							</span>
						)}
					</div>
				</div>

				{challenge.reward && (
					<div className='ml-3 flex items-center gap-1 px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs font-medium text-yellow-800'>
						<Trophy className='h-3 w-3' />
						{challenge.reward}
					</div>
				)}
			</div>

			{/* Progress bar */}
			{isActive && (
				<div>
					<div className='flex justify-between text-xs text-gray-600 mb-1'>
						<span>Progress</span>
						<span className='font-medium'>{Math.round(progress)}%</span>
					</div>
					<div className='w-full bg-gray-200 rounded-full h-2'>
						<div
							className={`h-2 rounded-full transition-all ${
								progress >= 100
									? 'bg-green-500'
									: progress >= 50
										? 'bg-blue-500'
										: 'bg-orange-500'
							}`}
							style={{ width: `${Math.min(progress, 100)}%` }}
						/>
					</div>
				</div>
			)}

			{/* Completion indicator */}
			{isCompleted && challenge.completedAt && (
				<div className='flex items-center gap-2 mt-2 text-sm text-green-700'>
					<CheckCircle className='h-4 w-4' />
					Completed on {new Date(challenge.completedAt).toLocaleDateString()}
				</div>
			)}

			{isFailed && (
				<div className='flex items-center gap-2 mt-2 text-sm text-red-700'>
					<XCircle className='h-4 w-4' />
					Challenge failed
				</div>
			)}
		</Card>
	)
}
