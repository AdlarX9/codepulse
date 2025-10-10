import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { Plus, Folder, Calendar, Github, Settings, Trash2, BarChart3 } from 'lucide-react'

// Types locaux temporairement (seront remplacés par @codepulse/core une fois construit)
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
}

export default function Projects({ onProjectSelect }: ProjectsProps) {
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

			// Mock data for now - in production this would call your API
			const mockProjects: Project[] = [
				{
					id: '1',
					name: 'CodePulse Desktop',
					path: '/Users/alexis/Documents/Code/projets/code-pulse/apps/desktop',
					description: 'Desktop application for CodePulse',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					userId: '1',
					githubLink: {
						repoFullName: 'alexis/codepulse',
						starsCount: 42
					},
					latestScan: {
						id: 'scan1',
						totalFiles: 156,
						totalLines: 12543,
						totalCode: 8934,
						totalComments: 2341,
						createdAt: new Date().toISOString()
					}
				},
				{
					id: '2',
					name: 'Personal Website',
					path: '/Users/alexis/Documents/Code/personal-site',
					description: 'My personal portfolio website',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					userId: '1'
				}
			]

			setProjects(mockProjects)
		} catch (err) {
			setError('Failed to load projects')
			console.error('Error loading projects:', err)
		} finally {
			setLoading(false)
		}
	}

	async function deleteProject(projectId: string) {
		try {
			// Mock API call - in production this would call your API
			setProjects(prev => prev.filter(p => p.id !== projectId))
		} catch (err) {
			console.error('Error deleting project:', err)
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

	if (projects.length === 0) {
		return (
			<div className='text-center py-8'>
				<Folder className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
				<h3 className='text-lg font-semibold mb-2'>No projects yet</h3>
				<p className='text-muted-foreground mb-4'>
					Start by adding your first project to analyze
				</p>
				<Button>
					<Plus className='h-4 w-4 mr-2' />
					Add Project
				</Button>
			</div>
		)
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<h2 className='text-2xl font-bold'>Your Projects</h2>
				<Button>
					<Plus className='h-4 w-4 mr-2' />
					Add Project
				</Button>
			</div>

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
									<Button variant='outline' size='sm'>
										Scan
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
