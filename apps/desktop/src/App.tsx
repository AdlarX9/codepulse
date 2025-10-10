import { useState, useEffect } from 'react'
import { LogOut, User, Settings as SettingsIcon } from 'lucide-react'
import { Button } from './components/ui/Button'
import Projects from './components/Projects'
import ProjectDetails from './components/ProjectDetails'
import WelcomePage from './pages/Welcome'

interface User {
	id: string
	email: string
	name?: string
	image?: string
	isAdmin?: boolean
	createdAt: string
	updatedAt: string
	profile?: {
		id: string
		handle: string
		visibility: string
	}
}

function App() {
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [currentView, setCurrentView] = useState<'welcome' | 'projects' | 'project-details'>(
		'welcome'
	)
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

	useEffect(() => {
		// Check if user is authenticated on startup
		const token = localStorage.getItem('auth_token')
		if (token) {
			// For now, just set a demo user - in production this would validate the token
			setCurrentUser({
				id: '1',
				email: 'demo@codepulse.app',
				name: 'Demo User',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
		}
	}, [])

	function handleContinueWithoutAccount() {
		setCurrentView('projects')
	}

	function handleProjectSelect(project: any) {
		setSelectedProjectId(project.id)
		setCurrentView('project-details')
	}

	function handleBackToProjects() {
		setCurrentView('projects')
		setSelectedProjectId(null)
	}

	function handleLogout() {
		localStorage.removeItem('auth_token')
		setCurrentUser(null)
		setCurrentView('welcome')
	}

	return (
		<div className='min-h-screen bg-background'>
			<main>
				{currentView === 'welcome' && (
					<WelcomePage
						onContinueWithAccount={() => setCurrentView('projects')}
						onContinueWithoutAccount={handleContinueWithoutAccount}
					/>
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
										{currentUser?.name || currentUser?.email || 'Guest'}
									</div>
									<Button variant='ghost' size='sm' onClick={handleLogout}>
										<LogOut className='h-4 w-4' />
									</Button>
									<Button variant='ghost' size='sm'>
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
						/>
					</div>
				)}
			</main>
		</div>
	)
}

export default App
