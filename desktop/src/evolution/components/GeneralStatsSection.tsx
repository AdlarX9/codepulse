import { GitCommit, CalendarRange, Hourglass } from 'lucide-react'
import { StatCard } from './StatCard'
import { GeneralStats } from '../types'

function formatInt(value: number): string {
	return new Intl.NumberFormat('en-US').format(value)
}

type GeneralStatsSectionProps = {
	stats: GeneralStats
}

export function GeneralStatsSection({ stats }: GeneralStatsSectionProps) {
	return (
		<section className='space-y-3'>
			<h3 className='text-lg font-semibold text-slate-900'>General Stats</h3>
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
				<StatCard title='Snapshots'>
					<div className='flex items-end justify-between'>
						<p className='text-3xl font-bold text-slate-900'>
							{formatInt(stats.snapshots)}
						</p>
						<GitCommit className='h-5 w-5 text-slate-400' />
					</div>
				</StatCard>

				<StatCard title='Activity'>
					<div className='space-y-1'>
						<p className='text-lg font-semibold text-slate-900'>
							{formatInt(stats.activeWeeks)} weeks
						</p>
						<p className='text-sm text-slate-600'>{formatInt(stats.activeDays)} days</p>
					</div>
				</StatCard>

				<StatCard title='Age'>
					<div className='flex items-end justify-between'>
						<p className='text-3xl font-bold text-slate-900'>
							{formatInt(stats.ageDays)}
						</p>
						<CalendarRange className='h-5 w-5 text-slate-400' />
					</div>
					<p className='mt-1 text-sm text-slate-600'>
						days between first and latest commit
					</p>
				</StatCard>

				<StatCard title='Cumulated Additions / Deletions'>
					<div className='space-y-1'>
						<p className='text-lg font-semibold text-emerald-600'>
							+{formatInt(stats.cumulatedAdditions)}
						</p>
						<p className='text-sm font-semibold text-rose-600'>
							-{formatInt(stats.cumulatedDeletions)}
						</p>
					</div>
					<div className='mt-2 flex justify-end'>
						<Hourglass className='h-5 w-5 text-slate-400' />
					</div>
				</StatCard>
			</div>
		</section>
	)
}
