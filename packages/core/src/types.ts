/**
 * Core types for CodePulse
 */

export type Platform = 'mac' | 'win' | 'linux'

export interface FileCount {
	path: string
	language: string
	total: number
	blank: number
	comment: number
	code: number
}

export interface LanguageStats {
	files: number
	total: number
	blank: number
	comment: number
	code: number
	percentage: number
}

export interface ScanStats {
	totalFiles: number
	totalLines: number
	totalCode: number
	totalComments: number
	totalBlank: number
	commentPercentage: number
	codePercentage: number
	languages: Record<string, LanguageStats>
	fileDetails: FileCount[]
	duration: number
	mean: number
	median: number
	stdDev: number
}

export interface ScanOptions {
	excludeDirs?: string[]
	excludeExtensions?: string[]
	followSymlinks?: boolean
}

export interface DownloadEvent {
	platform: Platform
	version: string
	country?: string
	region?: string
	city?: string
	userAgent?: string
	referrer?: string
	ipHash: string
	releaseChannel?: string
	source?: string
}

export interface AssetManifest {
	version: string
	releaseDate: string
	assets: {
		mac?: {
			dmg: string
			sha256: string
		}
		win?: {
			msi: string
			exe?: string
			sha256: string
		}
		linux?: {
			appImage: string
			deb?: string
			sha256: string
		}
	}
}
