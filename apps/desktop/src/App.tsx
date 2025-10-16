import { useState, useEffect } from 'react'
import Projects from './components/Projects'
import ProjectDetails from './components/ProjectDetails'
import Dashboard from './components/Dashboard'
import WelcomePage from './pages/Welcome'
import ProjectSettings from './pages/ProjectSettings'
import { ConsoleOverlay } from './components/ConsoleOverlay'
import { api, type User as ApiUser } from './lib/api'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import type { ScanResult, UserSettings } from './types'
import SettingsPage from './components/Settings'
import AuthPage from './pages/Auth'

type User = ApiUser

function App() {
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [currentView, setCurrentView] = useState<
		| 'welcome'
		| 'projects'
		| 'project-details'
		| 'profile'
		| 'project-settings'
		| 'settings'
		| 'analysis'
		| 'auth'
	>('welcome')
	const [previousView, setPreviousView] = useState<
		| 'welcome'
		| 'projects'
		| 'project-details'
		| 'profile'
		| 'project-settings'
		| 'settings'
		| 'analysis'
		| 'auth'
	>('welcome')
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [scanPath, setScanPath] = useState<string>('')

	useEffect(() => {
		// Check if user is authenticated on startup
		const init = async () => {
			const user = await api.getCurrentUser()
			if (user) {
				setCurrentUser(user)
				setCurrentView('projects')
			} else {
				setCurrentView('welcome')
			}
		}
		init()
	}, [])

	function changeView(
		view:
			| 'welcome'
			| 'projects'
			| 'project-details'
			| 'profile'
			| 'project-settings'
			| 'settings'
			| 'analysis'
			| 'auth'
	) {
		if (view !== currentView) {
			setPreviousView(currentView)
		}
		setCurrentView(view)
	}

	async function selectAndScan() {
		// pick a directory
		const selected = (await openDialog({ directory: true, multiple: false })) as string | null
		if (!selected) return
		setScanPath(selected)
		// load settings and scan
		const settings = await invoke<UserSettings>('get_settings')
		const result = await invoke<ScanResult>('scan_directory', { path: selected, settings })
		setScanResult(result)
		changeView('analysis')
	}

	async function handleContinueWithoutAccount() {
		await selectAndScan()
	}

	function handleProjectSelect(project: any) {
		setSelectedProjectId(project.id)
		changeView('project-details')
	}

	function handleBackToProjects() {
		changeView('projects')
		setSelectedProjectId(null)
	}

	async function handleLogout() {
		try {
			await api.clearToken()
		} finally {
			setCurrentUser(null)
			changeView('welcome')
		}
	}

	return (
		<div className='min-h-screen bg-background'>
			<ConsoleOverlay />
			<main>
				{currentView === 'welcome' && (
					<WelcomePage
						onContinueWithAccount={() => changeView('auth')}
						onContinueWithoutAccount={handleContinueWithoutAccount}
						onOpenSettings={() => changeView('settings')}
					/>
				)}

				{currentView === 'analysis' && scanResult && (
					<div className='container mx-auto p-6'>
						<Dashboard
							result={scanResult}
							onReset={() => {
								setScanResult(null)
								changeView(previousView)
							}}
							onChooseFolder={selectAndScan}
							onRescan={async () => {
								if (!scanPath) return
								const settings = await invoke<UserSettings>('get_settings')
								const result = await invoke<ScanResult>('scan_directory', {
									path: scanPath,
									settings
								})
								setScanResult(result)
							}}
							onOpenSettings={() => changeView('settings')}
						/>
					</div>
				)}

				{currentView === 'projects' && (
					<div className='container mx-auto p-6'>
						<Projects
							onProjectSelect={handleProjectSelect}
							onLogout={handleLogout}
							onOpenSettings={() => changeView('settings')}
							onOpenProjectSettings={(id: string) => {
								setSelectedProjectId(id)
								changeView('project-settings')
							}}
							onStartIndividualScan={selectAndScan}
							currentUser={currentUser}
						/>
					</div>
				)}

				{currentView === 'project-details' && selectedProjectId && (
					<div className='container mx-auto p-6'>
						<ProjectDetails
							projectId={selectedProjectId}
							onBack={handleBackToProjects}
							onOpenSettings={() => changeView('project-settings')}
						/>
					</div>
				)}

				{currentView === 'settings' && (
					<div className='container mx-auto p-6'>
						<SettingsPage onBack={() => changeView(previousView)} />
					</div>
				)}

				{currentView === 'project-settings' && selectedProjectId && (
					<div className='container mx-auto p-6'>
						<ProjectSettings
							projectId={selectedProjectId}
							onBack={() => changeView('project-details')}
						/>
					</div>
				)}

				{currentView === 'auth' && (
					<div className='container mx-auto p-6'>
						<AuthPage
							onSuccess={async (user, token) => {
								try {
									await api.setToken(token)
									const refreshed = await api.getCurrentUser()
									if (refreshed) {
										setCurrentUser(refreshed)
									} else {
										setCurrentUser({
											// minimal mapping fallback
											id: (user as any).id,
											email: (user as any).email,
											handle: (user as any)?.profile?.handle
										} as any)
									}
									changeView('projects')
								} catch (e) {
									console.error('Post-auth handling failed:', e)
									changeView('projects')
								}
							}}
							onBack={() => changeView('welcome')}
						/>
					</div>
				)}
			</main>
		</div>
	)
}

export default App
