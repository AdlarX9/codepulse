import { FileStats, ScanResult } from '@/types'
import { OverviewSummaryRow, OverviewVisualData } from './models'

type CategoryKey = 'code' | 'config' | 'doc'

type FileWithCategory = FileStats & {
	category: CategoryKey
}

function getCategoryForLanguage(
	language: string,
	languageCategories: Record<string, string>
): CategoryKey {
	const category = languageCategories[language]
	if (category === 'code' || category === 'config' || category === 'doc') {
		return category
	}
	return 'doc'
}

function getMedian(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function getStdDeviation(values: number[]): number {
	if (values.length === 0) return 0
	const mean = values.reduce((acc, value) => acc + value, 0) / values.length
	const variance =
		values.reduce((acc, value) => acc + (value - mean) * (value - mean), 0) / values.length
	return Math.sqrt(variance)
}

function buildSummaryRow(label: string, files: FileWithCategory[]): OverviewSummaryRow {
	const lines = files.map(file => file.total)
	const totalFiles = files.length
	const totalLines = lines.reduce((acc, value) => acc + value, 0)
	const mean = totalFiles > 0 ? totalLines / totalFiles : 0

	return {
		label,
		totalFiles,
		totalLines,
		mean,
		median: getMedian(lines),
		stdDeviation: getStdDeviation(lines)
	}
}

function getFileAlert(file: FileWithCategory): { level: 'high' | 'low'; label: string } | null {
	if (file.category === 'code' && file.total > 500) {
		return { level: 'high', label: 'Code file > 500 lines' }
	}
	if (file.category === 'config' && file.total > 1000) {
		return { level: 'high', label: 'Config file > 1000 lines' }
	}
	if (file.category === 'doc' && file.total > 1500) {
		return { level: 'high', label: 'Doc file > 1500 lines' }
	}
	if (file.category === 'code' && file.total < 20) {
		return { level: 'low', label: 'Code file < 20 lines' }
	}
	return null
}

export function buildOverviewVisualData(
	scanResult: ScanResult,
	languageCategories: Record<string, string>
): OverviewVisualData {
	const categorizedFiles: FileWithCategory[] = scanResult.files.map(file => ({
		...file,
		category: getCategoryForLanguage(file.language, languageCategories)
	}))

	const codeFiles = categorizedFiles.filter(file => file.category === 'code')
	const configFiles = categorizedFiles.filter(file => file.category === 'config')
	const docFiles = categorizedFiles.filter(file => file.category === 'doc')

	const summaryRows: OverviewSummaryRow[] = [
		buildSummaryRow('Total', categorizedFiles),
		buildSummaryRow('Code', codeFiles),
		buildSummaryRow('Config', configFiles),
		buildSummaryRow('Doc', docFiles)
	]

	const codeLanguageData = Object.entries(scanResult.languages)
		.filter(([name]) => getCategoryForLanguage(name, languageCategories) === 'code')
		.map(([name, stats]) => ({
			name,
			value: stats.code,
			files: stats.files
		}))
		.sort((a, b) => b.value - a.value)
		.slice(0, 7)

	const trueCode = codeFiles.reduce((acc, file) => acc + file.code, 0)
	const comments = codeFiles.reduce((acc, file) => acc + file.comment, 0)
	const blank = codeFiles.reduce((acc, file) => acc + file.blank, 0)
	const total = trueCode + comments + blank

	const codeDistributionData = [
		{
			name: 'True code',
			value: trueCode,
			percentage: total > 0 ? (trueCode / total) * 100 : 0,
			color: '#2563EB'
		},
		{
			name: 'Comments',
			value: comments,
			percentage: total > 0 ? (comments / total) * 100 : 0,
			color: '#16A34A'
		},
		{
			name: 'Blank',
			value: blank,
			percentage: total > 0 ? (blank / total) * 100 : 0,
			color: '#9CA3AF'
		}
	]

	const languageBreakdownData = Object.entries(scanResult.languages)
		.map(([name, stats]) => ({
			name,
			stats
		}))
		.sort((a, b) => b.stats.total - a.stats.total)

	const filesExplorerRows = categorizedFiles
		.sort((a, b) => b.total - a.total)
		.slice(0, 100)
		.map(file => ({
			path: file.path,
			language: file.language,
			total: file.total,
			code: file.code,
			comment: file.comment,
			blank: file.blank,
			alert: getFileAlert(file)
		}))

	const mainLanguageEntry = Object.entries(scanResult.languages).sort(
		(a, b) => b[1].code - a[1].code
	)[0]
	const totalCode = codeFiles.reduce((acc, file) => acc + file.total, 0)

	return {
		topMetrics: {
			totalFiles: scanResult.total_files,
			totalLines: scanResult.total_lines,
			totalCode,
			mainLanguage: mainLanguageEntry?.[0] ?? 'N/A'
		},
		summaryRows,
		codeLanguageData,
		codeDistributionData,
		languageBreakdownData,
		filesExplorerRows
	}
}
