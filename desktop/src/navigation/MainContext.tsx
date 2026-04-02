import { LocalProject, ScanResult } from '@/types'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api'
import { scanDirectory } from '@/handles/scan'
import { buildProjectCacheKey, getResourceSnapshot, loadResource } from '@/cache/resourceCache'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface ValueType {
	currentView: 'dashboard' | 'settings' | 'analysis'
	scanResult: ScanResult | null
	projectPath: string
	hasGit: boolean
	projectName: string
	recentProjects: LocalProject[]
	isAutoScanning: boolean
	changeView: (view: 'dashboard' | 'settings' | 'analysis') => void
	selectAndScan: () => Promise<void>
	scanProjectPath: (path: string) => Promise<boolean>
	autoScanProjects: () => Promise<void>
	openRecentProject: (project: LocalProject) => Promise<void>
	rescan: () => Promise<void>
	reorderRecentProjects: (draggedId: string, targetId: string) => Promise<void>
	renameRecentProject: (projectId: string, newName: string) => Promise<void>
	deleteRecentProject: (projectId: string) => Promise<void>
	cn: (...inputs: ClassValue[]) => string
}

const MainContext = createContext<ValueType | undefined>(undefined)

export const MainContextProvider = ({ children }: React.PropsWithChildren<{}>) => {
	const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'analysis'>(
		'dashboard'
	)
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [projectPath, setProjectPath] = useState<string>('')
	const projectPathRef = React.useRef('')
	const [hasGit, setHasGit] = useState<boolean>(false)
	const [projectName, setProjectName] = useState<string>('Project')
	const [recentProjects, setRecentProjects] = useState<LocalProject[]>([])
	const [isAutoScanning, setIsAutoScanning] = useState(false)

	useEffect(() => {
		void loadRecentProjects()
	}, [])

	useEffect(() => {
		projectPathRef.current = projectPath
	}, [projectPath])

	useEffect(() => {
		if (!projectPath) {
			setHasGit(false)
			return
		}

		void (async () => {
			try {
				const diff = await invoke<Record<string, [number, number]>>('get_loc_diff', {
					path: projectPath
				})
				setHasGit(Object.keys(diff).length > 0)
			} catch {
				setHasGit(false)
			}
		})()
	}, [projectPath])

	async function loadRecentProjects() {
		try {
			const stored = await invoke<Array<Record<string, unknown>>>('load_projects')
			const projects: LocalProject[] = (stored || [])
				.map(item => ({
					id: String(item.id ?? ''),
					name: String(item.name ?? 'Project'),
					path: String(item.path ?? '')
				}))
				.filter(p => p.id && p.path)
			setRecentProjects(projects)
		} catch (e) {
			console.error('Failed to load recent projects:', e)
			setRecentProjects([])
		}
	}

	async function autoScanProjects() {
		if (isAutoScanning) {
			return
		}

		setIsAutoScanning(true)
		try {
			const scanned = await invoke<Array<Record<string, unknown>>>('auto_scan_projects')
			const projects: LocalProject[] = (scanned || [])
				.map(item => ({
					id: String(item.id ?? ''),
					name: String(item.name ?? 'Project'),
					path: String(item.path ?? '')
				}))
				.filter(p => p.id && p.path)
			setRecentProjects(projects)
		} catch (e) {
			console.error('Failed to auto scan projects:', e)
		} finally {
			setIsAutoScanning(false)
		}
	}

	async function saveRecentProject(path: string, name: string) {
		try {
			const project: LocalProject = {
				id: path,
				name,
				path
			}
			await invoke('upsert_project', { project })
			await loadRecentProjects()
		} catch (e) {
			console.error('Failed to save recent project:', e)
		}
	}

	function getProjectNameFromPath(path: string): string {
		const normalizedPath = path.replace(/\\/g, '/').replace(/\/+$/, '')
		const parts = normalizedPath.split('/').filter(Boolean)
		return parts[parts.length - 1] || 'Project'
	}

	async function runScanPipeline(
		path: string,
		preferredName?: string,
		persistProject = true
	): Promise<boolean> {
		const normalizedPath = path.trim()
		if (!normalizedPath) {
			return false
		}

		const resolvedName = (
			preferredName?.trim() || getProjectNameFromPath(normalizedPath)
		).trim()
		const cacheKey = buildProjectCacheKey('scan-directory', normalizedPath)
		const cachedSnapshot = getResourceSnapshot<ScanResult>(cacheKey)
		const loadScanResult = () => scanDirectory(normalizedPath)

		try {
			if (cachedSnapshot.data) {
				setProjectPath(normalizedPath)
				projectPathRef.current = normalizedPath
				setProjectName(resolvedName || 'Project')
				changeView('analysis')
				setScanResult(cachedSnapshot.data)
				void loadResource(cacheKey, loadScanResult, { force: true })
					.then(result => {
						if (projectPathRef.current === normalizedPath) {
							setScanResult(result)
						}
					})
					.catch(() => {
						// Keep the cached result visible if the refresh fails.
					})
			} else {
				const result = await loadResource(cacheKey, loadScanResult)
				setProjectPath(normalizedPath)
				projectPathRef.current = normalizedPath
				setProjectName(resolvedName || 'Project')
				changeView('analysis')
				if (projectPathRef.current === normalizedPath) {
					setScanResult(result)
				}
			}

			if (persistProject) {
				await saveRecentProject(normalizedPath, resolvedName || 'Project')
			}

			return true
		} catch (e) {
			console.error('Failed to scan project path:', e)
			return false
		}
	}

	async function reorderRecentProjects(draggedId: string, targetId: string) {
		if (!draggedId || !targetId || draggedId === targetId) {
			return
		}

		const fromIndex = recentProjects.findIndex(p => p.id === draggedId)
		const toIndex = recentProjects.findIndex(p => p.id === targetId)
		if (fromIndex < 0 || toIndex < 0) {
			return
		}

		const next = [...recentProjects]
		const [moved] = next.splice(fromIndex, 1)
		next.splice(toIndex, 0, moved)

		setRecentProjects(next)
		try {
			await invoke('set_projects_order', { projects: next })
		} catch (e) {
			console.error('Failed to persist projects order:', e)
			await loadRecentProjects()
		}
	}

	async function renameRecentProject(projectId: string, newName: string) {
		const trimmedName = newName.trim()
		if (!projectId || !trimmedName) {
			return
		}

		const current = recentProjects.find(project => project.id === projectId)
		if (!current) {
			return
		}

		const nextProject: LocalProject = {
			...current,
			name: trimmedName
		}

		setRecentProjects(prev =>
			prev.map(project => (project.id === projectId ? nextProject : project))
		)

		if (projectPath === current.path) {
			setProjectName(trimmedName)
		}

		try {
			await invoke('upsert_project', { project: nextProject })
		} catch (e) {
			console.error('Failed to rename project:', e)
			await loadRecentProjects()
		}
	}

	async function deleteRecentProject(projectId: string) {
		if (!projectId) {
			return
		}

		const current = recentProjects.find(project => project.id === projectId)
		setRecentProjects(prev => prev.filter(project => project.id !== projectId))

		if (current && projectPath === current.path) {
			setProjectPath('')
			projectPathRef.current = ''
			setProjectName('Project')
			setScanResult(null)
			setHasGit(false)
			setCurrentView('dashboard')
		}

		try {
			await invoke('delete_project', { id: projectId })
		} catch (e) {
			console.error('Failed to delete project:', e)
			await loadRecentProjects()
		}
	}

	function changeView(view: 'dashboard' | 'settings' | 'analysis') {
		setCurrentView(view)
	}

	async function selectAndScan() {
		// Ouvrir le sélecteur de dossier
		const selected = (await openDialog({
			directory: true,
			multiple: false
		})) as string | null

		if (!selected) {
			return
		}

		await runScanPipeline(selected)
	}

	async function scanProjectPath(path: string): Promise<boolean> {
		return runScanPipeline(path)
	}

	async function openRecentProject(project: LocalProject) {
		await runScanPipeline(project.path, project.name || 'Project', false)
	}

	async function rescan() {
		if (!projectPath) return

		try {
			const cacheKey = buildProjectCacheKey('scan-directory', projectPath)
			const result = await loadResource(cacheKey, () => scanDirectory(projectPath), {
				force: true
			})
			if (projectPathRef.current === projectPath) {
				setScanResult(result)
			}
		} catch (e) {
			console.error('Failed to rescan:', e)
		}
	}

	const cn = (...inputs: ClassValue[]) => {
		return twMerge(clsx(inputs))
	}

	return (
		<MainContext.Provider
			value={{
				currentView,
				scanResult,
				projectPath,
				hasGit,
				projectName,
				recentProjects,
				isAutoScanning,
				changeView,
				selectAndScan,
				scanProjectPath,
				autoScanProjects,
				openRecentProject,
				rescan,
				reorderRecentProjects,
				renameRecentProject,
				deleteRecentProject,
				cn
			}}
		>
			{children}
		</MainContext.Provider>
	)
}

export const useMainContext = () => {
	const context = useContext(MainContext)
	if (!context) {
		throw new Error('useMainContext must be used within MainContextProvider')
	}
	return context
}
