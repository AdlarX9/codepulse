import * as git from './git'
import { invoke } from '@tauri-apps/api/tauri'
import type { UserSettings } from '@/types'

export type Provider = 'github' | 'gitlab'

export interface ProviderRepoInfo {
	provider: Provider
	host: string
	owner: string
	repo: string
	apiBase: string
}

export interface PullRequestLite {
	id: number | string
	number?: number
	createdAt: string // ISO
	mergedAt: string // ISO
	firstCommitAt?: string // ISO (optional, for lead time)
}

export interface DeliveryKpis {
	provider: Provider | null
	repo?: string
	throughput: {
		thisMonth: number
		lastMonth: number
		byWeek: Array<{ weekStart: string; count: number }>
	}
	cycleTime: {
		thisMonthMedianDays: number | null
		lastMonthMedianDays: number | null
		byWeekMedianDays: Array<{ weekStart: string; medianDays: number | null }>
	}
	leadTime: {
		thisMonthMedianDays: number | null
		lastMonthMedianDays: number | null
		byWeekMedianDays: Array<{ weekStart: string; medianDays: number | null }>
	}
}

export interface FallbackKpis {
	throughput: {
		thisMonthCommits: number
		lastMonthCommits: number
		byWeekCommits: Array<{ weekStart: string; count: number }>
	}
}

function parseRemote(
	remote: string | undefined | null
): { host: string; owner: string; repo: string } | null {
	if (!remote) return null
	try {
		// SSH: git@github.com:owner/repo.git
		const sshMatch = remote.match(/^git@([^:]+):([^/]+)\/(.+?)\.git$/)
		if (sshMatch) {
			const host = sshMatch[1]
			const owner = sshMatch[2]
			const repo = sshMatch[3]
			return { host, owner, repo }
		}
		// HTTPS: https://github.com/owner/repo.git or without .git
		const httpsMatch = remote.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/)
		if (httpsMatch) {
			const host = httpsMatch[1]
			const owner = httpsMatch[2]
			const repo = httpsMatch[3]
			return { host, owner, repo }
		}
	} catch {}
	return null
}

function detectProviderFromHost(host: string): Provider | null {
	const h = host.toLowerCase()
	if (h.includes('github')) return 'github'
	if (h.includes('gitlab')) return 'gitlab'
	return null
}

export function getProviderRepoInfo(remoteUrl: string): ProviderRepoInfo | null {
	const parsed = parseRemote(remoteUrl)
	if (!parsed) return null
	const provider = detectProviderFromHost(parsed.host)
	if (!provider) return null
	const apiBase =
		provider === 'github'
			? parsed.host === 'github.com'
				? 'https://api.github.com'
				: `https://${parsed.host}/api/v3`
			: `https://${parsed.host}/api/v4`
	return { provider, host: parsed.host, owner: parsed.owner, repo: parsed.repo, apiBase }
}

function startOfWeek(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay() // 0=Sun..6=Sat
	const diff = (day + 6) % 7 // make Monday start
	d.setDate(d.getDate() - diff)
	d.setHours(0, 0, 0, 0)
	return d
}

function startOfMonth(date: Date): Date {
	const d = new Date(date.getFullYear(), date.getMonth(), 1)
	d.setHours(0, 0, 0, 0)
	return d
}

function median(values: number[]): number | null {
	if (!values || values.length === 0) return null
	const arr = [...values].sort((a, b) => a - b)
	const mid = Math.floor(arr.length / 2)
	if (arr.length % 2 === 0) return (arr[mid - 1] + arr[mid]) / 2
	return arr[mid]
}

function daysBetween(aIso: string, bIso: string): number {
	const a = new Date(aIso).getTime()
	const b = new Date(bIso).getTime()
	return (b - a) / (1000 * 60 * 60 * 24)
}

