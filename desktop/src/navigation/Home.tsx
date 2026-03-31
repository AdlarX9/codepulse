import EmptyStateHome from '@/home/components/EmptyStateHome'
import HeadquartersHome from '@/home/components/HeadquartersHome'
import { useHomeHeadquarters } from '@/home/hooks/useHomeHeadquarters'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useMainContext } from './MainContext'

export default function Home() {
	const { selectAndScan, scanProjectPath, autoScanProjects, isAutoScanning, recentProjects } =
		useMainContext()
	const [dropError, setDropError] = useState<string | null>(null)
	const hasProjects = recentProjects.length > 0
	const { loading, error, data } = useHomeHeadquarters(recentProjects)

	async function handleProjectPathDrop(projectPath: string) {
		setDropError(null)
		const succeeded = await scanProjectPath(projectPath)
		if (!succeeded) {
			setDropError('Unable to scan this dropped folder. Verify that it is a valid directory.')
		}
	}

	if (!hasProjects) {
		return (
			<EmptyStateHome
				onAutoScan={() => {
					void autoScanProjects()
				}}
				onSelectProject={() => {
					void selectAndScan()
				}}
				onProjectPathDrop={handleProjectPathDrop}
				isAutoScanning={isAutoScanning}
				dropError={dropError}
			/>
		)
	}

	if (loading) {
		return (
			<div className='mx-auto max-w-5xl'>
				<section className='rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
					<div className='flex items-center gap-3'>
						<Loader2 className='h-5 w-5 animate-spin text-blue-600' />
						<div>
							<p className='font-semibold text-slate-900'>
								Preparing your Home HQ...
							</p>
							<p className='text-sm text-slate-500'>
								Aggregating statistics from all your saved projects.
							</p>
						</div>
					</div>
				</section>
			</div>
		)
	}

	if (!data) {
		return (
			<div className='mx-auto max-w-5xl'>
				<section className='rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm'>
					<div className='flex items-start gap-3'>
						<AlertTriangle className='mt-0.5 h-5 w-5 flex-shrink-0' />
						<div>
							<p className='font-semibold'>Home HQ could not be generated.</p>
							<p className='mt-1 text-sm text-amber-800'>
								{error ||
									'Re-scan your projects or run Auto Scan to refresh the data source.'}
							</p>
						</div>
					</div>
				</section>
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			{error ? (
				<div className='mx-auto max-w-7xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
					<div className='flex items-start gap-2'>
						<AlertTriangle className='mt-0.5 h-4 w-4 flex-shrink-0' />
						<div>{error}</div>
					</div>
				</div>
			) : null}

			<HeadquartersHome
				data={data}
				onAutoScan={() => {
					void autoScanProjects()
				}}
				isAutoScanning={isAutoScanning}
			/>
		</div>
	)
}
