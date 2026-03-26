import { FileStats, LanguageStats, ScanResult } from '@/types'
import { invoke } from '@tauri-apps/api'

type BackendFileStats = {
	path: string
	language: string
	lines: number
	comments: number
	blank: number
}

function toUiFileStats(raw: BackendFileStats): FileStats {
	const total = Number(raw.lines) || 0
	const comment = Number(raw.comments) || 0
	const blank = Number(raw.blank) || 0
	const code = Math.max(0, total - comment - blank)

	return {
		path: raw.path,
		language: raw.language,
		total,
		blank,
		comment,
		code
	}
}

function computeDispersion(values: number[]): { mean: number; median: number; std_dev: number } {
	if (values.length === 0) {
		return { mean: 0, median: 0, std_dev: 0 }
	}

	const mean = values.reduce((acc, v) => acc + v, 0) / values.length
	const sorted = [...values].sort((a, b) => a - b)
	const middle = Math.floor(sorted.length / 2)
	const median =
		sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
	const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length

	return {
		mean,
		median,
		std_dev: Math.sqrt(variance)
	}
}

export function toScanResult(files: FileStats[], durationMs = 0): ScanResult {
	const total_files = files.length
	const total_lines = files.reduce((acc, f) => acc + f.total, 0)
	const total_code = files.reduce((acc, f) => acc + f.code, 0)
	const total_comments = files.reduce((acc, f) => acc + f.comment, 0)
	const total_blank = files.reduce((acc, f) => acc + f.blank, 0)

	const languages: Record<string, LanguageStats> = {}
	for (const file of files) {
		const current =
			languages[file.language] ??
			({
				files: 0,
				total: 0,
				blank: 0,
				comment: 0,
				code: 0,
				percentage: 0
			} satisfies LanguageStats)

		current.files += 1
		current.total += file.total
		current.blank += file.blank
		current.comment += file.comment
		current.code += file.code
		languages[file.language] = current
	}

	for (const stats of Object.values(languages)) {
		stats.percentage = total_lines > 0 ? (stats.total / total_lines) * 100 : 0
	}

	const { mean, median, std_dev } = computeDispersion(files.map(f => f.total))

	return {
		total_files,
		total_lines,
		total_code,
		total_comments,
		total_blank,
		comment_percentage: total_lines > 0 ? (total_comments / total_lines) * 100 : 0,
		code_percentage: total_lines > 0 ? (total_code / total_lines) * 100 : 0,
		languages,
		files,
		duration_ms: durationMs,
		mean,
		median,
		std_dev
	}
}

export async function scanDirectory(path: string): Promise<ScanResult> {
	const startedAt = performance.now()
	const rawFiles = await invoke<BackendFileStats[]>('scan_directory', { path })
	const files = (rawFiles || []).map(toUiFileStats)
	const durationMs = performance.now() - startedAt
	return toScanResult(files, durationMs)
}

export async function getLocEvolution(path: string): Promise<Array<Record<string, number>>> {
	return invoke<Array<Record<string, number>>>('get_loc_evolution', { path })
}

export async function getLocDiff(path: string): Promise<Record<string, [number, number]>> {
	return invoke<Record<string, [number, number]>>('get_loc_diff', { path })
}
