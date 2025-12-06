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

export interface Project {
	id: string
	user_id: string
	project_key_hash?: string
	name?: string
	description?: string
	visibility: 'private' | 'public'
	created_at: string
	updated_at: string
	settings: Record<string, any>
}

export interface LocalProject {
	id: string
	name: string
	path: string
	lastScanned?: string
}
