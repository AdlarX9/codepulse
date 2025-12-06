import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
}

export function startOfWeek(date: Date): Date {
	const d = new Date(date)
	const day = d.getDay() // 0=Sun..6=Sat
	const diff = (day + 6) % 7 // make Monday start
	d.setDate(d.getDate() - diff)
	d.setHours(0, 0, 0, 0)
	return d
}

export function startOfMonth(date: Date): Date {
	const d = new Date(date.getFullYear(), date.getMonth(), 1)
	d.setHours(0, 0, 0, 0)
	return d
}

export function median(values: number[]): number | null {
	if (!values || values.length === 0) return null
	const arr = [...values].sort((a, b) => a - b)
	const mid = Math.floor(arr.length / 2)
	if (arr.length % 2 === 0) return (arr[mid - 1] + arr[mid]) / 2
	return arr[mid]
}

export function daysBetween(aIso: string, bIso: string): number {
	const a = new Date(aIso).getTime()
	const b = new Date(bIso).getTime()
	return (b - a) / (1000 * 60 * 60 * 24)
}
