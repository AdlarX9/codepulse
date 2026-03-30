import { useEffect, useMemo, useState } from 'react'
import { Activity, GitCommit, Users2 } from 'lucide-react'
import { getContributorsDashboardData, ContributorsDashboardData } from '@/handles/scan'
import { useMainContext } from '@/navigation/MainContext'
import { buildContributorsViewModel } from './analytics'
import { MainContributorBanner } from './components/MainContributorBanner'
import { ContributorsPieCard } from './components/ContributorsPieCard'
import { ContributorsTableCard } from './components/ContributorsTableCard'

export default function ContributorsDashboard() {
	const { projectPath, hasGit } = useMainContext()
	const [data, setData] = useState<ContributorsDashboardData | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let isActive = true

		if (!projectPath || !hasGit) {
			setData(null)
			setLoading(false)
			setError(null)
			return
		}

		void (async () => {
			if (!isActive) {
				return
			}

			setLoading(true)
			setError(null)
			try {
				const payload = (await Promise.race([
					getContributorsDashboardData(projectPath),
					new Promise<ContributorsDashboardData>((_, reject) => {
						setTimeout(() => {
							reject(
								new Error('Contributors analysis took too long. Please try again.')
							)
						}, 20000)
					})
				])) as ContributorsDashboardData

				if (!isActive) {
					return
				}
				setData(payload)
			} catch (e) {
				if (!isActive) {
					return
				}
				setError(e instanceof Error ? e.message : 'Failed to load contributors data')
			} finally {
				if (isActive) {
					setLoading(false)
				}
			}
		})()

		return () => {
			isActive = false
		}
	}, [projectPath, hasGit])

	const view = useMemo(() => buildContributorsViewModel(data), [data])

	if (!hasGit) {
		return (
			<div className='flex h-64 items-center justify-center'>
				<div className='text-center'>
					<GitCommit className='mx-auto mb-4 h-12 w-12 text-gray-400' />
					<p className='text-gray-500'>Git repository not detected</p>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='flex h-64 items-center justify-center'>
				<div className='text-center'>
					<Activity className='mx-auto mb-2 h-8 w-8 animate-pulse text-blue-500' />
					<p className='text-gray-500'>Loading contributors data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className='flex h-64 items-center justify-center'>
				<p className='text-red-500'>Error: {error}</p>
			</div>
		)
	}

	if (!view.mainContributor || view.contributors.length <= 1) {
		return (
			<div className='flex h-64 items-center justify-center'>
				<div className='text-center'>
					<Users2 className='mx-auto mb-4 h-12 w-12 text-gray-400' />
					<p className='text-gray-500'>At least two contributors are required</p>
				</div>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			<MainContributorBanner contributor={view.mainContributor} />

			<div className='grid grid-cols-1 gap-6 xl:grid-cols-5'>
				<div className='xl:col-span-2'>
					<ContributorsPieCard slices={view.pieSlices} />
				</div>
				<div className='xl:col-span-3'>
					<ContributorsTableCard rows={view.contributors} />
				</div>
			</div>
		</div>
	)
}
