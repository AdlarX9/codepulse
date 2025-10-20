import { useState, useEffect } from 'react'
import Projects from './components/Projects'
import {
	DashboardLayout,
	OverviewDashboard,
	EvolutionDashboard,
	QualityDashboard,
	ContributorsDashboard
} from './components/dashboards'
import ExportButton from './components/export/ExportButton'
import WelcomePage from './pages/Welcome'
import ProjectSettings from './pages/ProjectSettings'
import ProfileManagement from './pages/ProfileManagement'
import { api, type User as ApiUser } from './lib/api'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import type { Project, ScanResult, ScanSettings } from './types'
import ScanSettingsPage from './components/ScanSettings'
import UserSettingsPage from './components/UserSettings'
import AuthPage from './pages/Auth'
import * as git from './lib/git'
import {
	Sidebar,
	SidebarHeader,
	SidebarBody,
	SidebarFooter,
	SidebarItem,
	SidebarSection
} from './components/ui/Sidebar'
import logo from './assets/icon.png'
import { Code2, Settings } from 'lucide-react'

type User = ApiUser

function App() {
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [currentView, setCurrentView] = useState<
		| 'welcome'
		| 'projects'
		| 'project-details'
		| 'profile'
		| 'project-settings'
		| 'scan-settings'
		| 'user-settings'
		| 'settings'
		| 'analysis'
		| 'auth'
	>('welcome')
	const [settingsTab, setSettingsTab] = useState<'scan' | 'user'>('scan')
	const [previousView, setPreviousView] = useState<
		| 'welcome'
		| 'projects'
		| 'project-details'
		| 'profile'
		| 'project-settings'
		| 'scan-settings'
		| 'user-settings'
		| 'settings'
		| 'analysis'
		| 'auth'
	>('welcome')
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [scanPath, setScanPath] = useState<string>('')
	const [hasGit, setHasGit] = useState<boolean>(false)
	const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null)
	const [projects, setProjects] = useState<Project[]>([])

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
			loadProjects()
		}
		init()
	}, [])

	async function loadProjects() {
		const mapped = await api.loadProjects()
		setProjects(mapped)
	}

	async function openProject(projectId: string) {
		try {
			// Load details (for name and settings)
			const details = await api.getProjectDetails(projectId)
			const p = details.project || details
			setSelectedProjectId(projectId)
			setSelectedProjectName(p.name || 'Project')

			// Ensure path binding
			let boundPath = await invoke<string | null>('get_project_binding', {
				projectId
			})
			if (!boundPath) {
				const selected = (await openDialog({
					directory: true,
					multiple: false
				})) as string | null
				if (!selected) return
				await invoke('set_project_binding', { projectId, basePath: selected })
				boundPath = selected
			}

			// Merge settings (project overrides)
			const settings = await invoke<ScanSettings>('get_scan_settings')
			const ps = (p.settings as any) || {}
			const overrideKeys: (keyof ScanSettings)[] = [
				'excluded_dirs',
				'excluded_extensions',
				'excluded_patterns',
				'follow_symlinks',
				'excluded_languages',
				'allowed_languages'
			]
			for (const k of overrideKeys)
				if (ps && ps[k] !== undefined) (settings as any)[k] = ps[k]

			// Scan
			const result = await invoke<ScanResult>('scan_directory', {
				path: boundPath,
				scanSettings: settings
			})
			setScanPath(boundPath)
			setScanResult(result)
			changeView('analysis')
		} catch (e) {
			console.error('Open project failed', e)
		}
	}

	useEffect(() => {
		// Check if current scan path has Git
		if (scanPath) {
			git.isGitRepository(scanPath)
				.then(setHasGit)
				.catch(() => setHasGit(false))
		}
	}, [scanPath])

	function changeView(
		view:
			| 'welcome'
			| 'projects'
			| 'project-details'
			| 'profile'
			| 'project-settings'
			| 'scan-settings'
			| 'user-settings'
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
		setSelectedProjectId(null)
		setSelectedProjectName(selected.split('/').pop() || 'Project')
		// load settings and scan
		const settings = await invoke<ScanSettings>('get_scan_settings')
		const result = await invoke<ScanResult>('scan_directory', {
			path: selected,
			scanSettings: settings
		})
		setScanResult(result)
		changeView('analysis')
	}

	async function handleContinueWithoutAccount() {
		await selectAndScan()
	}

	async function handleLogout() {
		try {
			await api.clearToken()
		} finally {
			setCurrentUser(null)
			setScanResult(null)
			setScanPath('')
			setSelectedProjectId(null)
			changeView('welcome')
		}
	}

	function renderSettings() {
		switch (settingsTab) {
			case 'scan':
				return <ScanSettingsPage />
				break
			case 'user':
				return <UserSettingsPage />
				break
			default:
				return null
		}
	}

	return (
		<div className='min-h-screen bg-background'>
			<main>
				{currentView === 'welcome' && (
					<WelcomePage
						onContinueWithAccount={() => changeView('auth')}
						onContinueWithoutAccount={handleContinueWithoutAccount}
						onOpenSettings={() => changeView('scan-settings')}
					/>
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

				{currentView === 'user-settings' && !currentUser && (
					<div className='container mx-auto p-6'>
						<UserSettingsPage onBack={() => changeView(previousView)} />
					</div>
				)}

				{currentView === 'scan-settings' && !currentUser && (
					<div className='container mx-auto p-6'>
						<ScanSettingsPage onBack={() => changeView(previousView)} />
					</div>
				)}

				{currentUser &&
					currentView !== 'welcome' &&
					currentView !== 'auth' &&
					currentUser && (
						<div className='flex h-screen'>
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
											<div className='text-xs text-gray-400'>
												{currentUser.email}
											</div>
										</div>
									</div>
									<SidebarItem
										icon={<Settings className='w-5 h-5'/>}
										label='Settings'
										active={currentView === 'settings'}
										onClick={() => changeView('settings')}
									/>
								</SidebarHeader>
								<SidebarBody>
									<SidebarSection title='Main'>
										<SidebarItem
											icon={
												<svg
													className='w-5 h-5'
													fill='none'
													viewBox='0 0 24 24'
													stroke='currentColor'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
													/>
												</svg>
											}
											label='Overview'
											active={
												currentView === 'projects' ||
												currentView === 'project-details' ||
												currentView === 'project-settings'
											}
											onClick={() => changeView('projects')}
										/>

										<SidebarItem
											icon={
												<svg
													className='w-5 h-5'
													fill='none'
													viewBox='0 0 24 24'
													stroke='currentColor'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
													/>
												</svg>
											}
											label='Profile'
											active={currentView === 'profile'}
											onClick={() => changeView('profile')}
										/>
									</SidebarSection>
									<SidebarSection title='Projects'>
										{projects.map((project: Project) => (
											<SidebarItem
												key={project.id}
												label={project.name}
												onClick={() => openProject(project.id)}
												active={
													currentView === 'analysis' &&
													selectedProjectId === project.id
												}
												icon={<Code2 />}
											/>
										))}
									</SidebarSection>
								</SidebarBody>
								<SidebarFooter>
									<button
										onClick={selectAndScan}
										className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
									>
										<svg
											className='w-5 h-5'
											fill='none'
											viewBox='0 0 24 24'
											stroke='currentColor'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
											/>
										</svg>
										Quick Scan
									</button>
									<button
										onClick={handleLogout}
										className='w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 text-gray-800 hover:text-red-500 transition-colors'
									>
										<svg
											className='w-5 h-5'
											fill='none'
											viewBox='0 0 24 24'
											stroke='currentColor'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
											/>
										</svg>
										Logout
									</button>
								</SidebarFooter>
							</Sidebar>
							<div className='flex-1 overflow-y-auto'>
								{currentView === 'projects' && (
									<Projects
										onProjectSelect={(proj: any) => openProject(proj.id)}
										onOpenProjectSettings={(id: string) => {
											setSelectedProjectId(id)
											changeView('project-settings')
										}}
									/>
								)}
								{currentView === 'profile' && (
									<ProfileManagement
										onBack={() => changeView('projects')}
										onLogout={handleLogout}
									/>
								)}
								{currentView === 'project-settings' && selectedProjectId && (
									<ProjectSettings
										projectId={selectedProjectId}
										onBack={() => changeView('analysis')}
									/>
								)}
								{currentView === 'settings' && (
									<div className='space-y-4'>
										<header className='border-b border-gray-200 pb-14'>
											<nav className='-mb-px flex space-x-8 px-8 pt-5 fixed z-10 bg-white border-b w-full'>
												<button
													onClick={() => setSettingsTab('scan')}
													className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
														settingsTab === 'scan'
															? 'border-blue-500 text-blue-600'
															: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
													}`}
												>
													Scan Settings
												</button>
												<button
													onClick={() => setSettingsTab('user')}
													className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
														settingsTab === 'user'
															? 'border-blue-500 text-blue-600'
															: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
													}`}
												>
													User Settings
												</button>
											</nav>
										</header>
										{renderSettings()}
									</div>
								)}
								{currentView === 'analysis' && scanResult && (
									<div className='container mx-auto p-6'>
										<div className='mb-4 flex justify-between items-center'>
											<button
												onClick={() => {
													setScanResult(null)
													changeView(previousView)
												}}
												className='px-4 py-2 text-gray-600 hover:text-gray-900'
											>
												← Back
											</button>
											<div className='flex gap-2'>
												<button
													onClick={selectAndScan}
													className='px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded'
												>
													Choose Folder
												</button>
												<button
													onClick={async () => {
														if (!scanPath) return
														const settings =
															await invoke<ScanSettings>(
																'get_scan_settings'
															)
														const result = await invoke<ScanResult>(
															'scan_directory',
															{
																path: scanPath,
																scanSettings: settings
															}
														)
														setScanResult(result)
													}}
													className='px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded'
												>
													Rescan
												</button>
											</div>
										</div>
										<DashboardLayout
											projectId=''
											projectName={
												selectedProjectName ||
												scanPath.split('/').pop() ||
												'Project'
											}
											hasGit={hasGit}
											headerRight={
												scanResult ? (
													<div className='flex items-center gap-2'>
														<ExportButton
															scanResult={scanResult}
															projectName={
																selectedProjectName || 'Project'
															}
														/>
														{selectedProjectId && (
															<button
																onClick={() =>
																	changeView('project-settings')
																}
																className='px-3 py-2 border rounded text-sm hover:bg-gray-50'
															>
																Edit
															</button>
														)}
													</div>
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
													case 'evolution':
														return (
															<EvolutionDashboard
																projectPath={scanPath}
																hasGit={hasGit}
																scanResult={scanResult}
															/>
														)
													case 'quality':
														return (
															<QualityDashboard
																scanResult={scanResult}
															/>
														)
													case 'contributors':
														return (
															<ContributorsDashboard
																projectPath={scanPath}
																hasGit={hasGit}
															/>
														)
												}
											}}
										</DashboardLayout>
									</div>
								)}
							</div>
						</div>
					)}
			</main>
		</div>
	)
}

export default App
