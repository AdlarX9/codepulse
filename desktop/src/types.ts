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

export interface LocalProject {
	id: string
	name: string
	path: string
}

export type ExportFormat =
	| 'raw-json'
	| 'raw-csv'
	| 'raw-sql'
	| 'raw-xml'
	| 'visual-html'
	| 'visual-pdf'
	| 'visual-markdown'
	| 'visual-latex'

export interface ScanSettings {
	excluded_expressions: string[]
	follow_symlinks: boolean
}
