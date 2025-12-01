// API models (Go+Gin)

export interface ApiProject {
	id: string
	user_id: string
	project_key_hash?: string
	name?: string
	description?: string
	visibility: 'private' | 'public'
	created_at: string
	updated_at: string
}

// Scan models (from Rust backend)

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

export interface Project extends ApiProject {
	settings: Record<string, any>
}

// Settings models (shared with Rust backend)

export interface GeneralSettings {
	device_id: string
	local_salt: string
	update_channel: string
	last_update_check: string
	github_token?: string
	gitlab_token?: string
}

/**
 * Scan settings is used to count lines of code
 * in a project not linked to a git repo.
 * Otherwise, .gitignore is used to exclude files.
 */
export interface ScanSettings {
	excluded_languages: string[]
	allowed_languages: string[]
	excluded_patterns: string[]
	excluded_dirs: string[]
	excluded_extensions: string[]
	follow_symlinks: boolean
}

// "Check for updates" model

export interface UpdateCheck {
	available: boolean
	version?: string
	current_version: string
	notes?: string
	url?: string
}
