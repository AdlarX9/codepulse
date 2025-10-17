export interface Organization {
	id: string
	name: string
	slug: string
	created_at: string
	subscription?: Subscription
}

export interface Subscription {
	id: string
	org_id: string
	plan: 'free' | 'pro' | 'team' | 'enterprise'
	status: string
	seats: number
	current_period_end?: string
	stripe_customer_id?: string
	stripe_subscription_id?: string
}

export interface OrgMember {
	id: string
	org_id: string
	user_id: string
	role: 'owner' | 'admin' | 'member'
	user?: {
		id: string
		email: string
		handle?: string
	}
	created_at: string
}

export interface Policy {
	id: string
	org_id: string
	repository_id?: string
	name: string
	scope: 'org' | 'repo'
	min_comment_ratio?: number
	max_bloat_ratio?: number
	min_doc_coverage?: number
	block_on_fail: boolean
	enabled: boolean
	created_at: string
}

export interface Repository {
	id: string
	org_id: string
	github_repo_id?: string
	owner: string
	name: string
	full_name: string
	default_branch: string
	created_at: string
}

export interface Integration {
	provider: string
	enabled: boolean
	config?: Record<string, any>
}

export interface Stats {
	window: string
	repository_count?: number
	scan_count: number
	avg_comment_ratio: number
	avg_bloat_ratio: number
	avg_doc_coverage: number
	total_lines: number
	total_code: number
	total_comment: number
	total_core: number
	total_info: number
	totals: {
		total: number
		code: number
		comment: number
		blank: number
		core_code_lines: number
		info_lines: number
	}
	metrics: {
		comment_ratio: number
		bloat_ratio: number
		doc_coverage: number
	}
	growth?: {
		code: number
		comment: number
	}
	policy_score?: number
	policy_evaluations?: {
		passed: number
		failed: number
		warnings: number
	}
	trend: Array<{
		date: string
		totals: {
			code: number
			comment: number
		}
		metrics: {
			comment_ratio: number
			bloat_ratio: number
			doc_coverage: number
		}
	}>
	trends?: Array<{
		date: string
		totals: {
			code: number
			comment: number
		}
		metrics: {
			comment_ratio: number
			bloat_ratio: number
			doc_coverage: number
		}
	}>
	languages?: Record<
		string,
		{
			files: number
			total: number
			code: number
			comment: number
			blank: number
		}
	>
}
