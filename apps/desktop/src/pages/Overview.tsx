import { useState, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { api } from '../lib/api'
import { invoke } from '@tauri-apps/api/tauri'
import type { ScanResult, ApiProject } from '../types'
import {
	DashboardLayout,
	OverviewDashboard,
	EvolutionDashboard,
	QualityDashboard,
	ContributorsDashboard
} from '../components/dashboards'
import ExportButton from '../components/export/ExportButton'
import * as git from '../lib/git'
import LocalStreakWidget from '../components/gamification/LocalStreakWidget'
import ChallengesList from '../components/gamification/ChallengesList'
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
import Projects from '../components/Projects'

interface OverviewProps {
	onProjectSelect?: (project: ApiProject) => void
	onOpenProjectSettings?: (projectId: string) => void
}

export default function Overview({ onProjectSelect, onOpenProjectSettings }: OverviewProps) {
	const [summary, setSummary] = useState<any | null>(null)
	const [scanResult, setScanResult] = useState<ScanResult | null>(null)
	const [scannedProjectName, setScannedProjectName] = useState<string>('')
	const [scannedProjectPath, setScannedProjectPath] = useState<string>('')
	const [scannedProjectId, setScannedProjectId] = useState<string | null>(null)
	const [hasGit, setHasGit] = useState<boolean>(false)

	useEffect(() => {
		loadSummary()
	}, [])

	useEffect(() => {
		if (scannedProjectPath) {
			git.isGitRepository(scannedProjectPath)
				.then(setHasGit)
				.catch(() => setHasGit(false))
		}
	}, [scannedProjectPath])

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
		// Vue Dashboard "accueil"
		<div className='space-y-6 p-6'>
			{/* Bandeau résumé */}
			{summary && (
				<section className='space-y-4'>
					{/* Rangée 1: Streak + Diffs hebdo */}
					<div className='grid gap-4 md:grid-cols-12'>
						<div className='md:col-span-8'>
							<div className='border rounded-md p-4 h-full'>
								<LocalStreakWidget />
							</div>
						</div>

						<div className='md:col-span-4'>
							<div className='border rounded-md p-4 h-full'>
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
														summary.additions_deletions?.this_week
															?.added || 0,
													Deleted:
														summary.additions_deletions?.this_week
															?.deleted || 0
												},
												{
													name: 'Last Week',
													Added:
														summary.additions_deletions?.last_week
															?.added || 0,
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
					</div>

					{/* Rangée 2: Activity large + Sidebar (Langs, Repos, Challenges) */}
					<div className='grid gap-4 md:grid-cols-12'>
						{/* Activity */}
						<div className='md:col-span-8'>
							<div className='border rounded-md p-4 mb-4'>
								<div className='text-sm text-muted-foreground mb-2'>
									Recent Activity (14d)
								</div>
								<div className='h-56'>
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
							<Projects
								onProjectSelect={onProjectSelect}
								onOpenProjectSettings={onOpenProjectSettings}
								setScanResult={setScanResult}
								setScannedProjectName={setScannedProjectName}
								setScannedProjectPath={setScannedProjectPath}
								setScannedProjectId={setScannedProjectId}
							/>
						</div>

						{/* Sidebar: Top Languages -> Repos -> Challenges */}
						<aside className='md:col-span-4 space-y-4'>
							<div className='border rounded-md p-4'>
								<div className='text-sm text-muted-foreground mb-2'>
									Top Languages
								</div>
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
									{((summary.repos || []).length || 0) === 0 && (
										<div className='text-sm text-muted-foreground'>
											No linked repositories.
										</div>
									)}
								</div>
							</div>

							<div className='border rounded-md p-4'>
								<ChallengesList showCompleted />
							</div>
						</aside>
					</div>
				</section>
			)}
		</div>
	)
}
