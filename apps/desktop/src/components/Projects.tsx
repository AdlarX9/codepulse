import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { Plus, Folder, Calendar, Settings, Trash2, BarChart3 } from 'lucide-react'
import { api } from '../lib/api'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import type { ScanResult, ScanSettings, UserSettings, ApiScanLang } from '../types'
import Dashboard from './Dashboard'

interface Project {
	id: string
	name: string
	description?: string
	createdAt: string
	settings: ScanSettings
	latestScan?: {
		totalFiles: number
		totalLines: number
	}
}

interface ProjectsProps {
	onProjectSelect?: (project: Project) => void
	onOpenProjectSettings?: (projectId: string) => void
}

export default function Projects({ onProjectSelect, onOpenProjectSettings }: ProjectsProps) {
	const [projects, setProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showAddProjectModal, setShowAddProjectModal] = useState(false)
	const [selectedPath, setSelectedPath] = useState<string | null>(null)
	const [projectName, setProjectName] = useState('')
	const [projectDescription, setProjectDescription] = useState('')
	const [projectVisibility, setProjectVisibility] = useState<'private' | 'public'>('private')
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [scannedProjectName, setScannedProjectName] = useState<string>('')

	useEffect(() => {
		loadProjects()
	}, [])

	async function loadProjects() {
		try {
			setLoading(true)
			setError(null)

			const data = await api.getProjects()
			const details = await Promise.all(data.map((p: any) => api.getProjectDetails(p.id)))
			const mapped: Project[] = (details || []).map((p: any) => {
				const hasScans = p?.stats?.has_scans
				const langs: ApiScanLang[] = (p?.stats?.language_stats as ApiScanLang[]) || []
				const totalLines = langs.reduce((sum, l: ApiScanLang) => sum + (l.total ?? 0), 0)
				const totalFiles = langs.reduce((sum, l: ApiScanLang) => sum + (l.files ?? 0), 0)
				return {
					id: p.project.id,
					name: p.project.name || 'Project',
					description: p.project.description || undefined,
					createdAt: p.project.created_at,
					settings: p.project.settings || {},
					latestScan: hasScans
						? {
								totalFiles,
								totalLines
							}
						: undefined
				}
			})
			setProjects(mapped)
		} catch (err) {
			setError('Failed to load projects')
			console.error('Error loading projects:', err)
		} finally {
			setLoading(false)
		}
	}

	async function deleteProject(projectId: string) {
		try {
			await api.deleteProject(projectId)
			setProjects(prev => prev.filter(p => p.id !== projectId))
		} catch (err) {
			console.error('Error deleting project:', err)
		}
	}

	async function handleAddProject() {
		try {
			// Select folder path
			const path = (await openDialog({ directory: true, multiple: false })) as string | null
			if (!path) return // User cancelled

			setSelectedPath(path)
			setProjectName(`Project ${new Date().toLocaleDateString()}`)
			setProjectDescription('Created from desktop app')
			setShowAddProjectModal(true)
		} catch (err) {
			console.error('Error selecting folder:', err)
		}
	}

	async function handleConfirmAddProject() {
		if (!selectedPath || !projectName.trim()) return

		try {
			// Use current user settings for the project settings payload
			const scanSettings = await invoke<ScanSettings>('get_scan_settings')

			const projectData = {
				name: projectName.trim(),
				description: projectDescription.trim() || 'Created from desktop app',
				path: selectedPath,
				visibility: projectVisibility,
				settings: scanSettings
			}

			const result = await api.createProject(projectData)
			if (result.project) {
				// Set the project binding to the selected path
				await invoke('set_project_binding', {
					projectId: result.project.id,
					basePath: selectedPath
				})

				// Reload projects to show the new one
				loadProjects()

				// Automatically scan the newly created project
				await handleScanProject(result.project)

				// Redirect to project details page
				onProjectSelect?.(result.project)
			}

			// Close modal
			setShowAddProjectModal(false)
			setSelectedPath(null)
			setProjectName('')
			setProjectDescription('')
			setProjectVisibility('private')
		} catch (err) {
			console.error('Error creating project:', err)
		}
	}

	function handleCancelAddProject() {
		setShowAddProjectModal(false)
		setSelectedPath(null)
		setProjectName('')
		setProjectDescription('')
		setProjectVisibility('private')
	}

	async function handleScanProject(project: Project) {
		try {
			// Resolve local binding path for this project
			let boundPath = await invoke<string | null>('get_project_binding', {
				projectId: project.id
			})
			if (!boundPath) {
				const selected = (await openDialog({ directory: true, multiple: false })) as
					| string
					| null
				if (!selected) return
				await invoke('set_project_binding', { projectId: project.id, basePath: selected })
				boundPath = selected
			}

			try {
				const projectData = await api.getProject(project.id)
				const p = projectData.project || projectData
				const ps = (p.settings as any) || {}
				// Overlay known keys if present
				const overrideKeys: (keyof ScanSettings)[] = [
					'excluded_dirs',
					'excluded_extensions',
					'excluded_patterns',
					'follow_symlinks',
					'excluded_languages',
					'allowed_languages'
				]
				for (const k of overrideKeys) {
					if (ps && ps[k] !== undefined) {
						;(project.settings as any)[k] = ps[k]
					}
				}
			} catch {}

			// Perform scan using Tauri backend
			const result = await invoke<ScanResult>('scan_directory', {
				path: boundPath,
				scanSettings: project.settings
			})
			setScanResult(result)
			setScannedProjectName(project.name)

			const userSettings = await invoke<UserSettings>('get_user_settings')

			// Save scan snapshot to backend
			if (result) {
				const project_key_hash = await invoke<string>('compute_project_key_hash', {
					basePath: boundPath
				})
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

				// Reload projects to show updated scan data
				loadProjects()
			}
		} catch (err) {
			console.error('Error scanning project:', err)
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString()
	}

	function formatNumber(num: number) {
		return num?.toLocaleString()
	}

	if (loading) {
		return (
			<div className='flex items-center justify-center py-8'>
				<div className='text-muted-foreground'>Loading projects...</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className='text-center py-8'>
				<div className='text-red-600 mb-4'>{error}</div>
				<Button onClick={loadProjects}>Retry</Button>
			</div>
		)
	}

	if (scanResult) {
		return (
			<div className='px-6 pt-3'>
				<div className='flex items-center gap-4 mb-6'>
					<h1 className='text-2xl font-bold'>{scannedProjectName} - Scan Results</h1>
				</div>
				<Dashboard result={scanResult} onReset={() => setScanResult(null)} />
			</div>
		)
	}

	return (
		<div className='space-y-6 px-6 pt-3'>
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h2 className='text-2xl font-bold'>Your Projects</h2>
					<div className='flex gap-2'>
						<Button onClick={handleAddProject}>
							<Plus className='h-4 w-4 mr-2' />
							Add Project
						</Button>
					</div>
				</div>

				{projects?.length === 0 && (
					<div className='space-y-6'>
						<div className='text-center py-8'>
							<Folder className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
							<h3 className='text-lg font-semibold mb-2'>No projects yet</h3>
							<p className='text-muted-foreground mb-4'>
								Start by adding your first project to analyze
							</p>
							<Button onClick={handleAddProject}>
								<Plus className='h-4 w-4 mr-2' />
								Add Project
							</Button>
						</div>
					</div>
				)}

				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{projects.map(project => (
						<Card key={project.id} className='border rounded-md'>
							<CardHeader className='pb-3'>
								<div className='flex items-start justify-between'>
									<div className='flex-1'>
										<CardTitle className='text-lg'>{project.name}</CardTitle>
										{project.description && (
											<CardDescription className='mt-1'>
												{project.description}
											</CardDescription>
										)}
									</div>
									<div className='flex gap-1'>
										<Button
											variant='ghost'
											size='sm'
											onClick={e => {
												e.stopPropagation()
												onOpenProjectSettings?.(project.id)
											}}
										>
											<Settings className='h-4 w-4' />
										</Button>
										<Button
											variant='ghost'
											size='sm'
											onClick={e => {
												e.stopPropagation()
												deleteProject(project.id)
											}}
										>
											<Trash2 className='h-4 w-4' />
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent className='pt-0'>
								<div className='space-y-3'>
									{/* Latest Scan */}
									{project.latestScan && (
										<div className='flex items-center gap-2 text-sm text-muted-foreground'>
											<BarChart3 className='h-4 w-4' />
											<span>
												{formatNumber(project.latestScan.totalFiles)} files,{' '}
												{formatNumber(project.latestScan.totalLines)} lines
											</span>
										</div>
									)}

									{/* Created Date */}
									<div className='flex items-center gap-2 text-sm text-muted-foreground'>
										<Calendar className='h-4 w-4' />
										<span>Created {formatDate(project.createdAt)}</span>
									</div>

									{/* Action Buttons */}
									<div className='flex gap-2 pt-2'>
										<Button
											size='sm'
											className='flex-1'
											onClick={() => onProjectSelect?.(project)}
										>
											View Details
										</Button>
										<Button
											variant='outline'
											size='sm'
											onClick={() => handleScanProject(project)}
										>
											Scan
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			{/* Add Project Modal */}
			{showAddProjectModal && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
					<div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4'>
						<div className='p-6'>
							<h2 className='text-xl font-bold mb-4'>Add New Project</h2>

							<div className='space-y-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Project Name
									</label>
									<input
										type='text'
										value={projectName}
										onChange={e => setProjectName(e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										placeholder='Enter project name'
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Description (Optional)
									</label>
									<input
										type='text'
										value={projectDescription}
										onChange={e => setProjectDescription(e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
										placeholder='Enter project description'
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Folder Path
									</label>
									<div className='w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600'>
										{selectedPath}
									</div>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Visibility
									</label>
									<select
										value={projectVisibility}
										onChange={e =>
											setProjectVisibility(
												(e.target.value as 'private' | 'public') ||
													'private'
											)
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
									>
										<option value='private'>Private</option>
										<option value='public'>Public</option>
									</select>
								</div>
							</div>

							<div className='flex gap-3 mt-6'>
								<Button
									onClick={handleCancelAddProject}
									variant='outline'
									className='flex-1'
								>
									Cancel
								</Button>
								<Button onClick={handleConfirmAddProject} className='flex-1'>
									Add Project
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
