import {
	getCommitActivity,
	getLanguageCategories,
	getLanguageColors,
	scanDirectory
} from '@/handles/scan'
import { LocalProject } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { buildHomeHeadquartersData, splitTopLevelProjects } from '../analytics'
import { HomeHeadquartersData, HomeProjectDataset } from '../types'
import {
	buildProjectCacheKey,
	buildProjectSetCacheKey,
	formatResourceError,
	getResourceSnapshot,
	loadResource,
	subscribeResource
} from '@/cache/resourceCache'

type HeadquartersState = {
	loading: boolean
	error: string | null
	data: HomeHeadquartersData | null
}

function getScanConcurrency(): number {
	if (typeof navigator === 'undefined' || !navigator.hardwareConcurrency) {
		return 2
	}

	const half = Math.floor(navigator.hardwareConcurrency / 2)
	return Math.max(2, Math.min(8, half))
}

async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	mapper: (item: T) => Promise<R>
): Promise<R[]> {
	if (items.length === 0) {
		return []
	}

	const results = new Array<R>(items.length)
	let cursor = 0

	async function worker() {
		while (true) {
			const index = cursor
			cursor += 1
			if (index >= items.length) {
				return
			}

			results[index] = await mapper(items[index])
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
	await Promise.all(workers)
	return results
}

export function useHomeHeadquarters(recentProjects: LocalProject[]) {
	const { consideredProjects, ignoredNestedProjects } = useMemo(
		() => splitTopLevelProjects(recentProjects),
		[recentProjects]
	)
	const cacheKey = useMemo(
		() =>
			[
				buildProjectSetCacheKey('home-hq-considered', consideredProjects),
				buildProjectSetCacheKey('home-hq-ignored', ignoredNestedProjects)
			].join('|'),
		[consideredProjects, ignoredNestedProjects]
	)
	const initialSnapshot =
		consideredProjects.length > 0 ? getResourceSnapshot<HomeHeadquartersData>(cacheKey) : null
	const [state, setState] = useState<HeadquartersState>(() => ({
		loading: consideredProjects.length > 0 ? (initialSnapshot?.loading ?? true) : false,
		error: initialSnapshot?.data ? null : (initialSnapshot?.error ?? null),
		data: initialSnapshot?.data ?? null
	}))

	useEffect(() => {
		if (consideredProjects.length === 0) {
			setState({ loading: false, error: null, data: null })
			return
		}

		let cancelled = false

		const syncSnapshot = () => {
			if (cancelled) {
				return
			}

			const snapshot = getResourceSnapshot<HomeHeadquartersData>(cacheKey)
			setState({
				loading: snapshot.loading,
				error: snapshot.data ? null : snapshot.error,
				data: snapshot.data
			})
		}

		const unsubscribe = subscribeResource(cacheKey, syncSnapshot)

		if (initialSnapshot?.data) {
			syncSnapshot()
		} else {
			setState({ loading: true, error: null, data: null })
		}

		void (async () => {
			try {
				const data = await loadResource(cacheKey, async () => {
					const [languageColors, languageCategories] = await Promise.all([
						getLanguageColors(),
						getLanguageCategories()
					])

					const datasets = await mapWithConcurrency(
						consideredProjects,
						getScanConcurrency(),
						async project => {
							try {
								const [scanResult, commits] = await Promise.all([
									loadResource(
										buildProjectCacheKey('scan-directory', project.path),
										() => scanDirectory(project.path)
									),
									loadResource(
										buildProjectCacheKey('commit-activity', project.path),
										() => getCommitActivity(project.path).catch(() => [])
									)
								])

								const dataset: HomeProjectDataset = {
									project,
									scanResult,
									commits
								}
								return dataset
							} catch {
								return null
							}
						}
					)

					const validDatasets = datasets.filter(
						(dataset): dataset is HomeProjectDataset => dataset !== null
					)

					if (validDatasets.length === 0) {
						throw new Error(
							'Unable to compute aggregated Home insights from your projects. Try Auto Scan or re-scan your projects.'
						)
					}

					return buildHomeHeadquartersData(
						validDatasets,
						ignoredNestedProjects,
						languageColors,
						languageCategories
					)
				})

				if (cancelled) {
					return
				}

				setState({ loading: false, error: null, data })
			} catch (error) {
				if (cancelled) {
					return
				}

				const snapshot = getResourceSnapshot<HomeHeadquartersData>(cacheKey)
				if (snapshot.data) {
					setState(previous => ({
						...previous,
						loading: false,
						error: null,
						data: snapshot.data
					}))
					return
				}

				setState({
					loading: false,
					error:
						formatResourceError(error) ||
						'Unexpected error while preparing Home insights.',
					data: null
				})
			}
		})()

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [cacheKey, consideredProjects, ignoredNestedProjects])

	return {
		consideredProjects,
		ignoredNestedProjects,
		loading: state.loading,
		error: state.error,
		data: state.data
	}
}
