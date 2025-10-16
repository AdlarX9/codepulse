import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import {
	ArrowLeft,
	Folder,
	Play,
	BarChart3,
	Github,
	Settings,
	Download,
	Calendar,
	FileCode,
	MessageSquare,
	FileText
} from 'lucide-react'
import Dashboard from './Dashboard'
import { api } from '../lib/api'

// Types locaux définis ici
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

interface ProjectDetailsProps {
	projectId: string
	onBack: () => void
	onOpenSettings?: () => void
}

export default function ProjectDetails({ projectId, onBack, onOpenSettings }: ProjectDetailsProps) {
	const [project, setProject] = useState<Project | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [scanning, setScanning] = useState(false)
	const [scanResult, setScanResult] = useState<any>(null)

	useEffect(() => {
		loadProject()
	}, [projectId])

	async function loadProject() {
		try {
			setLoading(true)
			setError(null)

			const data = await api.getProject(projectId)
			const p = data.project || data
			const scans = Array.isArray(p.scans) ? p.scans : []
			const latest = scans.length > 0 ? scans[0] : null

			const mapped: Project = {
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

			setProject(mapped)
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

			// Mock scan - in production this would call your Tauri backend
			await new Promise(resolve => setTimeout(resolve, 3000))

			const mockScanResult = {
				totalFiles: 156,
				totalLines: 12543,
				totalCode: 8934,
				totalComments: 2341,
				commentPercentage: 18.7,
				codePercentage: 71.2,
				languages: {
					TypeScript: { files: 89, total: 8934, blank: 1234, comment: 2341, code: 8934 },
					JavaScript: { files: 12, total: 1200, blank: 100, comment: 200, code: 900 },
					CSS: { files: 8, total: 800, blank: 50, comment: 100, code: 650 }
				},
				files: [
					{
						path: 'src/App.tsx',
						language: 'TypeScript',
						total: 286,
						blank: 23,
						comment: 45,
						code: 218
					},
					{
						path: 'src/components/Dashboard.tsx',
						language: 'TypeScript',
						total: 269,
						blank: 18,
						comment: 32,
						code: 219
					}
				],
				duration_ms: 2300,
				mean: 80.3,
				median: 75.0,
				std_dev: 45.2
			}

			setScanResult(mockScanResult)
		} catch (err) {
			console.error('Error scanning project:', err)
		} finally {
			setScanning(false)
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
			<div>
				<div className='flex items-center gap-4 mb-6'>
					<Button variant='ghost' onClick={() => setScanResult(null)}>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Back to Project
					</Button>
					<h1 className='text-2xl font-bold'>{project.name} - Scan Results</h1>
				</div>
				<Dashboard result={scanResult} onReset={() => setScanResult(null)} />
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			<div className='flex items-center gap-4'>
				<Button variant='ghost' onClick={onBack}>
					<ArrowLeft className='h-4 w-4 mr-2' />
					Back to Projects
				</Button>
				<h1 className='text-2xl font-bold'>{project.name}</h1>
			</div>

			<div className='grid gap-6 md:grid-cols-2'>
				{/* Project Info */}
				<Card>
					<CardHeader>
						<CardTitle>Project Information</CardTitle>
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

						{project.description && (
							<div>
								<label className='text-sm font-medium text-muted-foreground'>
									Description
								</label>
								<p className='mt-1 text-sm'>{project.description}</p>
							</div>
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

						{project.githubLink && (
							<div>
								<label className='text-sm font-medium text-muted-foreground'>
									GitHub
								</label>
								<div className='flex items-center gap-2 mt-1'>
									<Github className='h-4 w-4 text-muted-foreground' />
									<a
										href={`https://github.com/${project.githubLink.repoFullName}`}
										target='_blank'
										rel='noopener noreferrer'
										className='text-sm text-blue-600 hover:underline'
									>
										{project.githubLink.repoFullName}
									</a>
									{project.githubLink.starsCount && (
										<span className='text-sm text-yellow-600'>
											★ {formatNumber(project.githubLink.starsCount)}
										</span>
									)}
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Latest Scan */}
				<Card>
					<CardHeader>
						<CardTitle>Latest Scan</CardTitle>
						<CardDescription>
							{project.latestScan ? 'Last analysis results' : 'No scans yet'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{project.latestScan ? (
							<div className='space-y-4'>
								<div className='grid grid-cols-2 gap-4 text-sm'>
									<div className='flex items-center gap-2'>
										<FileCode className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(project.latestScan.totalFiles)} files
										</span>
									</div>
									<div className='flex items-center gap-2'>
										<FileText className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(project.latestScan.totalLines)} lines
										</span>
									</div>
									<div className='flex items-center gap-2'>
										<BarChart3 className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(project.latestScan.totalCode)} code
										</span>
									</div>
									<div className='flex items-center gap-2'>
										<MessageSquare className='h-4 w-4 text-muted-foreground' />
										<span>
											{formatNumber(project.latestScan.totalComments)}{' '}
											comments
										</span>
									</div>
								</div>

								<div className='pt-4'>
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
						<Button variant='outline' className='flex-1'>
							<Download className='h-4 w-4 mr-2' />
							Export Data
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
