import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { FolderOpen, Play, Moon, Sun, Monitor, Download, X, Settings as SettingsIcon } from 'lucide-react'
import { Button } from './components/ui/Button'
import { Card } from './components/ui/Card'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import type { ScanResult, ScanProgress, UserSettings } from './types'
import { open } from '@tauri-apps/api/dialog';

function App() {
	const [selectedPath, setSelectedPath] = useState<string>('')
	const [scanning, setScanning] = useState(false)
	const [progress, setProgress] = useState<ScanProgress | null>(null)
	const [result, setResult] = useState<ScanResult | null>(null)
	const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
	const [showSettings, setShowSettings] = useState(false)
	const [settings, setSettings] = useState<UserSettings>({
		excluded_dirs: [],
		excluded_extensions: [],
		excluded_patterns: [],
		follow_symlinks: false,
		excluded_languages: [],
		allowed_languages: [],
	})

	useEffect(() => {
		// Load settings
		loadSettings()

		// Listen for scan progress
		const unlisten = listen<ScanProgress>('scan:progress', event => {
			setProgress(event.payload)
		})

		return () => {
			unlisten.then(fn => fn())
		}
	}, [])

	async function loadSettings() {
		try {
			const loadedSettings = await invoke<UserSettings>('get_settings')
			setSettings(loadedSettings)
		} catch (error) {
			console.error('Failed to load settings:', error)
		}
	}

	useEffect(() => {
		// Apply theme
		const root = window.document.documentElement
		if (theme === 'system') {
			const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light'
			root.classList.toggle('dark', systemTheme === 'dark')
		} else {
			root.classList.toggle('dark', theme === 'dark')
		}
	}, [theme])

	async function selectDirectory() {
		try {
			const path = await open({ directory: true, multiple: false });
			if (path && !Array.isArray(path)) {
				setSelectedPath(path)
			}
		} catch (error) {
			console.error('Failed to select directory:', error)
		}
	}

	async function startScan() {
		if (!selectedPath) return

		setScanning(true)
		setProgress(null)
		setResult(null)

		try {
			// Utiliser directement les settings utilisateur
			const scanResult = await invoke<ScanResult>('scan_directory', {
				path: selectedPath,
				settings: settings
			})

			setResult(scanResult)
		} catch (error) {
			console.error('Scan failed:', error)
			if (error !== 'Scan cancelled') {
				alert(`Scan failed: ${error}`)
			}
		} finally {
			setScanning(false)
			setProgress(null)
		}
	}

	async function cancelScan() {
		try {
			await invoke('cancel_scan')
			setScanning(false)
			setProgress(null)
		} catch (error) {
			console.error('Failed to cancel scan:', error)
		}
	}

	function cycleTheme() {
		setTheme(current => {
			if (current === 'light') return 'dark'
			if (current === 'dark') return 'system'
			return 'light'
		})
	}

	function exportJSON() {
		if (!result) return
		const dataStr = JSON.stringify(result, null, 2)
		const blob = new Blob([dataStr], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `codepulse-${Date.now()}.json`
		a.click()
	}

	function exportCSV() {
		if (!result) return
		const headers = ['File', 'Language', 'Total', 'Code', 'Comments', 'Blank']
		const rows = result.files.map(f => [
			f.path,
			f.language,
			f.total,
			f.code,
			f.comment,
			f.blank
		])
		const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
		const blob = new Blob([csv], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `codepulse-${Date.now()}.csv`
		a.click()
	}

	if (showSettings) {
		return (
			<Settings
				onClose={() => {
					setShowSettings(false)
					loadSettings()
				}}
			/>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			{/* Header */}
			<header className='border-b'>
				<div className='flex items-center justify-between px-4 py-3'>
					<div className='flex items-center gap-2'>
						<div className='w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold'>
							CP
						</div>
						<h1 className='text-xl font-bold'>CodePulse</h1>
					</div>

					<div className='flex items-center gap-2'>
						{result && (
							<>
								<Button variant='ghost' size='sm' onClick={exportCSV}>
									<Download className='h-4 w-4 mr-2' />
									CSV
								</Button>
								<Button variant='ghost' size='sm' onClick={exportJSON}>
									<Download className='h-4 w-4 mr-2' />
									JSON
								</Button>
							</>
						)}
						<Button variant='ghost' size='sm' onClick={() => setShowSettings(true)}>
							<SettingsIcon className='h-4 w-4' />
						</Button>
						<Button variant='ghost' size='sm' onClick={cycleTheme}>
							{theme === 'light' && <Sun className='h-4 w-4' />}
							{theme === 'dark' && <Moon className='h-4 w-4' />}
							{theme === 'system' && <Monitor className='h-4 w-4' />}
						</Button>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='container mx-auto p-6'>
				{!result ? (
					<div className='max-w-2xl mx-auto mt-20'>
						<Card className='p-8'>
							<div className='text-center mb-8'>
								<h2 className='text-3xl font-bold mb-2'>Analyze Your Codebase</h2>
								<p className='text-muted-foreground'>
									Select a directory to scan and get detailed statistics
								</p>
							</div>

							<div className='space-y-4'>
								<div className='flex gap-2'>
									<Button
										variant='outline'
										className='flex-1'
										onClick={selectDirectory}
										disabled={scanning}
									>
										<FolderOpen className='h-4 w-4 mr-2' />
										Select Directory
									</Button>
								</div>

								{selectedPath && (
									<div className='p-3 bg-muted rounded-md text-sm'>
										<strong>Selected:</strong> {selectedPath}
									</div>
								)}

								{scanning ? (
									<Button
										className='w-full'
										variant='destructive'
										onClick={cancelScan}
									>
										<X className='h-4 w-4 mr-2' />
										Cancel Scan
									</Button>
								) : (
									<Button
										className='w-full'
										onClick={startScan}
										disabled={!selectedPath}
									>
										<Play className='h-4 w-4 mr-2' />
										Start Analysis
									</Button>
								)}

								{progress && (
									<div className='p-4 bg-primary/10 rounded-md'>
										<div className='text-sm font-medium mb-2'>
											Scanned {progress.files_scanned} files
										</div>
										<div className='text-xs text-muted-foreground truncate'>
											{progress.current_file}
										</div>
									</div>
								)}
							</div>
						</Card>
					</div>
				) : (
					<Dashboard result={result} onReset={() => setResult(null)} />
				)}
			</main>
		</div>
	)
}

export default App
