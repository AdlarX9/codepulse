import { invoke } from '@tauri-apps/api'
import { ScanSettings } from '../settings/types'
import { BranchQualityDelta, QualityMetrics } from './types'

export async function getBranches(path: string): Promise<string[]> {
	return invoke<string[]>('git_get_branches', { path })
}

export async function computeQualityMetrics(
	path: string,
	settings: ScanSettings
): Promise<QualityMetrics> {
	return invoke<QualityMetrics>('compute_quality_metrics', { path, settings })
}

export async function computeBranchQualityDeltas(
	path: string,
	baseBranch: string,
	branches: string[],
	settings: ScanSettings
): Promise<BranchQualityDelta[]> {
	return invoke<BranchQualityDelta[]>('compute_branch_quality_deltas', {
		path,
		baseBranch,
		branches,
		settings
	})
}
