import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '../ui/Button'
import { getSyncWorker } from '@/lib/git-sync'
import type { SyncStatus } from '@/lib/git-sync'

interface GitSyncStatusProps {
	projectId: string
	compact?: boolean
}

export default function GitSyncStatus({ projectId, compact = false }: GitSyncStatusProps) {
	const [status, setStatus] = useState<SyncStatus | null>(null)
	const [syncing, setSyncing] = useState(false)

	useEffect(() => {
		// Load initial status
		updateStatus()

		// Poll status every 5 seconds
		const interval = setInterval(updateStatus, 5000)

		return () => clearInterval(interval)
	}, [projectId])

	function updateStatus() {
		const worker = getSyncWorker()
		const currentStatus = worker.getStatus(projectId)
		setStatus(currentStatus)
		setSyncing(currentStatus?.isSyncing || false)
	}

	async function handleManualSync() {
		setSyncing(true)
		const worker = getSyncWorker()
		await worker.syncProject(projectId)
		updateStatus()
		setSyncing(false)
	}

	if (!status) {
		return null
	}

	if (compact) {
		return (
			<div className='flex items-center gap-2 text-sm'>
				{syncing ? (
					<RefreshCw className='h-4 w-4 animate-spin text-blue-500' />
				) : status.error ? (
					<AlertCircle className='h-4 w-4 text-red-500' />
				) : (
					<CheckCircle className='h-4 w-4 text-green-500' />
				)}
				<span className='text-gray-600'>
					{syncing
						? 'Syncing...'
						: status.error
							? 'Sync error'
							: status.lastSync
								? `Synced ${formatRelativeTime(status.lastSync)}`
								: 'Not synced'}
				</span>
			</div>
		)
	}

	return (
		<div className='bg-white border rounded-lg p-4'>
			<div className='flex items-center justify-between mb-3'>
				<h4 className='font-medium text-gray-900 flex items-center gap-2'>
					<RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
					Git Auto-Sync
				</h4>
				<Button size='sm' variant='outline' onClick={handleManualSync} disabled={syncing}>
					{syncing ? 'Syncing...' : 'Sync Now'}
				</Button>
			</div>

			{status.error && (
				<div className='mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700'>
					<AlertCircle className='h-4 w-4 inline mr-2' />
					{status.error}
				</div>
			)}

			<div className='space-y-2 text-sm'>
				{status.lastSync && (
					<div className='flex items-center gap-2 text-gray-600'>
						<Clock className='h-4 w-4' />
						<span>Last sync: {formatRelativeTime(status.lastSync)}</span>
					</div>
				)}

				{status.newCommits > 0 && (
					<div className='flex items-center gap-2 text-green-600'>
						<CheckCircle className='h-4 w-4' />
						<span>{status.newCommits} new commits synced</span>
					</div>
				)}

				{!status.lastSync && !syncing && <div className='text-gray-500'>No sync yet</div>}
			</div>
		</div>
	)
}

function formatRelativeTime(date: Date): string {
	const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

	if (seconds < 60) return 'just now'
	if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
	if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
	return `${Math.floor(seconds / 86400)} days ago`
}
