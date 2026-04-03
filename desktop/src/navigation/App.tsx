import Dashboards from './Dashboards.tsx'
import ScanSettingsPage from '@/settings/ScanSettingsPage.tsx'
import Sidebar from '@/navigation/Sidebar.tsx'
import Home from './Home.tsx'
import { useMainContext } from './MainContext.tsx'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'

function App() {
	const { currentView, changeView, scanResult } = useMainContext()
	const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
		if (typeof window === 'undefined') {
			return true
		}

		return window.innerWidth >= 1024
	})
	const [isCompactScreen, setIsCompactScreen] = useState<boolean>(() => {
		if (typeof window === 'undefined') {
			return false
		}

		return window.innerWidth < 1024
	})

	useEffect(() => {
		function handleResize() {
			const compact = window.innerWidth < 1024
			setIsCompactScreen(compact)
		}

		window.addEventListener('resize', handleResize)
		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [])
	
	useEffect(() => {
		if (isCompactScreen) {
			setIsSidebarOpen(false)
			return
		}

		setIsSidebarOpen(true)
	}, [isCompactScreen])

	function closeSidebarOnCompactScreen() {
		if (isCompactScreen) {
			setIsSidebarOpen(false)
		}
	}

	return (
		<div className='min-h-screen bg-background'>
			<main className='relative flex h-screen overflow-hidden'>
				<Sidebar
					isOpen={isSidebarOpen}
					onToggle={() => setIsSidebarOpen(prev => !prev)}
					onClose={() => setIsSidebarOpen(false)}
					isCompactScreen={isCompactScreen}
				/>

				{!isSidebarOpen ? (
					<button
						type='button'
						onClick={() => setIsSidebarOpen(true)}
						className='absolute left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50'
						aria-label='Open sidebar'
					>
						<Menu className='h-5 w-5' />
					</button>
				) : null}

				{isCompactScreen && isSidebarOpen ? (
					<button
						type='button'
						onClick={() => setIsSidebarOpen(false)}
						className='absolute inset-0 z-20 bg-slate-900/25 lg:hidden'
						aria-label='Close sidebar overlay'
					/>
				) : null}

				<div className='flex min-w-0 flex-1 overflow-y-auto px-3 pb-4 pt-14 sm:px-4 sm:pb-6 sm:pt-16 lg:px-6 lg:pt-6'>
					<div className='mx-auto w-full max-w-7xl'>
						{currentView === 'dashboard' && <Home />}

						{currentView === 'settings' && (
							<ScanSettingsPage
								onBack={() => {
									changeView('dashboard')
									closeSidebarOnCompactScreen()
								}}
							/>
						)}

						{currentView === 'analysis' && scanResult && <Dashboards />}
					</div>
				</div>
			</main>
		</div>
	)
}

export default App
