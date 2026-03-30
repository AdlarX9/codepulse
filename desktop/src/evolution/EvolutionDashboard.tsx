import { useEffect, useMemo, useState } from 'react'
import { Activity, GitCommit } from 'lucide-react'
import { getCommitActivity, getLanguageColors } from '@/handles/scan'
import { useMainContext } from '@/navigation/MainContext'
import {
	buildAllTimeStats,
	buildDailyChangesSeries,
	buildGeneralStats,
	buildLanguageOrder,
	buildLocEvolutionPoints,
	buildWeeklyChangesSeries
} from './analytics'
import { LocScaleMode } from './components/LocEvolutionSection'
import { AllTimeStatsSection } from './components/AllTimeStatsSection'
import { DailyChangesSection } from './components/DailyChangesSection'
import { GeneralStatsSection } from './components/GeneralStatsSection'
import { LocEvolutionSection } from './components/LocEvolutionSection'
import { CommitActivity } from './types'

export default function EvolutionDashboard() {
	const { projectPath, hasGit } = useMainContext()
	const [commits, setCommits] = useState<CommitActivity[]>([])
	const [languageColors, setLanguageColors] = useState<Record<string, string>>({})
	const [scaleMode, setScaleMode] = useState<LocScaleMode>('snapshots')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		void getLanguageColors().then(setLanguageColors)
	}, [])

	useEffect(() => {
		if (!projectPath || !hasGit) {
			setCommits([])
			return
		}

		void (async () => {
			setLoading(true)
			setError(null)
			try {
				const activity = await getCommitActivity(projectPath)
				setCommits(activity)
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Failed to load evolution data')
			} finally {
				setLoading(false)
			}
		})()
	}, [projectPath, hasGit])

	const locPoints = useMemo(() => buildLocEvolutionPoints(commits), [commits])
	const languageOrder = useMemo(() => buildLanguageOrder(locPoints), [locPoints])
	const generalStats = useMemo(() => buildGeneralStats(commits), [commits])
	const allTimeStats = useMemo(() => buildAllTimeStats(commits), [commits])
	const dailyChanges = useMemo(() => buildDailyChangesSeries(commits), [commits])
	const weeklyChanges = useMemo(() => buildWeeklyChangesSeries(commits), [commits])

	if (!hasGit) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<GitCommit className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>Git repository not detected</p>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<Activity className='h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse' />
					<p className='text-gray-500'>Loading evolution data...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className='flex items-center justify-center h-64'>
				<p className='text-red-500'>Error: {error}</p>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			<GeneralStatsSection stats={generalStats} />
			<AllTimeStatsSection stats={allTimeStats} />
			<LocEvolutionSection
				points={locPoints}
				languageOrder={languageOrder}
				languageColors={languageColors}
				scaleMode={scaleMode}
				onScaleModeChange={setScaleMode}
			/>
			<DailyChangesSection dailyRows={dailyChanges} weeklyRows={weeklyChanges} />
		</div>
	)
}
