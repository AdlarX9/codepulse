'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
	LineChart,
	Line,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer
} from 'recharts'
import { Download, Calendar, Lock, LogOut } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface DownloadStat {
	id: string
	created_at: string
	platform: string
	version: string
	country: string
	user_agent: string
	referrer: string
}

interface AggregatedStats {
	total: number
	byPlatform: Record<string, number>
	byCountry: Record<string, number>
	byVersion: Record<string, number>
	timeline: Array<{ date: string; count: number }>
}

const COLORS = {
	mac: '#3B82F6',
	win: '#10B981',
	linux: '#F59E0B'
}

export default function AdminPage() {
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [loginData, setLoginData] = useState({ email: '', password: '' })
	const [loginError, setLoginError] = useState('')
	const [stats, setStats] = useState<DownloadStat[]>([])
	const [aggregated, setAggregated] = useState<AggregatedStats | null>(null)
	const [period, setPeriod] = useState(30) // days
	const router = useRouter()

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault()
		setLoginError('')
		setIsLoading(true)

		try {
			const response = await fetch('/api/admin/auth', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: loginData.email,
					password: loginData.password
				})
			})

			if (response.ok) {
				setIsAuthenticated(true)
				setLoginData({ email: '', password: '' })
			} else {
				const error = await response.json()
				setLoginError(error.error || 'Authentication failed')
			}
		} catch (error) {
			setLoginError('Authentication failed')
		} finally {
			setIsLoading(false)
		}
	}

	async function handleLogout() {
		setIsAuthenticated(false)
		setStats([])
		setAggregated(null)
		router.push('/')
	}

	useEffect(() => {
		if (isAuthenticated) {
			fetchStats()
		}
	}, [isAuthenticated, period])

	async function fetchStats() {
		try {
			const response = await fetch(`/api/admin/stats?period=${period}`)
			if (!response.ok) throw new Error('Failed to fetch stats')
			const data = await response.json()
			setStats(data.downloads)
			setAggregated(aggregateStats(data.downloads))
		} catch (error) {
			console.error('Failed to fetch stats:', error)
		}
	}

	function aggregateStats(downloads: DownloadStat[]): AggregatedStats {
		const byPlatform: Record<string, number> = {}
		const byCountry: Record<string, number> = {}
		const byVersion: Record<string, number> = {}
		const byDate: Record<string, number> = {}

		downloads.forEach(dl => {
			byPlatform[dl.platform] = (byPlatform[dl.platform] || 0) + 1
			byCountry[dl.country] = (byCountry[dl.country] || 0) + 1
			byVersion[dl.version] = (byVersion[dl.version] || 0) + 1

			const date = new Date(dl.created_at).toISOString().split('T')[0]
			byDate[date] = (byDate[date] || 0) + 1
		})

		const timeline = Object.entries(byDate)
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => a.date.localeCompare(b.date))

		return {
			total: downloads.length,
			byPlatform,
			byCountry,
			byVersion,
			timeline
		}
	}

	function exportCSV() {
		if (!stats.length) return

		const headers = ['Date', 'Platform', 'Version', 'Country', 'User Agent', 'Referrer']
		const rows = stats.map(s => [
			s.created_at,
			s.platform,
			s.version,
			s.country,
			s.user_agent,
			s.referrer
		])

		const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
		const blob = new Blob([csv], { type: 'text/csv' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `codepulse-downloads-${new Date().toISOString()}.csv`
		a.click()
	}

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<div className='text-center'>
					<div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4' />
					<p className='text-muted-foreground'>Loading...</p>
				</div>
			</div>
		)
	}

	if (!isAuthenticated) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-background'>
				<div className='w-full max-w-md'>
					<Card>
						<CardHeader className='text-center'>
							<CardTitle className='flex items-center justify-center gap-2'>
								<Lock className='h-5 w-5' />
								Admin Access
							</CardTitle>
							<CardDescription>
								Please sign in to access the admin dashboard
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleLogin} className='space-y-4'>
								<div className='space-y-2'>
									<label htmlFor='email' className='text-sm font-medium'>Email</label>
									<input
										id='email'
										type='email'
										className='w-full px-3 py-2 border border-gray-300 rounded-md'
										value={loginData.email}
										onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
										required
									/>
								</div>
								<div className='space-y-2'>
									<label htmlFor='password' className='text-sm font-medium'>Password</label>
									<input
										id='password'
										type='password'
										className='w-full px-3 py-2 border border-gray-300 rounded-md'
										value={loginData.password}
										onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
										required
									/>
								</div>
								{loginError && (
									<div className='text-sm text-destructive text-center'>
										{loginError}
									</div>
								)}
								<Button type='submit' className='w-full' disabled={isLoading}>
									{isLoading ? 'Signing in...' : 'Sign In'}
								</Button>
								<div className='pt-2'>
									<Link href='/' className='w-full inline-flex'>
										<Button variant='outline' className='w-full' type='button'>
											<ArrowLeft className='h-4 w-4 mr-2' />
											Back to landing
										</Button>
									</Link>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background'>
			<header className='border-b'>
				<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
					<h1 className='text-2xl font-bold'>CodePulse Admin Dashboard</h1>
					<Button onClick={handleLogout} variant='outline' size='sm'>
						<LogOut className='h-4 w-4 mr-2' />
						Logout
					</Button>
				</div>
			</header>

			<main className='container mx-auto px-4 py-8'>
				{/* Filters */}
				<div className='flex items-center justify-between mb-8'>
					<div className='flex gap-2'>
						{[7, 30, 90].map(days => (
							<Button
								key={days}
								variant={period === days ? 'default' : 'outline'}
								size='sm'
								onClick={() => setPeriod(days)}
							>
								<Calendar className='h-4 w-4 mr-2' />
								{days} days
							</Button>
						))}
					</div>
					<Button onClick={exportCSV} variant='outline'>
						<Download className='h-4 w-4 mr-2' />
						Export CSV
					</Button>
				</div>

				{/* KPIs */}
				<div className='grid md:grid-cols-4 gap-4 mb-8'>
					<Card>
						<CardHeader className='pb-2'>
							<CardDescription>Total Downloads</CardDescription>
							<CardTitle className='text-3xl'>
								{formatNumber(aggregated?.total || 0)}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardDescription>macOS</CardDescription>
							<CardTitle className='text-3xl'>
								{formatNumber(aggregated?.byPlatform.mac || 0)}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardDescription>Windows</CardDescription>
							<CardTitle className='text-3xl'>
								{formatNumber(aggregated?.byPlatform.win || 0)}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardDescription>Linux</CardDescription>
							<CardTitle className='text-3xl'>
								{formatNumber(aggregated?.byPlatform.linux || 0)}
							</CardTitle>
						</CardHeader>
					</Card>
				</div>

				{/* Charts */}
				<div className='grid lg:grid-cols-2 gap-6'>
					{/* Timeline */}
					<Card>
						<CardHeader>
							<CardTitle>Downloads Over Time</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width='100%' height={300}>
								<LineChart data={aggregated?.timeline || []}>
									<CartesianGrid strokeDasharray='3 3' />
									<XAxis dataKey='date' />
									<YAxis />
									<Tooltip />
									<Legend />
									<Line
										type='monotone'
										dataKey='count'
										stroke='#3B82F6'
										strokeWidth={2}
									/>
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* By Platform */}
					<Card>
						<CardHeader>
							<CardTitle>By Platform</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width='100%' height={300}>
								<PieChart>
									<Pie
										data={Object.entries(aggregated?.byPlatform || {}).map(
											([name, value]) => ({
												name,
												value
											})
										)}
										cx='50%'
										cy='50%'
										labelLine={false}
										label={({ name, percent }) =>
											`${name} ${(percent * 100).toFixed(0)}%`
										}
										outerRadius={100}
										fill='#8884d8'
										dataKey='value'
									>
										{Object.keys(aggregated?.byPlatform || {}).map(platform => (
											<Cell
												key={platform}
												fill={COLORS[platform as keyof typeof COLORS]}
											/>
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* Top Countries */}
					<Card>
						<CardHeader>
							<CardTitle>Top Countries</CardTitle>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width='100%' height={300}>
								<BarChart
									data={Object.entries(aggregated?.byCountry || {})
										.sort(([, a], [, b]) => b - a)
										.slice(0, 10)
										.map(([country, count]) => ({ country, count }))}
								>
									<CartesianGrid strokeDasharray='3 3' />
									<XAxis dataKey='country' />
									<YAxis />
									<Tooltip />
									<Bar dataKey='count' fill='#10B981' />
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* Versions */}
					<Card>
						<CardHeader>
							<CardTitle>Versions</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-2'>
								{Object.entries(aggregated?.byVersion || {})
									.sort(([, a], [, b]) => b - a)
									.map(([version, count]) => (
										<div
											key={version}
											className='flex items-center justify-between'
										>
											<span className='font-medium'>{version}</span>
											<span className='text-muted-foreground'>
												{formatNumber(count)}
											</span>
										</div>
									))}
							</div>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	)
}