async function fetchGithubPRs(
	info: ProviderRepoInfo,
	token?: string,
	perPage = 50
): Promise<PullRequestLite[]> {
	const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
	if (token) headers.Authorization = `Bearer ${token}`
	const url = `${info.apiBase}/repos/${info.owner}/${info.repo}/pulls?state=closed&per_page=${perPage}&sort=updated&direction=desc`
	const res = await fetch(url, { headers })
	if (!res.ok) throw new Error(`GitHub PRs fetch failed: ${res.status}`)
	const data = await res.json()
	const closed = (data || []) as any[]
	const merged = closed.filter(pr => pr.merged_at)
	// Map basic fields
	const basic: PullRequestLite[] = merged.map(pr => ({
		id: pr.id,
		number: pr.number,
		createdAt: pr.created_at,
		mergedAt: pr.merged_at
	}))
	// Optionally enrich a subset with first commit date for lead time
	const limit = Math.min(20, basic.length)
	for (let i = 0; i < limit; i++) {
		const prNum = basic[i].number!
		try {
			const commitsRes = await fetch(
				`${info.apiBase}/repos/${info.owner}/${info.repo}/pulls/${prNum}/commits?per_page=1&page=1`,
				{ headers }
			)
			if (commitsRes.ok) {
				const commits = await commitsRes.json()
				const first = commits && commits[0]
				const date = first?.commit?.author?.date || first?.commit?.committer?.date
				if (date) basic[i].firstCommitAt = date
			}
		} catch {}
	}
	return basic
}

async function fetchGitlabMRs(
	info: ProviderRepoInfo,
	token?: string,
	perPage = 50
): Promise<PullRequestLite[]> {
	const headers: Record<string, string> = {}
	if (token) headers['PRIVATE-TOKEN'] = token
	const projectPath = encodeURIComponent(`${info.owner}/${info.repo}`)
	const url = `${info.apiBase}/projects/${projectPath}/merge_requests?state=merged&per_page=${perPage}&order_by=updated_at&sort=desc`
	const res = await fetch(url, { headers })
	if (!res.ok) throw new Error(`GitLab MRs fetch failed: ${res.status}`)
	const data = await res.json()
	const mrs = (data || []) as any[]
	const mapped: PullRequestLite[] = mrs.map(mr => ({
		id: mr.id,
		number: mr.iid,
		createdAt: mr.created_at,
		mergedAt: mr.merged_at
	}))

	// GitLab API for MR commits: /projects/:id/merge_requests/:iid/commits
	const limit = Math.min(20, mapped.length)
	for (let i = 0; i < limit; i++) {
		const iid = mapped[i].number!
		try {
			const commitsRes = await fetch(
				`${info.apiBase}/projects/${projectPath}/merge_requests/${iid}/commits?per_page=1&page=1`,
				{ headers }
			)
			if (commitsRes.ok) {
				const commits = await commitsRes.json()
				const first = commits && commits[0]
				const date = first?.created_at || first?.committed_date
				if (date) mapped[i].firstCommitAt = date
			}
		} catch {}
	}
	return mapped
}

