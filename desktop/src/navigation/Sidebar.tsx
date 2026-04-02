import {
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	ReactNode,
	useEffect,
	useRef,
	useState
} from 'react'
import { Code2, FolderOpen, GripVertical, Settings } from 'lucide-react'

import logo from '../assets/icon.png'
import { useMainContext } from './MainContext'
import { LocalProject } from '@/types'

const SIDEBAR_WIDTH_STORAGE_KEY = 'codepulse.sidebar.width'
const SIDEBAR_MIN_WIDTH = 220
const SIDEBAR_MAX_WIDTH = 460

function clampSidebarWidth(width: number): number {
	return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width))
}

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
	isRenaming: boolean
	renameValue: string
	onOpen: () => void
	onContextMenu: (event: ReactMouseEvent) => void
	onRenameValueChange: (value: string) => void
	onRenameCancel: () => void
	onRenameKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
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
	isRenaming,
	renameValue,
	onOpen,
	onContextMenu,
	onRenameValueChange,
	onRenameCancel,
	onRenameKeyDown,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDrop
}: ProjectSidebarItemProps) {
	return (
		<div
			draggable={!isRenaming}
			onContextMenu={onContextMenu}
			onDragStart={e => {
				if (isRenaming) {
					e.preventDefault()
					return
				}
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
				<div className='flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left'>
					<GripVertical className='h-4 w-4 text-gray-400 cursor-grab active:cursor-grabbing' />
					<Code2 className='h-4 w-4 flex-shrink-0 text-gray-700' />
					{isRenaming ? (
						<input
							autoFocus
							value={renameValue}
							onChange={event => onRenameValueChange(event.target.value)}
							onKeyDown={onRenameKeyDown}
							onBlur={onRenameCancel}
							onClick={event => event.stopPropagation()}
							className='w-full rounded-md border border-blue-300 bg-white px-2 py-1 text-sm font-medium text-gray-900 outline-none ring-0 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
						/>
					) : (
						<button onClick={onOpen} className='min-w-0 flex-1 text-left'>
							<span className='block w-full truncate text-sm font-medium text-gray-900'>
								{project.name}
							</span>
						</button>
					)}
				</div>
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
		reorderRecentProjects,
		renameRecentProject,
		deleteRecentProject
	} = useMainContext()
	const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)
	const [dropTargetId, setDropTargetId] = useState<string | null>(null)
	const [contextMenu, setContextMenu] = useState<{
		project: LocalProject
		x: number
		y: number
	} | null>(null)
	const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null)
	const [renameValue, setRenameValue] = useState('')
	const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
		if (typeof window === 'undefined') {
			return 256
		}

		const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY))
		if (Number.isNaN(storedWidth) || storedWidth <= 0) {
			return 256
		}

		return clampSidebarWidth(storedWidth)
	})
	const [isResizing, setIsResizing] = useState(false)
	const draggedProjectIdRef = useRef<string | null>(null)
	const dropTargetIdRef = useRef<string | null>(null)
	const dropHandledRef = useRef(false)
	const contextMenuRef = useRef<HTMLDivElement | null>(null)
	const sidebarRef = useRef<HTMLElement | null>(null)

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

	useEffect(() => {
		if (!contextMenu && !renamingProjectId) {
			return
		}

		function handlePointerDown(event: MouseEvent) {
			if (
				contextMenuRef.current &&
				event.target instanceof Node &&
				!contextMenuRef.current.contains(event.target)
			) {
				setContextMenu(null)
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setContextMenu(null)
				setRenamingProjectId(null)
				setRenameValue('')
			}
		}

		function handleWindowChange() {
			setContextMenu(null)
		}

		window.addEventListener('mousedown', handlePointerDown)
		window.addEventListener('keydown', handleEscape)
		window.addEventListener('resize', handleWindowChange)
		window.addEventListener('scroll', handleWindowChange, true)

		return () => {
			window.removeEventListener('mousedown', handlePointerDown)
			window.removeEventListener('keydown', handleEscape)
			window.removeEventListener('resize', handleWindowChange)
			window.removeEventListener('scroll', handleWindowChange, true)
		}
	}, [contextMenu, renamingProjectId])

	useEffect(() => {
		window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
	}, [sidebarWidth])

	useEffect(() => {
		if (!isResizing) {
			return
		}

		function handlePointerMove(event: MouseEvent) {
			if (!sidebarRef.current) {
				return
			}

			const bounds = sidebarRef.current.getBoundingClientRect()
			const nextWidth = clampSidebarWidth(event.clientX - bounds.left)
			setSidebarWidth(nextWidth)
		}

		function stopResize() {
			setIsResizing(false)
		}

		document.body.style.cursor = 'col-resize'
		document.body.style.userSelect = 'none'
		window.addEventListener('mousemove', handlePointerMove)
		window.addEventListener('mouseup', stopResize)

		return () => {
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
			window.removeEventListener('mousemove', handlePointerMove)
			window.removeEventListener('mouseup', stopResize)
		}
	}, [isResizing])

	function startSidebarResize(event: ReactMouseEvent<HTMLDivElement>) {
		event.preventDefault()
		event.stopPropagation()
		setIsResizing(true)
	}

	function openProjectContextMenu(event: ReactMouseEvent, project: LocalProject) {
		event.preventDefault()
		setContextMenu({
			project,
			x: event.clientX,
			y: event.clientY
		})
	}

	function handleRenameProject() {
		if (!contextMenu) {
			return
		}

		setRenamingProjectId(contextMenu.project.id)
		setRenameValue(contextMenu.project.name)
		setContextMenu(null)
	}

	function handleRenameCancel() {
		setRenamingProjectId(null)
		setRenameValue('')
	}

	async function handleRenameSubmit() {
		if (!renamingProjectId) {
			return
		}

		const nextName = renameValue.trim()
		if (!nextName) {
			handleRenameCancel()
			return
		}

		await renameRecentProject(renamingProjectId, nextName)
		handleRenameCancel()
	}

	function handleRenameKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			event.preventDefault()
			void handleRenameSubmit()
		}

		if (event.key === 'Escape') {
			event.preventDefault()
			handleRenameCancel()
		}
	}

	async function handleDeleteProject() {
		if (!contextMenu) {
			return
		}

		const confirmed = window.confirm(
			`Delete "${contextMenu.project.name}" from recent projects?`
		)
		if (!confirmed) {
			setContextMenu(null)
			return
		}

		await deleteRecentProject(contextMenu.project.id)
		setContextMenu(null)
	}

	const contextMenuPosition = contextMenu
		? {
				left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 180)),
				top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - 110))
			}
		: null

	return (
		<aside
			ref={sidebarRef}
			className='relative bg-gray-50 border-r text-gray-900 flex-shrink-0 flex flex-col'
			style={{ width: `${sidebarWidth}px` }}
			onContextMenu={event => {
				event.preventDefault()
			}}
		>
			<div className='p-4 border-b border-gray-200'>
				{(() => {
					const isHomeActive = currentView === 'dashboard'
					return (
						<button
							onClick={() => changeView('dashboard')}
							className={`mb-4 flex w-full items-center gap-3 rounded-lg border px-1 py-1 text-left transition-colors ${
								isHomeActive
									? 'border-blue-200 bg-blue-50 text-gray-900'
									: 'border-transparent hover:border-gray-200 hover:bg-gray-100/80'
							}`}
							aria-label='Go to Home'
						>
							<div className='w-12 h-12 rounded-lg flex items-center justify-center'>
								<img
									src={logo}
									alt='Logo'
									className='text-white font-bold text-sm'
								/>
							</div>
							<div>
								<div className='font-semibold text-sm'>CodePulse</div>
								<div className='text-xs text-gray-400'>Code Analytics</div>
							</div>
						</button>
					)
				})()}
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
					<p className='px-3 pb-2 text-xs text-gray-400'>Your biggest coding projects.</p>
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
								isRenaming={renamingProjectId === project.id}
								renameValue={renameValue}
								onOpen={() => {
									if (renamingProjectId !== project.id) {
										void openRecentProject(project)
									}
								}}
								onContextMenu={event => openProjectContextMenu(event, project)}
								onRenameValueChange={setRenameValue}
								onRenameCancel={handleRenameCancel}
								onRenameKeyDown={handleRenameKeyDown}
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
					className='group relative w-full overflow-hidden rounded-xl border border-blue-300/80 bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2.5 text-white shadow-[0_6px_18px_-10px_rgba(37,99,235,0.8)] transition-all duration-200 hover:-translate-y-[1px] hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_10px_24px_-12px_rgba(37,99,235,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50'
				>
					<span className='pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100' />
					<span className='relative flex items-center justify-center gap-2'>
						<span className='inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/18 ring-1 ring-white/25'>
							<FolderOpen className='h-4 w-4' />
						</span>
						<span className='text-sm font-semibold tracking-[0.01em]'>
							Scan New Project
						</span>
					</span>
				</button>
			</div>

			{contextMenu && contextMenuPosition && (
				<div
					ref={contextMenuRef}
					className='fixed z-50 min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg'
					style={contextMenuPosition}
					onContextMenu={event => event.preventDefault()}
				>
					<button
						onClick={() => {
							handleRenameProject()
						}}
						className='block w-full px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-100'
					>
						Rename
					</button>
					<button
						onClick={() => {
							void handleDeleteProject()
						}}
						className='block w-full px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50'
					>
						Delete
					</button>
				</div>
			)}

			<div
				role='separator'
				aria-orientation='vertical'
				aria-label='Resize sidebar'
				onMouseDown={startSidebarResize}
				className='absolute right-0 top-0 h-full w-2 cursor-col-resize group'
			>
				<div
					className={`pointer-events-none absolute right-0 top-0 h-full w-[2px] transition-colors ${
						isResizing ? 'bg-blue-400' : 'bg-transparent group-hover:bg-blue-300'
					}`}
				/>
			</div>
		</aside>
	)
}
