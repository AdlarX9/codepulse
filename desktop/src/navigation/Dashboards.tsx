import { useEffect, useState } from 'react'
import { LayoutDashboard, TrendingUp, Users2 } from 'lucide-react'
import ExportButton from '@/export/ExportButton'
import OverviewDashboard from '@/overview/OverviewDashboard'
import EvolutionDashboard from '@/evolution/EvolutionDashboard'
import ContributorsDashboard from '@/contributors/ContributorsDashboard'
import { getContributorCount } from '@/handles/scan'
import { useMainContext } from './MainContext'

interface DashboardTab {
	id: 'overview' | 'evolution' | 'contributors' | 'exports'
	label: string
	icon: React.ReactNode
	description: string
	disabled?: boolean
	disabledReason?: string
}

const TABS: DashboardTab[] = [
	{
		id: 'overview',
		label: 'Overview',
		icon: <LayoutDashboard className='h-4 w-4' />,
		description: 'Global state, lines, languages, structure'
	},
	{
		id: 'evolution',
		label: 'Evolution',
		icon: <TrendingUp className='h-4 w-4' />,
		description: 'Growth over time, commits, trends'
	},
	{
		id: 'contributors',
		label: 'Contributors',
		icon: <Users2 className='h-4 w-4' />,
		description: 'Main contributor, ownership and productivity'
	}
]

export default function Dashboards() {
	const [activeTab, setActiveTab] = useState<DashboardTab['id']>('overview')
	const [contributorCount, setContributorCount] = useState<number>(0)
	const { scanResult, projectName, hasGit, projectPath } = useMainContext()

	useEffect(() => {
		if (!hasGit || !projectPath) {
			setContributorCount(0)
			return
		}

		void getContributorCount(projectPath)
			.then(count => setContributorCount(count))
			.catch(() => setContributorCount(0))
	}, [hasGit, projectPath])

	const contributorsDisabled = !hasGit || contributorCount <= 1

	const availableTabs = TABS.map(tab => {
		if (tab.id === 'evolution') {
			return {
				...tab,
				disabled: !hasGit,
				disabledReason: !hasGit ? 'Git repository required' : undefined
			}
		}

		if (tab.id === 'contributors') {
			return {
				...tab,
				disabled: contributorsDisabled,
				disabledReason: !hasGit
					? 'Git repository required'
					: 'At least 2 contributors required'
			}
		}

		return tab
	})

	useEffect(() => {
		if (!hasGit && activeTab === 'evolution') {
			setActiveTab('overview')
			return
		}

		if (contributorsDisabled && activeTab === 'contributors') {
			setActiveTab('overview')
		}
	}, [activeTab, hasGit, contributorsDisabled])

	return (
		<div className='flex h-full min-w-0 flex-col'>
			{/* Header */}
			<div className='border-b bg-white px-3 py-3 sm:px-4 sm:py-4 lg:px-6'>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<div className='min-w-0'>
						<h1 className='truncate text-xl font-bold text-gray-900 sm:text-2xl'>
							{projectName}
						</h1>
						<p className='text-sm text-gray-500 mt-1'>Project insights and analytics</p>
					</div>
					{scanResult ? (
						<div className='flex items-center gap-2 sm:ml-auto'>
							<ExportButton />
						</div>
					) : null}
				</div>
			</div>

			{/* Tab Navigation - Notion Style */}
			<div className='border-b bg-white'>
				<div className='px-2 sm:px-4 lg:px-6'>
					<div className='flex gap-1 overflow-x-auto'>
						{availableTabs.map(tab => (
							<button
								key={tab.id}
								title={tab.disabled ? tab.disabledReason : tab.description}
								onClick={() => {
									if (!tab.disabled) {
										setActiveTab(tab.id)
									}
								}}
								disabled={tab.disabled}
								className={`
									flex items-center gap-2 px-3 py-2.5 text-sm font-medium
									border-b-2 transition-colors whitespace-nowrap
									${
										tab.disabled
											? 'border-transparent text-gray-400 cursor-not-allowed'
											: activeTab === tab.id
												? 'border-blue-500 text-blue-600'
												: 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
									}
								`}
							>
								{tab.icon}
								{tab.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Tab Description */}
			<div className='bg-gray-50 border-b px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6'>
				<p className='text-sm text-gray-600'>
					{availableTabs.find(t => t.id === activeTab)?.description}
				</p>
			</div>

			{/* Content Area */}
			<div className='flex-1 overflow-auto bg-gray-50'>
				<div className='min-w-0 p-3 sm:p-4 lg:p-6'>
					{activeTab === 'overview' && <OverviewDashboard />}
					{activeTab === 'evolution' && hasGit && <EvolutionDashboard />}
					{activeTab === 'contributors' && !contributorsDisabled && (
						<ContributorsDashboard />
					)}
				</div>
			</div>
		</div>
	)
}
