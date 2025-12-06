import Dashboards from './Dashboards.tsx'
import ScanSettingsPage from '@/features/settings/ScanSettingsPage.tsx'
import Sidebar from '@/navigation/Sidebar.tsx'
import Home from './Home.tsx'
import { useMainContext } from './MainContext.tsx'

function App() {
	const { currentView, changeView, scanResult } = useMainContext()

	return (
		<div className='min-h-screen bg-background'>
			<main className='flex h-screen'>
				<Sidebar />

				<div className='flex-1 overflow-y-auto container mx-auto p-6'>
					{currentView === 'dashboard' && <Home />}

					{currentView === 'settings' && (
						<ScanSettingsPage onBack={() => changeView('dashboard')} />
					)}

					{currentView === 'analysis' && scanResult && <Dashboards />}
				</div>
			</main>
		</div>
	)
}

export default App
