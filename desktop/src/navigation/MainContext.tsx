import { LocalProject, ScanResult } from '@/types'
import React, { createContext, useContext, useEffect, useState } from 'react'
import * as git from '@/handles/git'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { getScanSettings } from '@/features/settings/invokes'
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

	// Charger les projets récents au démarrage
	useEffect(() => {
		loadRecentProjects()
	}, [])

	// Vérifier si le projet a Git quand le chemin change
	useEffect(() => {
		if (projectPath) {
			git.isGitRepository(projectPath)
				.then(setHasGit)
				.catch(() => setHasGit(false))
		}
	}, [projectPath])

	async function loadRecentProjects() {
		try {
			// Charger les projets depuis le localStorage Tauri
			const stored = localStorage.getItem('recent-projects')
			if (stored) {
				setRecentProjects(JSON.parse(stored))
			}
		} catch (e) {
			console.error('Failed to load recent projects:', e)
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

			// Ajouter au début et garder max 10 projets
			const updated = [project, ...recentProjects.filter(p => p.path !== path)].slice(0, 10)

			setRecentProjects(updated)
			localStorage.setItem('recent-projects', JSON.stringify(updated))
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

		// Charger les paramètres de scan et lancer l'analyse
		const settings = await getScanSettings()
		const result = await scanDirectory(selected, settings)

		setScanResult(result)
		changeView('analysis')

		// Sauvegarder dans les projets récents
		await saveRecentProject(selected, projectName)
	}

	async function openRecentProject(project: LocalProject) {
		setProjectPath(project.path)
		setProjectName(project.name)

		try {
			const settings = await getScanSettings()
			const result = await scanDirectory(project.path, settings)

			setScanResult(result)
			changeView('analysis')

			// Mettre à jour la date de dernier scan
			await saveRecentProject(project.path, project.name)
		} catch (e) {
			console.error('Failed to scan project:', e)
		}
	}

	async function rescan() {
		if (!projectPath) return

		try {
			const settings = await getScanSettings()
			const result = await scanDirectory(projectPath, settings)
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
