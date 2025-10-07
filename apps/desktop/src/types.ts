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
	excluded_languages: string[]
	allowed_languages: string[]
	excluded_patterns: string[]
	excluded_dirs: string[]
	excluded_extensions: string[]
	follow_symlinks: boolean
	sync_enabled: boolean
	device_id: string
	local_salt: string
	auto_update: boolean
	update_channel: string
	last_update_check: string
}

export interface UpdateCheck {
	available: boolean
	version?: string
	current_version: string
	notes?: string
	url?: string
}