export async function getDeliveryKpis(projectPath: string): Promise<DeliveryKpis | null> {
	try {
		const repo = await git.getRepoInfo(projectPath)
		const remote = repo?.remote_url
		if (!remote) return null
		const info = getProviderRepoInfo(remote)
		if (!info) return null

		let ghToken: string | undefined = (import.meta as any).env?.VITE_GITHUB_TOKEN
		let glToken: string | undefined = (import.meta as any).env?.VITE_GITLAB_TOKEN
		try {
			const settings = await invoke<UserSettings>('get_user_settings')
			if (settings?.github_token) ghToken = settings.github_token
			if (settings?.gitlab_token) glToken = settings.gitlab_token
		} catch (e) {
			// ignore if settings unavailable
		}

		const pullRequests: PullRequestLite[] =
			info.provider === 'github'
				? await fetchGithubPRs(info, ghToken)
				: await fetchGitlabMRs(info, glToken)

		// Build periods
		const now = new Date()
		const thisMonthStart = startOfMonth(now)
		const lastMonthStart = new Date(thisMonthStart)
		lastMonthStart.setMonth(thisMonthStart.getMonth() - 1)
		const lastMonthEnd = new Date(thisMonthStart)

		const inRange = (dIso: string, start: Date, end?: Date) => {
			const t = new Date(dIso).getTime()
			return t >= start.getTime() && (end ? t < end.getTime() : true)
		}

		const prsThisMonth = pullRequests.filter(pr => inRange(pr.mergedAt, thisMonthStart))
		const prsLastMonth = pullRequests.filter(pr =>
			inRange(pr.mergedAt, lastMonthStart, lastMonthEnd)
		)

		// Throughput
		const throughput = {
			thisMonth: prsThisMonth.length,
			lastMonth: prsLastMonth.length,
			byWeek: [] as Array<{ weekStart: string; count: number }>
		}
		const groups: Record<string, number> = {}
		for (const pr of pullRequests) {
			const wk = startOfWeek(new Date(pr.mergedAt)).toISOString().slice(0, 10)
			groups[wk] = (groups[wk] || 0) + 1
		}
		throughput.byWeek = Object.keys(groups)
			.sort()
			.map(weekStart => ({ weekStart, count: groups[weekStart] }))

		// Cycle time = merged - created
		const cycleDaysThis = prsThisMonth.map(pr => daysBetween(pr.createdAt, pr.mergedAt))
		const cycleDaysLast = prsLastMonth.map(pr => daysBetween(pr.createdAt, pr.mergedAt))

		const cycleTime = {
			thisMonthMedianDays: median(cycleDaysThis),
			lastMonthMedianDays: median(cycleDaysLast),
			byWeekMedianDays: [] as Array<{ weekStart: string; medianDays: number | null }>
		}
		const cGroups: Record<string, number[]> = {}
		for (const pr of pullRequests) {
			const wk = startOfWeek(new Date(pr.mergedAt)).toISOString().slice(0, 10)
			const val = daysBetween(pr.createdAt, pr.mergedAt)
			;(cGroups[wk] = cGroups[wk] || []).push(val)
		}
		cycleTime.byWeekMedianDays = Object.keys(cGroups)
			.sort()
			.map(weekStart => ({ weekStart, medianDays: median(cGroups[weekStart]) }))

		// Lead time = merged - firstCommitAt (fallback to createdAt if missing)
		const effectiveFirst = (pr: PullRequestLite) => pr.firstCommitAt || pr.createdAt
		const leadDaysThis = prsThisMonth.map(pr => daysBetween(effectiveFirst(pr), pr.mergedAt))
		const leadDaysLast = prsLastMonth.map(pr => daysBetween(effectiveFirst(pr), pr.mergedAt))

		const leadTime = {
			thisMonthMedianDays: median(leadDaysThis),
			lastMonthMedianDays: median(leadDaysLast),
			byWeekMedianDays: [] as Array<{ weekStart: string; medianDays: number | null }>
		}
		const lGroups: Record<string, number[]> = {}
		for (const pr of pullRequests) {
			const wk = startOfWeek(new Date(pr.mergedAt)).toISOString().slice(0, 10)
			const val = daysBetween(effectiveFirst(pr), pr.mergedAt)
			;(lGroups[wk] = lGroups[wk] || []).push(val)
		}
		leadTime.byWeekMedianDays = Object.keys(lGroups)
			.sort()
			.map(weekStart => ({ weekStart, medianDays: median(lGroups[weekStart]) }))

		return {
			provider: info.provider,
			repo: `${info.owner}/${info.repo}`,
			throughput,
			cycleTime,
			leadTime
		}
	} catch (e) {
		console.error('[DevOps] getDeliveryKpis failed', e)
		return null
	}
}

export async function getFallbackKpis(projectPath: string): Promise<FallbackKpis | null> {
	try {
		const commits = await git.getCommits(projectPath, undefined, 500)
		// Weeks throughput (commits)
		const groups: Record<string, number> = {}
		for (const c of commits) {
			const wk = startOfWeek(new Date(c.timestamp * 1000))
				.toISOString()
				.slice(0, 10)
			groups[wk] = (groups[wk] || 0) + 1
		}
		const byWeekCommits = Object.keys(groups)
			.sort()
			.map(weekStart => ({ weekStart, count: groups[weekStart] }))

		// Month buckets
		const now = new Date()
		const thisMonthStart = startOfMonth(now)
		const lastMonthStart = new Date(thisMonthStart)
		lastMonthStart.setMonth(thisMonthStart.getMonth() - 1)
		const lastMonthEnd = new Date(thisMonthStart)

		const inRange = (ts: number, start: Date, end?: Date) =>
			ts >= start.getTime() / 1000 && (end ? ts < end.getTime() / 1000 : true)

		const thisMonthCommits = commits.filter(c => inRange(c.timestamp, thisMonthStart)).length
		const lastMonthCommits = commits.filter(c =>
			inRange(c.timestamp, lastMonthStart, lastMonthEnd)
		).length

		return {
			throughput: { thisMonthCommits, lastMonthCommits, byWeekCommits }
		}
	} catch (e) {
		console.error('[DevOps] getFallbackKpis failed', e)
		return null
	}
}
