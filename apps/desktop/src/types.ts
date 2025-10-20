export interface FileStats {
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

export interface ScanResult {
	total_files: number
	total_lines: number
	total_code: number
	total_comments: number
	total_blank: number
	comment_percentage: number
	code_percentage: number
	languages: Record<string, LanguageStats>
	files: FileStats[]
	duration_ms: number
	mean: number
	median: number
	std_dev: number
}

export interface ScanProgress {
	files_scanned: number
	current_file: string
}

export interface UserSettings {
	device_id: string
	local_salt: string
	update_channel: string
	last_update_check: string
}

export interface ScanSettings {
	excluded_languages: string[]
	allowed_languages: string[]
	excluded_patterns: string[]
	excluded_dirs: string[]
	excluded_extensions: string[]
	follow_symlinks: boolean
}

export interface UpdateCheck {
	available: boolean
	version?: string
	current_version: string
	notes?: string
	url?: string
}

// API Types for backend integration
export interface ApiScanLang {
	language: string
	files: number
	total: number
	comment: number
	blank: number
	median_lines: number
	gap_lines: number
}

export interface ApiScan {
	id: string
	project_id: string
	device_id?: string
	version_tag?: string
	median_lines: number
	gap_lines: number
	created_at: string
	updated_at: string
	scan_langs?: ApiScanLang[]
}

export interface ApiProject {
	id: string
	user_id: string
	project_key_hash?: string
	name?: string
	description?: string
	visibility: 'private' | 'public'
	settings?: Record<string, any>
	created_at: string
	updated_at: string
}

export interface Project {
	id: string
	name: string
	description?: string
	createdAt: string
	settings: ScanSettings
	latestScan?: {
		totalFiles: number
		totalLines: number
	}
	topLanguage?: string
	languagesCount?: number
	codePercent?: number
}
