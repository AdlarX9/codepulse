import { useState, useEffect } from 'react'
import Projects from './components/Projects'
import ProjectDetails from './components/ProjectDetails'
import Dashboard from './components/Dashboard'
import WelcomePage from './pages/Welcome'
import ProjectSettings from './pages/ProjectSettings'
import ProfileManagement from './pages/ProfileManagement'
import { ConsoleOverlay } from './components/ConsoleOverlay'
import { api, type User as ApiUser } from './lib/api'
import { orgApi } from './lib/api-org'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import type { ScanResult, UserSettings } from './types'
import type { Organization } from './types/organization'
import SettingsPage from './components/Settings'
import AuthPage from './pages/Auth'
import OrganizationPage from './pages/OrganizationPage'
import AnalyticsPage from './pages/AnalyticsPage'
import {
	Sidebar,
	SidebarHeader,
	SidebarBody,
	SidebarFooter,
	SidebarItem,
	SidebarSection
} from './components/ui/Sidebar'

type User = ApiUser

function App() {
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [userOrgs, setUserOrgs] = useState<Organization[]>([])
	const [currentView, setCurrentView] = useState<
		| 'welcome'
		| 'projects'
		| 'project-details'
		| 'profile'
		| 'project-settings'
		| 'settings'
		| 'analysis'
		| 'auth'
		| 'organization'
		| 'analytics'
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
		| 'organization'
		| 'analytics'
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
				// Load user organizations
				try {
					const orgs = await orgApi.getUserOrgs()
					setUserOrgs(orgs ?? [])
				} catch (error) {
					console.error('Failed to load organizations:', error)
					setUserOrgs([]) // safety fallback
				}
				setCurrentView('projects')
			} else {
				setCurrentView('welcome')
			}
		}
		init()
	}, [])

	const hasOrgs = Array.isArray(userOrgs) && userOrgs.length > 0

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
			| 'organization'
			| 'analytics'
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
			setUserOrgs([])
			changeView('welcome')
		}
	}

	async function refreshOrganizations() {
		try {
			const orgs = await orgApi.getUserOrgs()
			setUserOrgs(orgs ?? [])
		} catch (error) {
			console.error('Failed to refresh organizations:', error)
			setUserOrgs([]) // safety fallback
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

				{currentView === 'settings' && !currentUser && (
					<div className='container mx-auto p-6'>
						<SettingsPage onBack={() => changeView('welcome')} />
					</div>
				)}

				{currentUser &&
					currentView !== 'welcome' &&
					currentView !== 'auth' &&
					currentView !== 'analysis' &&
					currentUser && (
						<div className='flex h-screen'>
							<Sidebar>
								<SidebarHeader>
									<div className='flex items-center gap-3'>
										<div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'>
											<span className='text-white font-bold text-sm'>CP</span>
										</div>
										<div>
											<div className='font-semibold text-sm'>CodePulse</div>
											<div className='text-xs text-gray-400'>
												{currentUser.email}
											</div>
										</div>
									</div>
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
											label='Projects'
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
														d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
													/>
												</svg>
											}
											label='Organization'
											active={currentView === 'organization'}
											onClick={() => changeView('organization')}
										/>
										{hasOrgs && (
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
															d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
														/>
													</svg>
												}
												label='Analytics'
												active={currentView === 'analytics'}
												onClick={() => changeView('analytics')}
											/>
										)}
									</SidebarSection>
									<SidebarSection title='Settings'>
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
														d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
													/>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
													/>
												</svg>
											}
											label='Settings'
											active={currentView === 'settings'}
											onClick={() => changeView('settings')}
										/>
									</SidebarSection>
								</SidebarBody>
								<SidebarFooter>
									<button
										onClick={selectAndScan}
										className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
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
										className='w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 text-gray-300 hover:text-white transition-colors'
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
								{currentView === 'organization' && (
									<OrganizationPage
										onBack={() => changeView('projects')}
										onOrganizationChange={refreshOrganizations}
									/>
								)}
								{currentView === 'projects' && (
									<Projects
										onProjectSelect={handleProjectSelect}
										onOpenProjectSettings={(id: string) => {
											setSelectedProjectId(id)
											changeView('project-settings')
										}}
									/>
								)}
								{currentView === 'project-details' && selectedProjectId && (
									<ProjectDetails
										projectId={selectedProjectId}
										onBack={handleBackToProjects}
										onOpenSettings={() => changeView('project-settings')}
									/>
								)}
								{currentView === 'profile' && (
									<ProfileManagement onBack={() => changeView('projects')} />
								)}
								{currentView === 'project-settings' && selectedProjectId && (
									<ProjectSettings
										projectId={selectedProjectId}
										onBack={() => changeView('project-details')}
									/>
								)}
								{currentView === 'settings' && (
									<SettingsPage onBack={() => changeView('projects')} />
								)}
								{currentView === 'analytics' &&
									(hasOrgs && userOrgs[0]?.id ? (
										<AnalyticsPage
											orgId={userOrgs[0].id}
											onBack={() => changeView('projects')}
										/>
									) : (
										<div className='p-6 text-sm text-muted-foreground'>
											No organization found. Please create or join an
											organization first.
										</div>
									))}
							</div>
						</div>
					)}
			</main>
		</div>
	)
}

export default App
