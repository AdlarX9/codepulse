import { useEffect, useState } from 'react'
import { Flame, TrendingUp, Calendar } from 'lucide-react'
import { Card } from '../ui/Card'
import { api } from '@/lib/api'
import * as git from '@/lib/git'
import { invoke } from '@tauri-apps/api/tauri'

interface StreakState {
	current: number
	longest: number
	lastActivityDate: string | null
}

export default function LocalStreakWidget() {
	const [streak, setStreak] = useState<StreakState | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		computeStreak()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	async function computeStreak() {
		try {
			setLoading(true)
			const projects = await api.getProjects()
			const bindings = await Promise.all(
				(projects || []).map(async (p: any) => {
					try {
						const path = await invoke<string | null>('get_project_binding', {
							projectId: p.id
						})
						return path
					} catch {
						return null
					}
				})
			)
			// Collect commit dates across repos (last 180 days)
			const dates = new Set<string>()
			const today = new Date()
			const dateKey = (d: Date) => d.toISOString().slice(0, 10)

			for (const path of bindings) {
				if (!path) continue
				let isRepo = false
				try {
					isRepo = await git.isGitRepository(path)
				} catch {}
				if (!isRepo) continue
				let commits: git.GitCommitInfo[] = []
				try {
					commits = await git.getCommits(path, undefined, 1000)
				} catch {}
				for (const c of commits) {
					const d = new Date(c.timestamp * 1000)
					// only consider last 180 days
					if (today.getTime() - d.getTime() <= 180 * 24 * 3600 * 1000) {
						dates.add(dateKey(d))
					}
				}
			}

			// Compute current and longest streak over 180 days
			let current = 0
			let longest = 0
			let lastActivityDate: string | null = null
			// Find last activity
			const sortedDates = Array.from(dates).sort()
			if (sortedDates.length > 0) lastActivityDate = sortedDates[sortedDates.length - 1]

			// Walk backwards from today for current streak
			let cursor = new Date(today)
			while (dates.has(dateKey(cursor))) {
				current += 1
				cursor.setDate(cursor.getDate() - 1)
			}

			// Longest streak by scanning windows
			let run = 0
			const start = new Date(today)
			start.setDate(start.getDate() - 179)
			const iter = new Date(start)
			for (let i = 0; i < 180; i++) {
				const key = dateKey(iter)
				if (dates.has(key)) {
					run += 1
					if (run > longest) longest = run
				} else {
					run = 0
				}
				iter.setDate(iter.getDate() + 1)
			}

			setStreak({ current, longest, lastActivityDate })
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
	if (!streak) return null

	const isOnStreak = streak.current > 0

	return (
		<Card className='p-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 border-orange-200'>
			<div className='flex items-center justify-between mb-4'>
				<h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
					<Flame
						className={`h-5 w-5 ${isOnStreak ? 'text-orange-500' : 'text-gray-400'}`}
					/>
					Coding Streak
				</h3>
				{isOnStreak && (
					<span className='px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full'>
						🔥 Keep it up
					</span>
				)}
			</div>
			<div className='grid grid-cols-2 gap-4 mb-2'>
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
					Last activity: {new Date(streak.lastActivityDate).toLocaleDateString()}
				</div>
			)}
			{!isOnStreak && (
				<div className='mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800'>
					💡 Make a commit today to start a new streak!
				</div>
			)}
		</Card>
	)
}
