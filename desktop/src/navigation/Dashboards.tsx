import { useState } from 'react'
import {
	LayoutDashboard,
	TrendingUp,
	Target,
	Users,
	Settings as SettingsIcon,
	Download
} from 'lucide-react'
import ExportCenter from '@/features/export/ExportCenter'
import ExportButton from '@/features/export/ExportButton'
import OverviewDashboard from '@/features/overview/OverviewDashboard'
import ProductivityDashboard from '@/features/productivity/ProductivityDashboard'
import QualityDashboard from '@/features/quality/QualityDashboard'
import ContributorsDashboard from '@/features/contributors/ContributorsDashboard'
import { useMainContext } from './MainContext'

interface DashboardTab {
	id: 'overview' | 'productivity' | 'quality' | 'contributors' | 'settings' | 'exports'
	label: string
	icon: React.ReactNode
	description: string
}

const TABS: DashboardTab[] = [
	{
		id: 'overview',
		label: 'Overview',
		icon: <LayoutDashboard className='h-4 w-4' />,
		description: 'Global state, lines, languages, structure'
	},
	{
		id: 'productivity',
		label: 'Productivity',
		icon: <TrendingUp className='h-4 w-4' />,
		description: 'Growth over time, commits, trends'
	},
	{
		id: 'quality',
		label: 'Quality',
		icon: <Target className='h-4 w-4' />,
		description: 'Code coverage, complexity, technical debt'
	},
	{
		id: 'contributors',
		label: 'Contributors',
		icon: <Users className='h-4 w-4' />,
		description: 'Git-based contributor ranking'
	},
	{
		id: 'exports',
		label: 'Exports',
		icon: <Download className='h-4 w-4' />,
		description: 'Export data in multiple formats'
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: <SettingsIcon className='h-4 w-4' />,
		description: 'Project-specific settings'
	}
]

export default function Dashboards() {
	const [activeTab, setActiveTab] = useState<DashboardTab['id']>('overview')
	const { scanResult, projectPath, projectName, hasGit } = useMainContext()

	// Filter tabs based on Git availability
	let availableTabs = hasGit ? TABS : TABS.filter(tab => tab.id !== 'contributors')
	if (!projectPath) {
		availableTabs = availableTabs.filter(tab => tab.id !== 'settings')
	}

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
								onClick={() => setActiveTab(tab.id)}
								className={`
									flex items-center gap-2 px-4 py-3 text-sm font-medium
									border-b-2 transition-colors whitespace-nowrap
									${
										activeTab === tab.id
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
						{activeTab === 'productivity' && <ProductivityDashboard />}
						{activeTab === 'quality' && <QualityDashboard />}
						{activeTab === 'contributors' && <ContributorsDashboard />}
						{activeTab === 'exports' && <ExportCenter />}
					</div>
				</div>
			</div>
		</div>
	)
}
