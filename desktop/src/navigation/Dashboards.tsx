import { useEffect, useState } from 'react'
import { LayoutDashboard, TrendingUp, Download } from 'lucide-react'
import ExportCenter from '@/export/ExportCenter'
import ExportButton from '@/export/ExportButton'
import OverviewDashboard from '@/overview/OverviewDashboard'
import EvolutionDashboard from '@/evolution/EvolutionDashboard'
import { useMainContext } from './MainContext'

interface DashboardTab {
	id: 'overview' | 'evolution' | 'exports'
	label: string
	icon: React.ReactNode
	description: string
	disabled?: boolean
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
		id: 'exports',
		label: 'Exports',
		icon: <Download className='h-4 w-4' />,
		description: 'Export data in multiple formats'
	}
]

export default function Dashboards() {
	const [activeTab, setActiveTab] = useState<DashboardTab['id']>('overview')
	const { scanResult, projectName, hasGit } = useMainContext()

	const availableTabs = TABS.map(tab =>
		tab.id === 'evolution' ? { ...tab, disabled: !hasGit } : tab
	)

	useEffect(() => {
		if (!hasGit && activeTab === 'evolution') {
			setActiveTab('overview')
		}
	}, [activeTab, hasGit])

	return (
		<div className='h-full flex flex-col'>
			{/* Header */}
			<div className='border-b bg-white px-6 py-4'>
				<div className='flex items-center justify-between gap-4'>
					<div>
						<h1 className='text-2xl font-bold text-gray-900'>{projectName}</h1>
						<p className='text-sm text-gray-500 mt-1'>Project insights and analytics</p>
					</div>
					{scanResult ? (
						<div className='flex items-center gap-2'>
							<ExportButton />
						</div>
					) : null}
				</div>
			</div>

			{/* Tab Navigation - Notion Style */}
			<div className='border-b bg-white'>
				<div className='px-6'>
					<div className='flex gap-1 overflow-x-auto'>
						{availableTabs.map(tab => (
							<button
								key={tab.id}
								onClick={() => {
									if (!tab.disabled) {
										setActiveTab(tab.id)
									}
								}}
								disabled={tab.disabled}
								className={`
									flex items-center gap-2 px-4 py-3 text-sm font-medium
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
			<div className='bg-gray-50 border-b px-6 py-3'>
				<p className='text-sm text-gray-600'>
					{availableTabs.find(t => t.id === activeTab)?.description}
				</p>
			</div>

			{/* Content Area */}
			<div className='flex-1 overflow-auto bg-gray-50'>
				<div className='flex'>
					<div className='flex-1 p-6'>
						{activeTab === 'overview' && <OverviewDashboard />}
						{activeTab === 'evolution' && hasGit && <EvolutionDashboard />}
						{activeTab === 'exports' && <ExportCenter />}
					</div>
				</div>
			</div>
		</div>
	)
}
