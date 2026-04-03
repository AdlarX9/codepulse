import ProjectDropZone from '@/home/components/ProjectDropZone'
import { FolderOpen, GitBranch, Sparkles } from 'lucide-react'

interface EmptyStateHomeProps {
	onAutoScan: () => void
	onSelectProject: () => void
	onProjectPathDrop: (projectPath: string) => Promise<void>
	isAutoScanning: boolean
	dropError: string | null
}

export default function EmptyStateHome({
	onAutoScan,
	onSelectProject,
	onProjectPathDrop,
	isAutoScanning,
	dropError
}: EmptyStateHomeProps) {
	return (
		<div className='mx-auto max-w-6xl space-y-8'>
			<section className='relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-100 via-indigo-50 to-violet-100 p-5 text-slate-900 shadow-[0_24px_55px_-42px_rgba(59,130,246,0.45)] sm:p-8 sm:text-base'>
				<div className='pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/70 blur-2xl' />
				<div className='pointer-events-none absolute -left-6 bottom-0 h-32 w-32 rounded-full bg-blue-200/60 blur-xl' />
				<div className='relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between'>
					<div>
						<div className='inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700'>
							<Sparkles className='h-3.5 w-3.5' />
							Dream Bigger, Ship Cleaner
						</div>
						<h1 className='mt-4 text-3xl font-black tracking-tight sm:text-5xl'>
							CodePulse
						</h1>
						<p className='mt-3 max-w-2xl text-sm text-slate-600 sm:text-base'>
							Build your personal command center for code analytics. Start by
							importing your repositories, then let CodePulse reveal the story hidden
							in your projects.
						</p>
					</div>
					<button
						onClick={onAutoScan}
						disabled={isAutoScanning}
						className='inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-gradient-to-b from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.85)] transition-colors hover:from-blue-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-70'
					>
						<GitBranch className='h-4 w-4' />
						{isAutoScanning ? 'Auto Scan in progress...' : 'Auto Scan Repositories'}
					</button>
				</div>
			</section>

			<section className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8'>
				<div className='mb-5 flex flex-wrap items-center justify-between gap-4'>
					<div>
						<h2 className='text-xl font-bold text-slate-900 sm:text-2xl'>
							Scan New Project
						</h2>
						<p className='mt-1 text-sm text-slate-500'>
							Choose a folder manually or drop it directly below.
						</p>
					</div>
					<button
						onClick={onSelectProject}
						className='inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700'
					>
						<FolderOpen className='h-4 w-4' />
						Select Project
					</button>
				</div>

				<ProjectDropZone onProjectPathDrop={onProjectPathDrop} />

				{dropError ? (
					<p className='mt-3 text-xs font-medium text-red-600'>{dropError}</p>
				) : null}
			</section>
		</div>
	)
}
