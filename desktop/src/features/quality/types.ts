export interface QualityMetrics {
	total_files: number
	total_lines: number
	total_code: number
	total_comments: number
	total_blank: number
	comment_percentage: number
	code_percentage: number
	avg_file_lines: number
	median_file_lines: number
	stddev_file_lines: number
	dead_code_findings: number
	test_coverage?: number | null
	doc_coverage?: number | null
}

export interface BranchQualityDelta {
	branch: string
	changed_files: number
	delta_total: number
	delta_code: number
	delta_comments: number
	delta_blank: number
}