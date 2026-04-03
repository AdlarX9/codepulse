import { ArrowBigUpDash, Flame, Mountain, PauseCircle } from 'lucide-react'
import { AllTimeStats } from '../types'
import { StatCard } from './StatCard'

function formatInt(value: number): string {
	return new Intl.NumberFormat('en-US').format(value)
}

type AllTimeStatsSectionProps = {
	stats: AllTimeStats
}

export function AllTimeStatsSection({ stats }: AllTimeStatsSectionProps) {
	return (
		<section className='space-y-3'>
			<h3 className='text-lg font-semibold text-slate-900'>All-Time Stats</h3>
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
				<StatCard title='Peak LOC'>
					<div className='flex items-end justify-between'>
						<p className='text-2xl font-bold text-slate-900 sm:text-3xl'>
							{formatInt(stats.peakLoc)}
						</p>
						<Mountain className='h-5 w-5 text-slate-400' />
					</div>
				</StatCard>

				<StatCard title='Biggest Bump'>
					<div className='flex items-end justify-between'>
						<p className='text-2xl font-bold text-emerald-600 sm:text-3xl'>
							+{formatInt(stats.biggestBump)}
						</p>
						<ArrowBigUpDash className='h-5 w-5 text-slate-400' />
					</div>
				</StatCard>

				<StatCard title='Longest Streak'>
					<div className='flex items-end justify-between'>
						<p className='text-2xl font-bold text-blue-700 sm:text-3xl'>
							{formatInt(stats.longestStreakDays)}
						</p>
						<Flame className='h-5 w-5 text-slate-400' />
					</div>
					<p className='mt-1 text-sm text-slate-600'>consecutive active days</p>
				</StatCard>

				<StatCard title='Longest Inactivity Period'>
					<div className='flex items-end justify-between'>
						<p className='text-2xl font-bold text-amber-700 sm:text-3xl'>
							{formatInt(stats.longestInactivityDays)}
						</p>
						<PauseCircle className='h-5 w-5 text-slate-400' />
					</div>
					<p className='mt-1 text-sm text-slate-600'>days without commits</p>
				</StatCard>
			</div>
		</section>
	)
}
