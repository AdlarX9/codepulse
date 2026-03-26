import { LocalProject, ScanResult } from '@/types'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api'
import { scanDirectory } from '@/handles/scan'

interface ValueType {
	currentView: 'dashboard' | 'settings' | 'analysis'
	scanResult: ScanResult | null
	projectPath: string
	hasGit: boolean
	projectName: string
	recentProjects: LocalProject[]
	changeView: (view: 'dashboard' | 'settings' | 'analysis') => void
	selectAndScan: () => Promise<void>
	openRecentProject: (project: LocalProject) => Promise<void>
	rescan: () => Promise<void>
}

const MainContext = createContext<ValueType | undefined>(undefined)

export const MainContextProvider = ({ children }: React.PropsWithChildren<{}>) => {
	const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'analysis'>(
		'dashboard'
	)
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [projectPath, setProjectPath] = useState<string>('')
	const [hasGit, setHasGit] = useState<boolean>(false)
	const [projectName, setProjectName] = useState<string>('Project')
	const [recentProjects, setRecentProjects] = useState<LocalProject[]>([])

	useEffect(() => {
		void loadRecentProjects()
	}, [])

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
					path: String(item.path ?? ''),
					lastScanned: item.lastScanned ? String(item.lastScanned) : undefined
				}))
				.filter(p => p.id && p.path)
				.sort((a, b) => (b.lastScanned || '').localeCompare(a.lastScanned || ''))
			setRecentProjects(projects)
		} catch (e) {
			console.error('Failed to load recent projects:', e)
			setRecentProjects([])
		}
	}

	async function saveRecentProject(path: string, name: string) {
		try {
			const project: LocalProject = {
				id: path,
				name,
				path,
				lastScanned: new Date().toISOString()
			}
			await invoke('upsert_project', { project })
			await loadRecentProjects()
		} catch (e) {
			console.error('Failed to save recent project:', e)
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

		if (!selected) return

		const newProjectName = selected.split('/').pop() || 'Project'
		setProjectPath(selected)
		setProjectName(newProjectName)

		const result = await scanDirectory(selected)

		setScanResult(result)
		changeView('analysis')

		await saveRecentProject(selected, newProjectName)
	}

	async function openRecentProject(project: LocalProject) {
		setProjectPath(project.path)
		setProjectName(project.name || 'Project')

		try {
			const result = await scanDirectory(project.path)

			setScanResult(result)
			changeView('analysis')

			await saveRecentProject(project.path, project.name || 'Project')
		} catch (e) {
			console.error('Failed to scan project:', e)
		}
	}

	async function rescan() {
		if (!projectPath) return

		try {
			const result = await scanDirectory(projectPath)
			setScanResult(result)
		} catch (e) {
			console.error('Failed to rescan:', e)
		}
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
				changeView,
				selectAndScan,
				openRecentProject,
				rescan
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
