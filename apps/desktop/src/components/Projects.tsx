import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import {
	Plus,
	Folder,
	Calendar,
	Github,
	Settings,
	Trash2,
	BarChart3,
	User,
	LogOut,
	Settings as SettingsIcon
} from 'lucide-react'
import { api } from '../lib/api'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import type { ScanResult, UserSettings } from '../types'

interface Project {
	id: string
	name: string
	path: string
	description?: string
	createdAt: string
	updatedAt: string
	userId: string
	githubLink?: {
		repoFullName: string
		repoData?: any
		starsCount?: number
	}
	latestScan?: {
		id: string
		totalFiles: number
		totalLines: number
		totalCode: number
		totalComments: number
		createdAt: string
	}
}

interface ProjectsProps {
	onProjectSelect?: (project: Project) => void
	onLogout?: () => void
	onOpenProfile?: () => void
	currentUser?: any
}

export default function Projects({
	onProjectSelect,
	onLogout,
	onOpenProfile,
	currentUser
}: ProjectsProps) {
	const [projects, setProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		loadProjects()
	}, [])

	async function loadProjects() {
		try {
			setLoading(true)
			setError(null)

			const data = await api.getProjects()
			const mapped: Project[] = (data || []).map((p: any) => {
				const latest = Array.isArray(p.scans) && p.scans.length > 0 ? p.scans[0] : null
				return {
					id: p.id,
					name: p.name || 'Project',
					path: '',
					description: undefined,
					createdAt: p.created_at,
					updatedAt: p.updated_at,
					userId: p.user_id,
					githubLink: undefined,
					latestScan: latest
						? {
								id: latest.id,
								totalFiles: latest.total,
								totalLines: latest.total,
								totalCode: latest.code,
								totalComments: latest.comment,
								createdAt: latest.created_at
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
			// For now, create a project with a default name
			// In the future, this could open a dialog for project details
			const projectData = {
				name: `Project ${new Date().toLocaleDateString()}`,
				description: 'Created from desktop app'
			}

			const result = await api.createProject(projectData)
			if (result.project) {
				// Reload projects to show the new one
				loadProjects()
			}
		} catch (err) {
			console.error('Error creating project:', err)
		}
	}

	async function handleScanProject(project: Project) {
		try {
			// Get settings for the scan
			const settings = await invoke<UserSettings>('get_settings')

			// Perform scan using Tauri backend
			const result = await invoke<ScanResult>('scan_directory', {
				path: project.path, // This should be the project path, but we don't have it in the current data model
				settings
			})

			// Save scan snapshot to backend
			if (result) {
				await api.rescanProject(project.id, {
					project_key_hash: project.id, // Using project ID as key hash for now
					totals: {
						total: result.total_lines,
						code: result.total_code,
						comment: result.total_comments,
						blank: result.total_blank,
						core_code_lines: result.total_code,
						info_lines: result.total_comments + result.total_blank
					},
					per_language: Object.entries(result.languages || {}).map(
						([language, stats]: [string, any]) => ({
							language,
							files: stats.files,
							total: stats.total,
							code: stats.code,
							comment: stats.comment,
							blank: stats.blank
						})
					),
					device_id: 'desktop-app',
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

	async function handleManualScan() {
		try {
			// Allow user to select a folder to scan (like the non-authenticated flow)
			const selected = (await openDialog({ directory: true, multiple: false })) as
				| string
				| null
			if (!selected) return

			const settings = await invoke<UserSettings>('get_settings')
			const result = await invoke<ScanResult>('scan_directory', { path: selected, settings })

			// Create a new project with the scan data
			if (result) {
				const projectData = {
					name: `Scanned ${new Date().toLocaleDateString()}`,
					path: selected,
					description: 'Created from manual scan'
				}

				const projectResult = await api.createProject(projectData)
				if (projectResult.project) {
					// Save the scan data
					await api.rescanProject(projectResult.project.id, {
						project_key_hash: projectResult.project.id,
						totals: {
							total: result.total_lines,
							code: result.total_code,
							comment: result.total_comments,
							blank: result.total_blank,
							core_code_lines: result.total_code,
							info_lines: result.total_comments + result.total_blank
						},
						per_language: Object.entries(result.languages || {}).map(
							([language, stats]: [string, any]) => ({
								language,
								files: stats.files,
								total: stats.total,
								code: stats.code,
								comment: stats.comment,
								blank: stats.blank
							})
						),
						device_id: 'desktop-app',
						app_version: '1.0.0',
						scanned_at: Math.floor(Date.now() / 1000).toString()
					})

					// Reload projects to show the new one
					loadProjects()
				}
			}
		} catch (err) {
			console.error('Error in manual scan:', err)
		}
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

	return (
		<div className='space-y-6'>
			{/* Header */}
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
						<Button variant='ghost' size='sm' onClick={onLogout}>
							<LogOut className='h-4 w-4' />
						</Button>
						<Button variant='ghost' size='sm' onClick={onOpenProfile}>
							<SettingsIcon className='h-4 w-4' />
						</Button>
					</div>
				</div>
			</header>

			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h2 className='text-2xl font-bold'>Your Projects</h2>
					<div className='flex gap-2'>
						<Button variant='outline' onClick={handleManualScan}>
							<Folder className='h-4 w-4 mr-2' />
							Scan Folder
						</Button>
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
						<Card
							key={project.id}
							className='hover:shadow-md transition-shadow cursor-pointer'
						>
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
										<Button variant='ghost' size='sm'>
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
									{/* GitHub Link */}
									{project.githubLink && (
										<div className='flex items-center gap-2 text-sm text-muted-foreground'>
											<Github className='h-4 w-4' />
											<span>{project.githubLink.repoFullName}</span>
											{project.githubLink.starsCount && (
												<span className='text-yellow-600'>
													★ {formatNumber(project.githubLink.starsCount)}
												</span>
											)}
										</div>
									)}

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
		</div>
	)
}
