import { Crown, GitCommit, Mail, UserCircle2 } from 'lucide-react'
import { Card } from '@/components/Card'
import { ContributorRow } from '../types'
import { formatInt, formatPercent } from '../analytics'

type MainContributorBannerProps = {
	contributor: ContributorRow
}

export function MainContributorBanner({ contributor }: MainContributorBannerProps) {
	return (
		<Card className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<div className='flex flex-wrap items-start justify-between gap-4'>
				<div className='space-y-3'>
					<div className='inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
						<Crown className='h-3.5 w-3.5' />
						Main Contributor
					</div>
					<div>
						<h3 className='text-2xl font-bold text-gray-900'>{contributor.pseudo}</h3>
						<p className='mt-1 text-sm text-gray-600'>{contributor.name}</p>
						<p className='mt-0.5 inline-flex items-center gap-1 text-sm text-gray-500'>
							<Mail className='h-3.5 w-3.5' />
							{contributor.email || 'No public email'}
						</p>
					</div>
				</div>

				<div className='grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[480px]'>
					<div className='rounded-lg bg-gray-50 p-3'>
						<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
							Commits
						</p>
						<p className='mt-1 text-xl font-bold text-gray-900'>
							{formatInt(contributor.commits)}
						</p>
						<p className='text-xs text-gray-600'>
							{formatPercent(contributor.commit_percentage)} of project
						</p>
					</div>
					<div className='rounded-lg bg-gray-50 p-3'>
						<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
							Lines attributed
						</p>
						<p className='mt-1 text-xl font-bold text-gray-900'>
							{formatInt(contributor.lines)}
						</p>
						<p className='text-xs text-gray-600'>
							{formatPercent(contributor.line_percentage)} of project
						</p>
					</div>
					<div className='rounded-lg bg-gray-50 p-3'>
						<p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
							Profile timeline
						</p>
						<p className='mt-1 text-sm font-semibold text-gray-900'>
							{contributor.first_commit_date} {'->'} {contributor.last_commit_date}
						</p>
						<p className='mt-1 inline-flex items-center gap-1 text-xs text-gray-600'>
							<UserCircle2 className='h-3.5 w-3.5' />
							<GitCommit className='h-3.5 w-3.5' />
							Git author identity
						</p>
					</div>
				</div>
			</div>
		</Card>
	)
}
