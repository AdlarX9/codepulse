import { ReactNode, useRef, useState } from 'react'
import { Code2, FolderOpen, GripVertical, Settings } from 'lucide-react'

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
				w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 border
				${
					active
						? 'border-blue-200 bg-blue-50 text-gray-900'
						: 'border-transparent text-gray-900 hover:border-gray-200 hover:bg-gray-100/80'
				}
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

interface ProjectSidebarItemProps {
	project: LocalProject
	active: boolean
	isDragging: boolean
	isDropTarget: boolean
	onOpen: () => void
	onDragStart: (projectId: string) => void
	onDragEnd: () => void
	onDragOver: () => void
	onDrop: (draggedId: string) => void
}

function ProjectSidebarItem({
	project,
	active,
	isDragging,
	isDropTarget,
	onOpen,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDrop
}: ProjectSidebarItemProps) {
	return (
		<div
			draggable
			onDragStart={e => {
				e.dataTransfer.setData('text/plain', project.id)
				e.dataTransfer.setData('text/project-id', project.id)
				e.dataTransfer.effectAllowed = 'move'
				onDragStart(project.id)
			}}
			onDragEnd={onDragEnd}
			onDragOver={e => {
				e.preventDefault()
				e.dataTransfer.dropEffect = 'move'
				onDragOver()
			}}
			onDrop={e => {
				e.preventDefault()
				const draggedId =
					e.dataTransfer.getData('text/plain') ||
					e.dataTransfer.getData('text/project-id')
				onDrop(draggedId)
			}}
			className={
				active
					? 'mb-1 rounded-lg border border-blue-200 bg-blue-50'
					: 'mb-1 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-100/80'
			}
			style={{
				opacity: isDragging ? 0.45 : 1,
				boxShadow: isDropTarget ? 'inset 0 0 0 1px rgba(59,130,246,0.45)' : 'none'
			}}
		>
			<div className='flex items-center gap-2 px-2 py-1'>
				<button
					onClick={onOpen}
					className='flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left'
				>
					<GripVertical className='h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing' />
					<Code2 className='h-4 w-4 flex-shrink-0 text-gray-700' />
					<span className='truncate text-sm font-medium text-gray-900'>
						{project.name}
					</span>
				</button>
			</div>
		</div>
	)
}

export default function Sidebar() {
	const {
		selectAndScan,
		recentProjects,
		openRecentProject,
		currentView,
		changeView,
		projectPath,
		reorderRecentProjects
	} = useMainContext()
	const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)
	const [dropTargetId, setDropTargetId] = useState<string | null>(null)
	const draggedProjectIdRef = useRef<string | null>(null)
	const dropTargetIdRef = useRef<string | null>(null)
	const dropHandledRef = useRef(false)

	function handleDrop(draggedId: string, targetId: string) {
		const sourceId = draggedId || draggedProjectId
		if (!sourceId || sourceId === targetId) {
			dropHandledRef.current = true
			setDraggedProjectId(null)
			setDropTargetId(null)
			draggedProjectIdRef.current = null
			dropTargetIdRef.current = null
			return
		}

		dropHandledRef.current = true
		void reorderRecentProjects(sourceId, targetId)
		setDraggedProjectId(null)
		setDropTargetId(null)
		draggedProjectIdRef.current = null
		dropTargetIdRef.current = null
	}

	function finalizeDragWithoutDrop() {
		const sourceId = draggedProjectIdRef.current
		const targetId = dropTargetIdRef.current
		if (!dropHandledRef.current && sourceId && targetId && sourceId !== targetId) {
			void reorderRecentProjects(sourceId, targetId)
		}

		setDraggedProjectId(null)
		setDropTargetId(null)
		draggedProjectIdRef.current = null
		dropTargetIdRef.current = null
		dropHandledRef.current = false
	}

	return (
		<aside className='w-64 bg-gray-50 border-r text-gray-900 flex-shrink-0 flex flex-col'>
			<div className='p-4 border-b border-gray-200'>
				<button
					onClick={() => changeView('dashboard')}
					className='mb-4 flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-gray-100/80'
					aria-label='Go to Home'
				>
					<div className='w-12 h-12 rounded-lg flex items-center justify-center'>
						<img src={logo} alt='Logo' className='text-white font-bold text-sm' />
					</div>
					<div>
						<div className='font-semibold text-sm'>CodePulse</div>
						<div className='text-xs text-gray-400'>Code Analytics</div>
					</div>
				</button>
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
						Projects
					</h3>
					<p className='px-3 pb-2 text-xs text-gray-400'>
						Drag and drop to customize order.
					</p>
					{recentProjects.length === 0 ? (
						<div className='px-3 py-2 text-sm text-gray-500'>No recent projects</div>
					) : (
						recentProjects.map((project: LocalProject) => (
							<ProjectSidebarItem
								key={project.id}
								project={project}
								active={
									currentView !== 'settings' &&
									currentView !== 'dashboard' &&
									project.path === projectPath
								}
								isDragging={draggedProjectId === project.id}
								isDropTarget={dropTargetId === project.id}
								onOpen={() => openRecentProject(project)}
								onDragStart={() => {
									dropHandledRef.current = false
									setDraggedProjectId(project.id)
									setDropTargetId(project.id)
									draggedProjectIdRef.current = project.id
									dropTargetIdRef.current = project.id
								}}
								onDragEnd={() => {
									finalizeDragWithoutDrop()
								}}
								onDragOver={() => {
									setDropTargetId(project.id)
									dropTargetIdRef.current = project.id
								}}
								onDrop={draggedId => handleDrop(draggedId, project.id)}
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
