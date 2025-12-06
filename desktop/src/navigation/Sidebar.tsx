import { ReactNode } from 'react'
import { Code2, Settings, FolderOpen } from 'lucide-react'

import logo from '../assets/icon.png'
import { useMainContext } from './MainContext'
import { LocalProject } from '@/types'

interface SidebarItemProps {
	icon?: ReactNode
	label: string
	active?: boolean
	onClick?: () => void
	badge?: string | number
}

function SidebarItem({ icon, label, active, onClick, badge }: SidebarItemProps) {
	return (
		<button
			onClick={onClick}
			className={`
				w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1
				${active ? 'bg-blue-400 text-white' : 'text-gray-900 hover:bg-gray-100 hover:text-black'}
			`}
		>
			{icon && <span className='flex-shrink-0'>{icon}</span>}
			<span className='flex-1 text-left text-sm font-medium'>{label}</span>
			{badge !== undefined && (
				<span className='px-2 py-0.5 text-xs font-medium bg-gray-200 rounded-full'>
					{badge}
				</span>
			)}
		</button>
	)
}

export default function Sidebar() {
	const { selectAndScan, recentProjects, openRecentProject, currentView, changeView, projectName } =
		useMainContext()

	return (
		<aside className='w-64 bg-gray-50 border-r text-gray-900 flex-shrink-0 flex flex-col'>
			<div className='p-4 border-b border-gray-200'>
				<div className='flex items-center gap-3 mb-4'>
					<div className='w-12 h-12 rounded-lg flex items-center justify-center'>
						<img src={logo} alt='Logo' className='text-white font-bold text-sm' />
					</div>
					<div>
						<div className='font-semibold text-sm'>CodePulse</div>
						<div className='text-xs text-gray-400'>Code Analytics</div>
					</div>
				</div>
				<SidebarItem
					icon={<Settings className='w-5 h-5' />}
					label='Settings'
					active={currentView === 'settings'}
					onClick={() => changeView('settings')}
				/>
			</div>

			<nav className='flex-1 overflow-y-auto p-4'>
				<div className='mb-6' title='Recent Projects'>
					<h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3'>
						Recent Projects
					</h3>
					{recentProjects.length === 0 ? (
						<div className='px-3 py-2 text-sm text-gray-500'>No recent projects</div>
					) : (
						recentProjects.map((project: LocalProject) => (
							<SidebarItem
								key={project.id}
								label={project.name}
								onClick={() => openRecentProject(project)}
								icon={<Code2 />}
								active={project.name === projectName}
							/>
						))
					)}
				</div>
			</nav>

			<div className='p-4 border-t border-gray-200'>
				<button
					onClick={selectAndScan}
					className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
				>
					<FolderOpen className='w-5 h-5' />
					Scan New Project
				</button>
			</div>
		</aside>
	)
}
