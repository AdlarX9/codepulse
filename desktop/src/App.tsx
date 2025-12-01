import { useState, useEffect } from 'react'
import { Code2, Settings, FolderOpen } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'

import {
	DashboardLayout,
	OverviewDashboard,
	ProductivityDashboard,
	QualityDashboard,
	ContributorsDashboard
} from './components/dashboards'
import {
	Sidebar,
	SidebarHeader,
	SidebarBody,
	SidebarFooter,
	SidebarItem,
	SidebarSection
} from './components/ui/Sidebar'
import { ExportButton, ExportCenter } from './components/Export'
import type { ScanResult, ScanSettings } from './types'
import ScanSettingsPage from './components/ScanSettings'
import * as git from './lib/git'
import logo from './assets/icon.png'

// Interface pour les projets locaux stockés
interface LocalProject {
	id: string
	name: string
	path: string
	lastScanned?: string
}

function App() {
	const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'analysis'>(
		'dashboard'
	)
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [scanPath, setScanPath] = useState<string>('')
	const [hasGit, setHasGit] = useState<boolean>(false)
	const [selectedProjectName, setSelectedProjectName] = useState<string>('Project')
	const [recentProjects, setRecentProjects] = useState<LocalProject[]>([])

	// Charger les projets récents au démarrage
	useEffect(() => {
		loadRecentProjects()
	}, [])

	// Vérifier si le projet a Git quand le chemin change
	useEffect(() => {
		if (scanPath) {
			git.isGitRepository(scanPath)
				.then(setHasGit)
				.catch(() => setHasGit(false))
		}
	}, [scanPath])

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

		const projectName = selected.split('/').pop() || 'Project'
		setScanPath(selected)
		setSelectedProjectName(projectName)

		// Charger les paramètres de scan et lancer l'analyse
		const settings = await invoke<ScanSettings>('get_scan_settings')
		const result = await invoke<ScanResult>('scan_directory', {
			path: selected,
			scanSettings: settings
		})

		setScanResult(result)
		changeView('analysis')

		// Sauvegarder dans les projets récents
		await saveRecentProject(selected, projectName)
	}

	async function openRecentProject(project: LocalProject) {
		setScanPath(project.path)
		setSelectedProjectName(project.name)

		try {
			const settings = await invoke<ScanSettings>('get_scan_settings')
			const result = await invoke<ScanResult>('scan_directory', {
				path: project.path,
				scanSettings: settings
			})

			setScanResult(result)
			changeView('analysis')

			// Mettre à jour la date de dernier scan
			await saveRecentProject(project.path, project.name)
		} catch (e) {
			console.error('Failed to scan project:', e)
		}
	}

	async function rescan() {
		if (!scanPath) return

		try {
			const settings = await invoke<ScanSettings>('get_scan_settings')
			const result = await invoke<ScanResult>('scan_directory', {
				path: scanPath,
				scanSettings: settings
			})
			setScanResult(result)
		} catch (e) {
			console.error('Failed to rescan:', e)
		}
	}

	return (
		<div className='min-h-screen bg-background'>
			<main className='flex h-screen'>
				<Sidebar>
					<SidebarHeader>
						<div className='flex items-center gap-3 mb-4'>
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
						</div>
						<SidebarItem
							icon={<Settings className='w-5 h-5' />}
							label='Settings'
							active={currentView === 'settings'}
							onClick={() => changeView('settings')}
						/>
					</SidebarHeader>

					<SidebarBody>
						<SidebarSection title='Recent Projects'>
							{recentProjects.length === 0 ? (
								<div className='px-3 py-2 text-sm text-gray-500'>
									No recent projects
								</div>
							) : (
								recentProjects.map(project => (
									<SidebarItem
										key={project.id}
										label={project.name}
										onClick={() => openRecentProject(project)}
										active={
											currentView === 'analysis' && scanPath === project.path
										}
										icon={<Code2 />}
									/>
								))
							)}
						</SidebarSection>
					</SidebarBody>

					<SidebarFooter>
						<button
							onClick={selectAndScan}
							className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
						>
							<FolderOpen className='w-5 h-5' />
							Scan New Project
						</button>
					</SidebarFooter>
				</Sidebar>

				<div className='flex-1 overflow-y-auto'>
					{currentView === 'dashboard' && (
						<div className='container mx-auto p-6'>
							<div className='max-w-4xl mx-auto'>
								<div className='text-center mb-12'>
									<h1 className='text-4xl font-bold mb-4'>
										Welcome to CodePulse
									</h1>
									<p className='text-lg text-gray-600 mb-8'>
										Analyze your codebase instantly. All processing happens
										locally on your machine.
									</p>
									<button
										onClick={selectAndScan}
										className='px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium flex items-center gap-2 mx-auto'
									>
										<FolderOpen className='w-5 h-5' />
										Select a Project to Scan
									</button>
								</div>

								{recentProjects.length > 0 && (
									<div className='mt-12'>
										<h2 className='text-2xl font-semibold mb-4'>
											Recent Projects
										</h2>
										<div className='grid gap-4'>
											{recentProjects.map(project => (
												<button
													key={project.id}
													onClick={() => openRecentProject(project)}
													className='p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left'
												>
													<div className='flex items-center gap-3'>
														<Code2 className='w-5 h-5 text-blue-600' />
														<div>
															<div className='font-medium'>
																{project.name}
															</div>
															<div className='text-sm text-gray-500'>
																{project.path}
															</div>
														</div>
													</div>
												</button>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{currentView === 'settings' && (
						<div className='container mx-auto p-6'>
							<ScanSettingsPage onBack={() => changeView('dashboard')} />
						</div>
					)}

					{currentView === 'analysis' && scanResult && (
						<div className='container mx-auto p-6'>
							<div className='mb-4 flex justify-between items-center'>
								<button
									onClick={() => {
										setScanResult(null)
										changeView('dashboard')
									}}
									className='px-4 py-2 text-gray-600 hover:text-gray-900'
								>
									← Back to Dashboard
								</button>
								<div className='flex gap-2'>
									<button
										onClick={selectAndScan}
										className='px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded'
									>
										Choose Different Folder
									</button>
									<button
										onClick={rescan}
										className='px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded'
									>
										Rescan
									</button>
								</div>
							</div>

							<DashboardLayout
								projectId={scanPath}
								projectName={selectedProjectName}
								hasGit={hasGit}
								headerRight={
									scanResult ? (
										<ExportButton
											scanResult={scanResult}
											projectName={selectedProjectName}
										/>
									) : null
								}
							>
								{activeTab => {
									switch (activeTab) {
										case 'overview':
											return (
												<OverviewDashboard
													scanResult={scanResult}
													projectPath={scanPath}
												/>
											)
										case 'productivity':
											return (
												<ProductivityDashboard
													projectPath={scanPath}
													hasGit={hasGit}
													scanResult={scanResult}
												/>
											)
										case 'quality':
											return (
												<QualityDashboard
													scanResult={scanResult}
													projectPath={scanPath}
													hasGit={hasGit}
												/>
											)
										case 'contributors':
											return (
												<ContributorsDashboard
													projectPath={scanPath}
													hasGit={hasGit}
												/>
											)
										case 'exports':
											return (
												<ExportCenter
													scanResult={scanResult}
													projectName={selectedProjectName}
												/>
											)
										default:
											return null
									}
								}}
							</DashboardLayout>
						</div>
					)}
				</div>
			</main>
		</div>
	)
}

export default App
