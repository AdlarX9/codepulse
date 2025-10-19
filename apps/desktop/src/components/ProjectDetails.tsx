import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import {
	ArrowLeft,
	Folder,
	Play,
	BarChart3,
	Settings,
	Download,
	Calendar,
	FileCode,
	MessageSquare,
	FileText,
	Edit2,
	Check,
	X,
	TrendingUp,
	Eye,
	EyeOff
} from 'lucide-react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	AreaChart,
	Area
} from 'recharts'
import Dashboard from './Dashboard'
import { api } from '../lib/api'
import { invoke } from '@tauri-apps/api/tauri'
import { open as openDialog, save as saveDialog } from '@tauri-apps/api/dialog'
import { writeBinaryFile } from '@tauri-apps/api/fs'
import { Command } from '@tauri-apps/api/shell'
import { appCacheDir, join } from '@tauri-apps/api/path'
import type { ScanResult, ScanSettings, UserSettings, ApiScan, ApiScanLang } from '@/types'
import { platform } from '@tauri-apps/api/os'

// Types locaux définis ici
interface Project {
	id: string
	name: string
	path: string
	description?: string
	visibility: 'private' | 'public'
	createdAt: string
	updatedAt: string
	userId: string,
	settings: ScanSettings
}

interface ScanWithLangs extends ApiScan {
	scan_langs: ApiScanLang[]
}

interface ProjectDetailsProps {
	projectId: string
	onBack: () => void
	onOpenSettings?: () => void
}

