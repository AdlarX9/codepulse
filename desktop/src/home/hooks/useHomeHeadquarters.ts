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
	const [state, setState] = useState<HeadquartersState>({
		loading: false,
		error: null,
		data: null
	})

	useEffect(() => {
		if (consideredProjects.length === 0) {
			setState({ loading: false, error: null, data: null })
			return
		}

		let cancelled = false

		void (async () => {
			setState(previous => ({ ...previous, loading: true, error: null }))

			try {
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
								scanDirectory(project.path),
								getCommitActivity(project.path).catch(() => [])
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

				if (cancelled) {
					return
				}

				const validDatasets = datasets.filter(
					(dataset): dataset is HomeProjectDataset => dataset !== null
				)

				if (validDatasets.length === 0) {
					setState({
						loading: false,
						error: 'Unable to compute aggregated Home insights from your projects. Try Auto Scan or re-scan your projects.',
						data: null
					})
					return
				}

				const data = buildHomeHeadquartersData(
					validDatasets,
					ignoredNestedProjects,
					languageColors,
					languageCategories
				)
				setState({ loading: false, error: null, data })
			} catch (error) {
				if (cancelled) {
					return
				}

				setState({
					loading: false,
					error:
						error instanceof Error
							? error.message
							: 'Unexpected error while preparing Home insights.',
					data: null
				})
			}
		})()

		return () => {
			cancelled = true
		}
	}, [consideredProjects, ignoredNestedProjects])

	return {
		consideredProjects,
		ignoredNestedProjects,
		loading: state.loading,
		error: state.error,
		data: state.data
	}
}
