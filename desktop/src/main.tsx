import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/navigation/App'
import '@/styles.css'
import { MainContextProvider } from './navigation/MainContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<MainContextProvider>
			<App />
		</MainContextProvider>
	</React.StrictMode>
)
