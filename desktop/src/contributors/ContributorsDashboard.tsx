import { useEffect, useMemo, useState } from 'react'
import { Activity, GitCommit, Users2 } from 'lucide-react'
import { getContributorsDashboardData, ContributorsDashboardData } from '@/handles/scan'
import {
	buildProjectCacheKey,
	formatResourceError,
	getResourceSnapshot,
	loadResource,
	subscribeResource
} from '@/cache/resourceCache'
import { useMainContext } from '@/navigation/MainContext'
import { buildContributorsViewModel } from './analytics'
import { MainContributorBanner } from './components/MainContributorBanner'
import { ContributorsPieCard } from './components/ContributorsPieCard'
import { ContributorsTableCard } from './components/ContributorsTableCard'

export default function ContributorsDashboard() {
	const { projectPath, hasGit } = useMainContext()
	const cacheKey =
		projectPath && hasGit ? buildProjectCacheKey('contributors-dashboard', projectPath) : null
	const initialSnapshot = cacheKey
		? getResourceSnapshot<ContributorsDashboardData>(cacheKey)
		: null
	const [data, setData] = useState<ContributorsDashboardData | null>(
		() => initialSnapshot?.data ?? null
	)
	const [loading, setLoading] = useState<boolean>(() =>
		Boolean(cacheKey) ? !(initialSnapshot?.data ?? false) : false
	)
	const [error, setError] = useState<string | null>(() =>
		initialSnapshot?.data ? null : (initialSnapshot?.error ?? null)
	)

	useEffect(() => {
		if (!cacheKey || !projectPath || !hasGit) {
			setData(null)
			setLoading(false)
			setError(null)
			return
		}

		const resourceKey = cacheKey

		let isActive = true

		const syncSnapshot = () => {
			if (!isActive) {
				return
			}

			const snapshot = getResourceSnapshot<ContributorsDashboardData>(resourceKey)
			setData(snapshot.data)
			setLoading(snapshot.loading)
			setError(snapshot.data ? null : snapshot.error)
		}

		const unsubscribe = subscribeResource(resourceKey, syncSnapshot)

		if (initialSnapshot?.data) {
			syncSnapshot()
		} else {
			setData(null)
			setLoading(true)
			setError(null)
		}

		void (async () => {
			try {
				await loadResource(resourceKey, async () => {
					return (await Promise.race([
						getContributorsDashboardData(projectPath),
						new Promise<ContributorsDashboardData>((_, reject) => {
							setTimeout(() => {
								reject(
									new Error(
										'Contributors analysis took too long. Please try again.'
									)
								)
							}, 20000)
						})
					])) as ContributorsDashboardData
				})
			} catch (e) {
				if (isActive) {
					const snapshot = getResourceSnapshot<ContributorsDashboardData>(resourceKey)
					if (!snapshot.data) {
						setError(formatResourceError(e) || 'Failed to load contributors data')
					}
				}
			}
		})()

		return () => {
			isActive = false
			unsubscribe()
		}
	}, [cacheKey, projectPath, hasGit])

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
