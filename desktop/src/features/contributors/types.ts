export interface Contributor {
	name: string
	email: string
	commits: number
	percentage: number
	rank: number
	additions?: number
	deletions?: number
	churn?: number
	avgChurn?: number
	reworkRatio?: number // deletions/(add+del)
	productivityScore?: number // 0-100
	qualityScore?: number // 0-100
	overallScore?: number // 0-100
}