export default function ProjectDetails({ projectId, onBack, onOpenSettings }: ProjectDetailsProps) {
	const [project, setProject] = useState<Project | null>(null)
	const [scans, setScans] = useState<ScanWithLangs[]>([])
	const [languageStats, setLanguageStats] = useState<ApiScanLang[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [scanning, setScanning] = useState(false)
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [showExportModal, setShowExportModal] = useState(false)
	const [exporting, setExporting] = useState(false)
	const [exportFormat, setExportFormat] = useState<'csv' | 'html' | 'pdf'>('csv')
	// États pour l'édition
	const [isEditing, setIsEditing] = useState(false)
	const [editedName, setEditedName] = useState('')
	const [editedDescription, setEditedDescription] = useState('')
	const [editedVisibility, setEditedVisibility] = useState<'private' | 'public'>('private')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		loadProject()
	}, [projectId])

	async function loadProject() {
		try {
			setLoading(true)
			setError(null)
			const data = await api.getProjectDetails(projectId)
			const p = data.project || {}
			let boundPath = await invoke<string | null>('get_project_binding', {
				projectId: projectId
			})
			const mapped: Project = {
				id: p.id,
				name: p.name || 'Project',
				path: boundPath || '',
				description: p.description || '',
				visibility: p.visibility || 'private',
				createdAt: p.created_at,
				updatedAt: p.updated_at,
				userId: p.user_id,
				settings: p.settings || {}
			}
			setProject(mapped)
			setEditedName(mapped.name)
			setEditedDescription(mapped.description || '')
			setEditedVisibility(mapped.visibility)
			// Charger les scans et stats
			if (data.scans) setScans(data.scans)
			if (data.stats?.language_stats) setLanguageStats(data.stats?.language_stats)
		} catch (err) {
			setError('Failed to load project')
			console.error('Error loading project:', err)
		} finally {
			setLoading(false)
		}
	}

	async function startScan() {
		if (!project) return
		try {
			setScanning(true)
			// Ensure path binding
			let boundPath = await invoke<string | null>('get_project_binding', {
				projectId: project.id
			})
			if (!boundPath) {
				const selected = (await openDialog({ directory: true, multiple: false })) as
					| string
					| null
				if (!selected) {
					setScanning(false)
					return
				}
				await invoke('set_project_binding', { projectId: project.id, basePath: selected })
				boundPath = selected
			}
			// Merge settings
			try {
				const details = await api.getProject(projectId)
				const p = details.project || details
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
					if (ps && ps[k] !== undefined) (project.settings as any)[k] = ps[k]
			} catch {}
			// Run scan
			const result = await invoke<ScanResult>('scan_directory', {
				path: boundPath,
				scanSettings: project.settings
			})
			setScanResult(result)
			// Send snapshot
			const project_key_hash = await invoke<string>('compute_project_key_hash', {
				basePath: boundPath
			})
			const userSettings = await invoke<UserSettings>('get_user_settings')

			await api.rescanProject(project.id, {
				project_key_hash,
				totals: {
					total: result.total_lines,
					code: result.total_code,
					comment: result.total_comments,
					blank: result.total_blank,
					core_code_lines: result.total_code,
					info_lines: result.total_comments + result.total_blank
				},
				median_lines: result.median,
				gap_lines: result.std_dev,
				per_language: Object.entries(result.languages || {}).map(
					([language, stats]: [string, any]) => ({
						language,
						files: (stats as any).files,
						total: (stats as any).total,
						code: (stats as any).code,
						comment: (stats as any).comment,
						blank: (stats as any).blank
					})
				),
				device_id: userSettings.device_id,
				app_version: '1.0.0',
				scanned_at: Math.floor(Date.now() / 1000).toString()
			})
			// Reload brief info
			await loadProject()
		} catch (err) {
			console.error('Error scanning project:', err)
		} finally {
			setScanning(false)
		}
	}

	// Helper: make a file:// URL from an absolute path (Windows-friendly)
	function toFileUrl(absPath: string, plat: string): string {
		if (absPath.startsWith('file://')) return absPath
		if (plat === 'win32') {
			return 'file:///' + absPath.replace(/\\/g, '/')
		}
		return 'file://' + absPath
	}

	// Try Chrome/Chromium/Edge headless print
	async function tryHeadlessBrowser(htmlPath: string, outPdfPath: string): Promise<boolean> {
		const plat = await platform()
		const fileUrl = toFileUrl(htmlPath, plat)

		// Candidate binaries per-OS (expand as needed). Ensure allowlist.shell.execute includes these paths.
		const candidates =
			plat === 'win32'
				? [
						'C:/Program Files/Google/Chrome/Application/chrome.exe',
						'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
						'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
						'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
					]
				: plat === 'darwin'
					? [
							'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
							'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
						]
					: [
							'/usr/bin/google-chrome',
							'/usr/bin/chromium',
							'/usr/bin/chromium-browser',
							'/usr/bin/brave-browser'
						]

		for (const bin of candidates) {
			try {
				const cmd = new Command(bin, [
					'--headless',
					'--disable-gpu',
					'--no-sandbox',
					`--print-to-pdf=${outPdfPath}`,
					'--print-to-pdf-no-header',
					fileUrl
				])
				const res = await cmd.execute()
				if (res.code === 0) return true
			} catch {
				// try next candidate
			}
		}
		return false
	}

	// Try wkhtmltopdf if present
	async function tryWkhtmltopdf(htmlPath: string, outPdfPath: string): Promise<boolean> {
		const plat = await platform()
		const candidates =
			plat === 'win32'
				? ['C:/Program Files/wkhtmltopdf/bin/wkhtmltopdf.exe']
				: [
						'/opt/homebrew/bin/wkhtmltopdf',
						'/usr/local/bin/wkhtmltopdf',
						'/usr/bin/wkhtmltopdf'
					]

		for (const wk of candidates) {
			try {
				const cmd = new Command(wk, [
					'--page-size',
					'A4',
					'--margin',
					'10mm',
					'--enable-local-file-access',
					htmlPath,
					outPdfPath
				])
				const res = await cmd.execute()
				if (res.code === 0) return true
			} catch {
				// try next
			}
		}
		return false
	}

	// Last-resort fallback: generate PDF in-frontend with jsPDF + html2canvas (no external binaries).
	// Note: add dependencies "jspdf" and "html2canvas" to your project for this to work offline.
	async function generatePdfInFrontend(htmlString: string, outPdfPath: string): Promise<void> {
		// Dynamically import to avoid initial bundle bloat
		const jsPDFMod = await import('jspdf')
		const html2canvasMod: any = await import('html2canvas')
		const jsPDF = (jsPDFMod as any).jsPDF ?? jsPDFMod.default

		// Create an offscreen container to render the HTML
		const container = document.createElement('div')
		container.style.position = 'fixed'
		container.style.left = '-10000px'
		container.style.top = '0'
		container.style.width = '794px' // ~A4 width at 96dpi
		container.style.padding = '12px'
		container.style.background = '#fff'
		container.innerHTML = htmlString
		document.body.appendChild(container)

		// Wait a frame to allow layout/styles to apply
		await new Promise(requestAnimationFrame)

		const html2canvas = html2canvasMod.default ?? html2canvasMod
		const canvas: HTMLCanvasElement = await html2canvas(container, {
			scale: 2, // higher quality
			useCORS: true,
			backgroundColor: '#ffffff',
			logging: false
		})

		// Clean up container
		document.body.removeChild(container)

		const imgData = canvas.toDataURL('image/png')
		const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait'
		const pdf = new jsPDF({
			orientation,
			unit: 'px',
			format: [canvas.width, canvas.height]
		})
		pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)

		// Write to disk via Tauri
		const blob = pdf.output('blob') as Blob
		const buf = new Uint8Array(await blob.arrayBuffer())
		await writeBinaryFile(outPdfPath, buf)
	}

	async function doExport() {
		if (!project) return
		try {
			setExporting(true)

			if (exportFormat === 'csv' || exportFormat === 'html') {
				const blob = await api.exportProject(project.id, exportFormat)
				const defaultName = `${project.name}.${exportFormat}`
				const filePath = await saveDialog({
					defaultPath: defaultName,
					filters: [{ name: exportFormat.toUpperCase(), extensions: [exportFormat] }]
				})

				if (filePath) {
					const buf = new Uint8Array(await blob.arrayBuffer())
					await writeBinaryFile(filePath, buf)
				}
				return
			}

			// PDF: fetch HTML
			const htmlBlob = await api.exportProject(project.id, 'html')
			const htmlText = await htmlBlob.text()

			// Ask user for output path first (fail early if canceled)
			const outPdfPath = await saveDialog({
				defaultPath: `${project.name}.pdf`,
				filters: [{ name: 'PDF', extensions: ['pdf'] }]
			})
			if (!outPdfPath) return

			// Persist HTML to a temp file for CLI tools
			const tmp = await appCacheDir()
			const htmlPath = await join(tmp, `codepulse_export_${project.id}.html`)
			const htmlBuf = new Uint8Array(
				await new Blob([htmlText], { type: 'text/html' }).arrayBuffer()
			)
			await writeBinaryFile(htmlPath, htmlBuf)

			// 1) Try Chrome/Edge/Chromium headless
			let converted = await tryHeadlessBrowser(htmlPath, outPdfPath)

			// 2) Fallback to wkhtmltopdf
			if (!converted) {
				converted = await tryWkhtmltopdf(htmlPath, outPdfPath)
			}

			// 3) Last resort: pure frontend PDF via jsPDF + html2canvas
			if (!converted) {
				await generatePdfInFrontend(htmlText, outPdfPath)
			}
		} catch (err) {
			console.error('Error exporting project:', err)
			// Optional: show a user-friendly toast/modal here
		} finally {
			setExporting(false)
			setShowExportModal(false)
		}
	}

	// Fonctions helper pour calculs
	function computeTotalFromLangs(langs: ApiScanLang[]): number {
		return langs.reduce((sum, l) => sum + l.total, 0)
	}

	function computeCodeFromLangs(langs: ApiScanLang[]): number {
		return langs.reduce((sum, l) => sum + (l.total - l.comment - l.blank), 0)
	}

	function computeCommentFromLangs(langs: ApiScanLang[]): number {
		return langs.reduce((sum, l) => sum + l.comment, 0)
	}

	async function handleSaveProject() {
		if (!project) return
		try {
			setSaving(true)
			await api.updateProject(project.id, {
				name: editedName,
				description: editedDescription || null,
				visibility: editedVisibility
			})
			setIsEditing(false)
			await loadProject()
		} catch (err) {
			console.error('Failed to save project:', err)
			setSaving(false)
		} finally {
			setSaving(false)
		}
	}

	function handleCancelEdit() {
		setEditedName(project?.name || '')
		setEditedDescription(project?.description || '')
		setEditedVisibility(project?.visibility || 'private')
		setIsEditing(false)
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString()
	}

	function formatNumber(num: number) {
		return num.toLocaleString()
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center py-8'>
				<div className='text-muted-foreground'>Loading project...</div>
			</div>
		)
	}

	if (error || !project) {
		return (
			<div className='text-center py-8'>
				<div className='text-red-600 mb-4'>{error || 'Project not found'}</div>
				<Button onClick={onBack}>
					<ArrowLeft className='h-4 w-4 mr-2' />
					Back to Projects
				</Button>
			</div>
		)
	}

	if (scanResult) {
		return (
			<div className='px-6 pt-3'>
				<div className='flex items-center gap-4 mb-6'>
					<h1 className='text-2xl font-bold'>{project.name} - Scan Results</h1>
				</div>
				<Dashboard result={scanResult} onReset={() => setScanResult(null)} />
			</div>
		)
	}

	return (
		<div className='space-y-6 px-6 pt-3'>
			<div className='flex items-center gap-4'>
				<Button variant='ghost' onClick={onBack}>
					<ArrowLeft className='h-4 w-4 mr-2' />
					Back to Projects
				</Button>
				<h1 className='text-2xl font-bold'>{project.name}</h1>
			</div>

			<div className='grid gap-6 md:grid-cols-2'>
				<Card>
					<CardHeader>
						<div className='flex items-center justify-between'>
							<CardTitle>Project Information</CardTitle>
							{!isEditing ? (
								<Button
									size='sm'
									variant='ghost'
									onClick={() => setIsEditing(true)}
								>
									<Edit2 className='h-4 w-4' />
								</Button>
							) : (
								<div className='flex gap-2'>
									<Button
										size='sm'
										variant='ghost'
										onClick={handleSaveProject}
										disabled={saving}
									>
										<Check className='h-4 w-4' />
									</Button>
									<Button size='sm' variant='ghost' onClick={handleCancelEdit}>
										<X className='h-4 w-4' />
									</Button>
								</div>
							)}
						</div>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div>
							<label className='text-sm font-medium text-muted-foreground'>
								Path
							</label>
							<div className='flex items-center gap-2 mt-1'>
								<Folder className='h-4 w-4 text-muted-foreground' />
								<code className='text-sm bg-muted px-2 py-1 rounded'>
									{project.path}
								</code>
							</div>
						</div>

						{isEditing ? (
							<div className='space-y-3'>
								<div>
									<label className='text-sm font-medium text-muted-foreground'>
										Name
									</label>
									<input
										className='mt-1 w-full border rounded px-2 py-1'
										value={editedName}
										onChange={e => setEditedName(e.target.value)}
									/>
								</div>
								<div>
									<label className='text-sm font-medium text-muted-foreground'>
										Description
									</label>
									<textarea
										className='mt-1 w-full border rounded px-2 py-1'
										rows={3}
										value={editedDescription}
										onChange={e => setEditedDescription(e.target.value)}
									/>
								</div>
								<div>
									<label className='text-sm font-medium text-muted-foreground'>
										Visibility
									</label>
									<select
										className='mt-1 w-full border rounded px-2 py-1'
										value={editedVisibility}
										onChange={e => setEditedVisibility(e.target.value as any)}
									>
										<option value='private'>Private</option>
										<option value='public'>Public</option>
									</select>
								</div>
							</div>
						) : (
							<>
								<div>
									<label className='text-sm font-medium text-muted-foreground'>
										Description
									</label>
									<p className='mt-1 text-sm'>{project.description || '—'}</p>
								</div>
								<div className='flex flex-col'>
									<label className='text-sm font-medium text-muted-foreground'>
										Visibility
									</label>
									<div className='mt-1 inline-flex items-center gap-2 text-sm'>
										{project.visibility === 'private' ? (
											<>
												<EyeOff className='h-4 w-4 text-muted-foreground' />{' '}
												Private
											</>
										) : (
											<>
												<Eye className='h-4 w-4 text-muted-foreground' />{' '}
												Public
											</>
										)}
									</div>
								</div>
							</>
						)}

						<div>
							<label className='text-sm font-medium text-muted-foreground'>
								Created
							</label>
							<div className='flex items-center gap-2 mt-1'>
								<Calendar className='h-4 w-4 text-muted-foreground' />
								<span className='text-sm'>{formatDate(project.createdAt)}</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Latest Scan</CardTitle>
						<CardDescription>
							{scans.length > 0 ? `Last of ${scans.length} scans` : 'No scans yet'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{scans.length > 0 && languageStats.length > 0 ? (
							<div className='space-y-4'>
								<div className='grid grid-cols-2 gap-4 text-sm'>
									<div className='flex items-center gap-2'>
										<FileCode className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(
												languageStats.reduce((s, l) => s + l.files, 0)
											)}{' '}
											files
										</span>
									</div>
									<div className='flex items-center gap-2'>
										<FileText className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(computeTotalFromLangs(languageStats))}{' '}
											lines
										</span>
									</div>
									<div className='flex items-center gap-2'>
										<BarChart3 className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(computeCodeFromLangs(languageStats))} code
										</span>
									</div>
									<div className='flex items-center gap-2'>
										<MessageSquare className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(computeCommentFromLangs(languageStats))}{' '}
											comments
										</span>
									</div>
								</div>

								<div className='grid grid-cols-2 gap-4 text-sm'>
									<div>
										Median lines per file:{' '}
										<strong>{scans[0].median_lines.toFixed(1)}</strong>
									</div>
									<div>
										Std dev lines per file:{' '}
										<strong>{scans[0].gap_lines.toFixed(1)}</strong>
									</div>
								</div>

								<div>
									<div className='text-sm font-medium text-muted-foreground mb-1'>
										Top languages
									</div>
									<div className='space-y-1'>
										{languageStats.slice(0, 3).map(l => {
											const pct =
												computeTotalFromLangs(languageStats) > 0
													? Math.round(
															(l.total /
																computeTotalFromLangs(
																	languageStats
																)) *
																100
														)
													: 0
											return (
												<div
													key={l.language}
													className='flex items-center justify-between text-sm'
												>
													<span>{l.language}</span>
													<span className='text-muted-foreground'>
														{pct}% • {formatNumber(l.total)} lines
													</span>
												</div>
											)
										})}
									</div>
								</div>

								<div className='pt-2'>
									<Button
										onClick={startScan}
										disabled={scanning}
										className='w-full'
									>
										<Play className='h-4 w-4 mr-2' />
										{scanning ? 'Scanning...' : 'Scan Project'}
									</Button>
								</div>
							</div>
						) : (
							<div className='text-center py-4'>
								<p className='text-muted-foreground mb-4'>No scan data available</p>
								<Button onClick={startScan} disabled={scanning}>
									<Play className='h-4 w-4 mr-2' />
									{scanning ? 'Scanning...' : 'Start First Scan'}
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Actions</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex gap-4'>
						<Button
							variant='outline'
							className='flex-1'
							onClick={() => onOpenSettings?.()}
						>
							<Settings className='h-4 w-4 mr-2' />
							Project Settings
						</Button>
						<Button
							variant='outline'
							className='flex-1'
							onClick={() => setShowExportModal(true)}
						>
							<Download className='h-4 w-4 mr-2' />
							Export Data
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Evolution over time */}
			{scans.length >= 2 && (
				<Card className='md:col-span-2'>
					<CardHeader>
						<div className='flex items-center gap-2'>
							<TrendingUp className='h-5 w-5' />
							<CardTitle>Project Evolution</CardTitle>
						</div>
						<CardDescription>{scans.length} scans tracked</CardDescription>
					</CardHeader>
					<CardContent className='space-y-8'>
						<div className='w-full h-[300px]'>
							<ResponsiveContainer width='100%' height='100%'>
								<AreaChart
									data={[...scans].reverse().map(s => ({
										date: new Date(s.created_at).toLocaleDateString(),
										total: computeTotalFromLangs(s.scan_langs || []),
										code: computeCodeFromLangs(s.scan_langs || []),
										comments: computeCommentFromLangs(s.scan_langs || [])
									}))}
								>
									<CartesianGrid strokeDasharray='3 3' />
									<XAxis dataKey='date' />
									<YAxis />
									<Tooltip />
									<Legend />
									<Area
										type='monotone'
										dataKey='total'
										stroke='#8884d8'
										fill='#8884d8'
										fillOpacity={0.4}
										name='Total Lines'
									/>
									<Area
										type='monotone'
										dataKey='code'
										stroke='#82ca9d'
										fill='#82ca9d'
										fillOpacity={0.4}
										name='Code Lines'
									/>
									<Area
										type='monotone'
										dataKey='comments'
										stroke='#ffc658'
										fill='#ffc658'
										fillOpacity={0.4}
										name='Comment Lines'
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>

						<div className='w-full h-[320px]'>
							<ResponsiveContainer width='100%' height='100%'>
								<LineChart
									data={[...scans].reverse().map(s => {
										const row: any = {
											date: new Date(s.created_at).toLocaleDateString()
										}
										;(s.scan_langs || []).forEach(l => {
											row[l.language] = l.total
										})
										return row
									})}
								>
									<CartesianGrid strokeDasharray='3 3' />
									<XAxis dataKey='date' />
									<YAxis />
									<Tooltip />
									<Legend />
									{Array.from(
										new Set(
											scans.flatMap(s =>
												(s.scan_langs || []).map(l => l.language)
											)
										)
									)
										.slice(0, 6)
										.map((lang, i) => (
											<Line
												key={lang as string}
												type='monotone'
												dataKey={lang as string}
												stroke={`hsl(${(i * 360) / 10}, 70%, 50%)`}
												name={lang as string}
												dot={false}
											/>
										))}
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Export Modal */}
			{showExportModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
					<div className='bg-white rounded shadow-lg w-full max-w-md p-6'>
						<h3 className='text-lg font-semibold mb-4'>Export Project Data</h3>
						<p className='text-sm text-gray-600 mb-4'>
							Choose the format to export the data.
						</p>
						<div className='flex gap-3 mb-6'>
							<button
								className={`px-3 py-2 border rounded ${exportFormat === 'csv' ? 'bg-gray-100 border-gray-400' : 'bg-white'}`}
								onClick={() => setExportFormat('csv')}
							>
								CSV
							</button>
							<button
								className={`px-3 py-2 border rounded ${exportFormat === 'html' ? 'bg-gray-100 border-gray-400' : 'bg-white'}`}
								onClick={() => setExportFormat('html')}
							>
								HTML
							</button>
							<button
								className={`px-3 py-2 border rounded ${exportFormat === 'pdf' ? 'bg-gray-100 border-gray-400' : 'bg-white'}`}
								onClick={() => setExportFormat('pdf')}
							>
								PDF
							</button>
						</div>
						<div className='flex justify-end gap-2'>
							<Button
								variant='outline'
								onClick={() => setShowExportModal(false)}
								disabled={exporting}
							>
								Cancel
							</Button>
							<Button onClick={doExport} disabled={exporting}>
								{exporting ? 'Exporting…' : 'Export'}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
