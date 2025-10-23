import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card'
import { Plus, Folder, Calendar, Settings, Trash2, BarChart3 } from 'lucide-react'
import { api } from '../lib/api'
import { open as openDialog } from '@tauri-apps/api/dialog'
import { invoke } from '@tauri-apps/api/tauri'
import type { ScanResult, ScanSettings, UserSettings, Project } from '../types'
import {
	DashboardLayout,
	OverviewDashboard,
	EvolutionDashboard,
	QualityDashboard,
	ContributorsDashboard
} from './dashboards'
import ExportButton from './export/ExportButton'
import * as git from '../lib/git'
import GitSyncStatus from './sync/GitSyncStatus'
import LocalStreakWidget from './gamification/LocalStreakWidget'
import ChallengesList from './gamification/ChallengesList'
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	AreaChart,
	Area
} from 'recharts'

interface ProjectsProps {
	onProjectSelect?: (project: Project) => void
	onOpenProjectSettings?: (projectId: string) => void
}

export default function Projects({ onProjectSelect, onOpenProjectSettings }: ProjectsProps) {
	const [projects, setProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [summary, setSummary] = useState<any | null>(null)
	const [showAddProjectModal, setShowAddProjectModal] = useState(false)
	const [selectedPath, setSelectedPath] = useState<string | null>(null)
	const [projectName, setProjectName] = useState('')
	const [projectDescription, setProjectDescription] = useState('')
	const [projectVisibility, setProjectVisibility] = useState<'private' | 'public'>('private')
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [scannedProjectName, setScannedProjectName] = useState<string>('')
	const [scannedProjectPath, setScannedProjectPath] = useState<string>('')
	const [scannedProjectId, setScannedProjectId] = useState<string | null>(null)
	const [hasGit, setHasGit] = useState<boolean>(false)

	useEffect(() => {
		loadProjects()
		loadSummary()
	}, [])

	useEffect(() => {
		if (scannedProjectPath) {
			git.isGitRepository(scannedProjectPath)
				.then(setHasGit)
				.catch(() => setHasGit(false))
		}
	}, [scannedProjectPath])

	async function loadProjects() {
		setLoading(true)
		const mapped = await api.loadProjects()
		setProjects(mapped)
		setLoading(false)
	}

	function startOfWeek(d: Date) {
		const date = new Date(d)
		const day = (date.getDay() + 6) % 7 // Mon=0
		date.setHours(0, 0, 0, 0)
		date.setDate(date.getDate() - day)
		return date
	}

	function formatISODate(d: Date) {
		return d.toISOString().slice(0, 10)
	}

	function parseRepoSlug(remote?: string): string | null {
		if (!remote) return null
		// git@github.com:user/repo.git or https://github.com/user/repo.git
		const ssh = remote.match(/git@[^:]+:([^\s]+?)(\.git)?$/)
		if (ssh) return ssh[1]
		try {
			const url = new URL(remote)
			const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '')
			return parts || null
		} catch {
			return null
		}
	}

	async function loadSummary() {
		try {
			// 1) Get server summary first to preserve fields like active_challenges and top_languages
			let serverSummary: any = null
			try {
				serverSummary = await api.getUserSummary()
			} catch {}

			// 2) Build local summary from bound project paths and Git history
			const now = new Date()
			const thisWeekStart = startOfWeek(now)
			const lastWeekStart = new Date(thisWeekStart)
			lastWeekStart.setDate(thisWeekStart.getDate() - 7)
			const lastWeekEnd = new Date(thisWeekStart.getTime() - 1)
			const fourteenDaysAgo = new Date(now)
			fourteenDaysAgo.setDate(now.getDate() - 14)

			// Resolve local paths for all projects
			const list = await api.getProjects()
			const boundInfos = await Promise.all(
				(list || []).map(async (p: any) => {
					try {
						const path = await invoke<string | null>('get_project_binding', {
							projectId: p.id
						})
						return { id: p.id, path }
					} catch {
						return { id: p.id, path: null as string | null }
					}
				})
			)

			// For each repo, compute commits and diff stats
			const repoPaths: string[] = []
			const repoSlugs: string[] = []
			let thisWeekAdded = 0
			let thisWeekDeleted = 0
			let lastWeekAdded = 0
			let lastWeekDeleted = 0
			const activityMap = new Map<string, number>()
			for (let i = 0; i < 14; i++) {
				const d = new Date(fourteenDaysAgo)
				d.setDate(fourteenDaysAgo.getDate() + i)
				activityMap.set(formatISODate(d), 0)
			}

			for (const b of boundInfos) {
				if (!b.path) continue
				let isGit = false
				try {
					isGit = await git.isGitRepository(b.path)
				} catch {
					isGit = false
				}
				if (!isGit) continue

				repoPaths.push(b.path)
				try {
					const info = await git.getRepoInfo(b.path)
					const slug = parseRepoSlug(info?.remote_url)
					if (slug && !repoSlugs.includes(slug)) repoSlugs.push(slug)
				} catch {}

				// Pull commits and filter by date
				let commits: git.GitCommitInfo[] = []
				try {
					commits = await git.getCommits(b.path, undefined, 300)
				} catch {}
				const recent = commits.filter(c => c.timestamp * 1000 >= fourteenDaysAgo.getTime())

				// Aggregate activity counts by date
				for (const c of recent) {
					const day = formatISODate(new Date(c.timestamp * 1000))
					activityMap.set(day, (activityMap.get(day) || 0) + 1)
				}

				// Sum additions/deletions for this and last week
				const thisWeekCommits = commits.filter(
					c => c.timestamp * 1000 >= thisWeekStart.getTime()
				)
				const lastWeekCommits = commits.filter(
					c =>
						c.timestamp * 1000 >= lastWeekStart.getTime() &&
						c.timestamp * 1000 <= lastWeekEnd.getTime()
				)

				async function sumDiffs(cs: git.GitCommitInfo[]) {
					let added = 0,
						deleted = 0
					for (const c of cs) {
						try {
							const stats = await git.getCommitDiffStats(b.path!, c.sha)
							added += stats.insertions || 0
							deleted += stats.deletions || 0
						} catch {}
					}
					return { added, deleted }
				}

				try {
					const a = await sumDiffs(thisWeekCommits)
					thisWeekAdded += a.added
					thisWeekDeleted += a.deleted
				} catch {}
				try {
					const bsum = await sumDiffs(lastWeekCommits)
					lastWeekAdded += bsum.added
					lastWeekDeleted += bsum.deleted
				} catch {}
			}

			const recent_activity = Array.from(activityMap.entries()).map(([date, count]) => ({
				date,
				count
			}))

			const localSummary = {
				repos: repoSlugs,
				additions_deletions: {
					this_week: { added: thisWeekAdded, deleted: thisWeekDeleted },
					last_week: { added: lastWeekAdded, deleted: lastWeekDeleted }
				},
				recent_activity
			}

			setSummary({ ...(serverSummary || {}), ...localSummary })
		} catch (e) {
			// Fallback to server-only summary if local fails
			try {
				const data = await api.getUserSummary()
				setSummary(data)
			} catch {}
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
			setScannedProjectPath(boundPath)
			setScannedProjectId(project.id)

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

	if (scanResult) {
		return (
			<div className='px-6 pt-3'>
				<div className='flex items-center gap-4 mb-6'>
					<Button variant='ghost' onClick={() => setScanResult(null)}>
						← Back
					</Button>
					<h1 className='text-2xl font-bold'>{scannedProjectName} - Scan Results</h1>
				</div>
				<DashboardLayout
					projectId={scannedProjectId || ''}
					projectName={scannedProjectName}
					hasGit={hasGit}
					headerRight={
						scanResult ? (
							<div className='flex items-center gap-2'>
								{scannedProjectId && (
									<GitSyncStatus projectId={scannedProjectId} compact />
								)}
								<ExportButton
									scanResult={scanResult}
									projectName={scannedProjectName || 'Project'}
								/>
								{scannedProjectId && (
									<Button
										variant='outline'
										size='sm'
										onClick={() => onOpenProjectSettings?.(scannedProjectId)}
									>
										Edit
									</Button>
								)}
							</div>
						) : null
					}
				>
					{activeTab => {
						switch (activeTab) {
							case 'overview':
								return (
									<OverviewDashboard
										scanResult={scanResult}
										projectPath={scannedProjectPath}
									/>
								)
							case 'evolution':
								return (
									<EvolutionDashboard
										projectPath={scannedProjectPath}
										hasGit={hasGit}
										scanResult={scanResult}
									/>
								)
							case 'quality':
								return (
									<QualityDashboard
										scanResult={scanResult}
										projectPath={scannedProjectPath}
										hasGit={hasGit}
									/>
								)
							case 'contributors':
								return (
									<ContributorsDashboard
										projectPath={scannedProjectPath}
										hasGit={hasGit}
									/>
								)
						}
					}}
				</DashboardLayout>
			</div>
		)
	}

	return (
		<div className='space-y-6 px-6 pt-3'>
			<div className='space-y-4'>
				{/* Streaks & Weekly Diffs */}
				{summary && (
					<div className='grid gap-4 md:grid-cols-3'>
						<div className='md:col-span-2'>
							<LocalStreakWidget />
						</div>
						<div className='border rounded-md p-4'>
							<div className='text-sm text-muted-foreground mb-2'>
								Additions/Deletions (This vs Last Week)
							</div>
							<div className='h-40'>
								<ResponsiveContainer width='100%' height='100%'>
									<BarChart
										data={[
											{
												name: 'This Week',
												Added:
													summary.additions_deletions?.this_week?.added ||
													0,
												Deleted:
													summary.additions_deletions?.this_week
														?.deleted || 0
											},
											{
												name: 'Last Week',
												Added:
													summary.additions_deletions?.last_week?.added ||
													0,
												Deleted:
													summary.additions_deletions?.last_week
														?.deleted || 0
											}
										]}
									>
										<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
										<XAxis dataKey='name' />
										<YAxis />
										<Tooltip />
										<Bar dataKey='Added' fill='#10B981' />
										<Bar dataKey='Deleted' fill='#EF4444' />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				)}
				{/* User Summary */}
				{summary && (
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
						<div className='border rounded-md p-4'>
							<div className='text-sm text-muted-foreground mb-1'>
								Active Challenges
							</div>
							<div className='text-2xl font-semibold'>
								{summary.active_challenges || 0}
							</div>
						</div>
						<div className='border rounded-md p-4'>
							<div className='text-sm text-muted-foreground mb-1'>
								Additions (this vs last week)
							</div>
							<div className='text-lg font-mono'>
								{summary.additions_deletions?.this_week?.added ?? 0}
								<span className='text-xs text-muted-foreground'>
									{' '}
									/ {summary.additions_deletions?.last_week?.added ?? 0}
								</span>
							</div>
						</div>
						<div className='border rounded-md p-4'>
							<div className='text-sm text-muted-foreground mb-1'>
								Deletions (this vs last week)
							</div>
							<div className='text-lg font-mono'>
								{summary.additions_deletions?.this_week?.deleted ?? 0}
								<span className='text-xs text-muted-foreground'>
									{' '}
									/ {summary.additions_deletions?.last_week?.deleted ?? 0}
								</span>
							</div>
						</div>
						<div className='border rounded-md p-4'>
							<div className='text-sm text-muted-foreground mb-2'>Top Languages</div>
							<div className='flex flex-wrap gap-2'>
								{(summary.top_languages || []).slice(0, 5).map((l: any) => (
									<span
										key={l.language}
										className='px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200'
									>
										{l.language} · {l.total}
									</span>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Repositories, Activity & Challenges */}
				{summary && (
					<div className='grid gap-4 md:grid-cols-3'>
						<div className='border rounded-md p-4 md:col-span-2'>
							<div className='text-sm text-muted-foreground mb-2'>
								Recent Activity (14d)
							</div>
							<div className='h-40'>
								<ResponsiveContainer width='100%' height='100%'>
									<AreaChart
										data={(summary.recent_activity || []).map((d: any) => ({
											date: d.date,
											count: d.count
										}))}
									>
										<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
										<XAxis dataKey='date' />
										<YAxis />
										<Tooltip />
										<Area
											dataKey='count'
											type='monotone'
											stroke='#3B82F6'
											fill='#93C5FD'
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>
						<div className='space-y-4'>
							<div className='border rounded-md p-4'>
								<div className='text-sm text-muted-foreground mb-2'>
									Repositories
								</div>
								<div className='flex flex-col gap-2'>
									{(summary.repos || []).slice(0, 6).map((r: string) => (
										<a
											key={r}
											href={`https://github.com/${r}`}
											target='_blank'
											rel='noreferrer'
											className='text-sm text-blue-600 hover:underline'
										>
											{r}
										</a>
									))}
									{(summary.repos || []).length === 0 && (
										<div className='text-sm text-muted-foreground'>
											No linked repositories.
										</div>
									)}
								</div>
							</div>
							<div>
								<ChallengesList showCompleted />
							</div>
						</div>
					</div>
				)}
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

									{/* Mini KPIs */}
									{(project.topLanguage ||
										project.languagesCount !== undefined ||
										project.codePercent !== undefined) && (
										<div className='flex flex-wrap gap-2 pt-1'>
											{project.topLanguage && (
												<span className='px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200'>
													Top: {project.topLanguage}
												</span>
											)}
											{project.languagesCount !== undefined && (
												<span className='px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200'>
													{project.languagesCount} languages
												</span>
											)}
											{project.codePercent !== undefined && (
												<span className='px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200'>
													{project.codePercent}% code
												</span>
											)}
										</div>
									)}

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
