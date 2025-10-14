import { useState, useEffect } from 'react'
import { LogOut, User, Settings as SettingsIcon } from 'lucide-react'
import { Button } from './components/ui/Button'
import Projects from './components/Projects'
import ProjectDetails from './components/ProjectDetails'
import Dashboard from './components/Dashboard'
import WelcomePage from './pages/Welcome'
import ProfileManagement from './pages/ProfileManagement'
import ProjectSettings from './pages/ProjectSettings'
import { api, type User as ApiUser } from './lib/api'
import { open as openExternal } from '@tauri-apps/api/shell'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import type { ScanResult, UserSettings } from './types'

type User = ApiUser

function App() {
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [currentView, setCurrentView] = useState<
		'welcome' | 'projects' | 'project-details' | 'profile' | 'project-settings' | 'analysis'
	>('welcome')
	const [previousView, setPreviousView] = useState<
		'welcome' | 'projects' | 'project-details' | 'profile' | 'project-settings' | 'analysis'
	>('welcome')
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
	const [_, setAuthLoading] = useState(false)
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
			| 'analysis'
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

	function handleLogout() {
		api.clearToken()
		setCurrentUser(null)
		changeView('welcome')
	}

	async function startDeviceLogin() {
		setAuthLoading(true)
		try {
			const { code } = await api.authDeviceStart()
			// open web sign-in with device_code
			const url = `${api.WEB_BASE}/auth/signin?callbackUrl=%2F&device_code=${encodeURIComponent(code)}`
			try {
				await openExternal(url)
			} catch {
				window.open(url, '_blank')
			}
			// poll until completed
			const start = Date.now()
			const timeoutMs = 10 * 60 * 1000
			while (Date.now() - start < timeoutMs) {
				await new Promise(r => setTimeout(r, 2000))
				try {
					const res = await api.authDevicePoll(code)
					if (res.completed && res.token) {
						api.setToken(res.token as unknown as string)
						const user = await api.getCurrentUser()
						if (user) {
							setCurrentUser(user)
							changeView('projects')
							break
						}
					}
				} catch {}
			}
		} finally {
			setAuthLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-background'>
			<main>
				{currentView === 'welcome' && (
					<WelcomePage
						onContinueWithAccount={startDeviceLogin}
						onContinueWithoutAccount={handleContinueWithoutAccount}
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
						/>
					</div>
				)}

				{currentView === 'projects' && (
					<div className='container mx-auto p-6'>
						<header className='border-b mb-6'>
							<div className='flex items-center justify-between px-4 py-3'>
								<div className='flex items-center gap-2'>
									<div className='w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold'>
										CP
									</div>
									<h1 className='text-xl font-bold'>CodePulse</h1>
								</div>

								<div className='flex items-center gap-2'>
									<div className='flex items-center gap-2 text-sm text-muted-foreground'>
										<User className='h-4 w-4' />
										{currentUser?.handle || currentUser?.email || 'Guest'}
									</div>
									<Button variant='ghost' size='sm' onClick={handleLogout}>
										<LogOut className='h-4 w-4' />
									</Button>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => changeView('profile')}
									>
										<SettingsIcon className='h-4 w-4' />
									</Button>
								</div>
							</div>
						</header>

						<Projects onProjectSelect={handleProjectSelect} />
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

				{currentView === 'profile' && (
					<div className='container mx-auto p-6'>
						<ProfileManagement onBack={() => changeView('projects')} />
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
			</main>
		</div>
	)
}

export default App
