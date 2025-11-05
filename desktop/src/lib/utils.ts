import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	const seconds = ms / 1000
	if (seconds < 60) return `${seconds.toFixed(1)}s`
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.floor(seconds % 60)
	return `${minutes}m ${remainingSeconds}s`
}

export function formatShortSha(sha: string): string {
	return sha.substring(0, 7)
}

export function getCommitSummary(message: string): string {
	return message.split('\n')[0]
}
