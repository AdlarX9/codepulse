import { useEffect, useMemo, useState } from 'react'
import { Code2, FileCode, FileText, Trophy } from 'lucide-react'
import { Card } from '@/components/Card'
import { useMainContext } from '@/navigation/MainContext'
import { getLanguageCategories, getLanguageColors } from '@/handles/scan'
import { FileStats } from '@/types'
import {
	GlobalStatistics,
	SummaryRow
} from '@/overview/components/GlobalStatistics'
import { CodeCharts } from '@/overview/components/CodeCharts'
import { LanguagesBreakdown } from '@/overview/components/LanguagesBreakdown'
import { FilesExplorer } from '@/overview/components/FilesExplorer'

type CategoryKey = 'code' | 'config' | 'doc'

type FileWithCategory = FileStats & {
	category: CategoryKey
}

function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
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

function buildSummaryRow(
	key: SummaryRow['key'],
	label: string,
	files: FileWithCategory[]
): SummaryRow {
	const lines = files.map(file => file.total)
	const totalFiles = files.length
	const totalLines = lines.reduce((acc, value) => acc + value, 0)
	const mean = totalFiles > 0 ? totalLines / totalFiles : 0

	return {
		key,
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

export default function OverviewDashboard() {
	const [searchLang, setSearchLang] = useState<string>('')
	const [searchQuery, setSearchQuery] = useState<string>('')
	const [languageColors, setLanguageColors] = useState<Record<string, string>>({})
	const [languageCategories, setLanguageCategories] = useState<Record<string, string>>({})
	const { scanResult, projectPath } = useMainContext()

	useEffect(() => {
		void Promise.all([getLanguageColors(), getLanguageCategories()]).then(
			([colors, categories]) => {
				setLanguageColors(colors)
				setLanguageCategories(categories)
			}
		)
	}, [])

	const categorizedFiles = useMemo<FileWithCategory[]>(() => {
		if (!scanResult) return []
		return scanResult.files.map(file => ({
			...file,
			category: getCategoryForLanguage(file.language, languageCategories)
		}))
	}, [scanResult, languageCategories])

	const sectionOneRows = useMemo<SummaryRow[]>(() => {
		if (!scanResult) return []

		const codeFiles = categorizedFiles.filter(file => file.category === 'code')
		const configFiles = categorizedFiles.filter(file => file.category === 'config')
		const docFiles = categorizedFiles.filter(file => file.category === 'doc')

		return [
			buildSummaryRow('total', 'Total', categorizedFiles),
			buildSummaryRow('code', 'Code', codeFiles),
			buildSummaryRow('config', 'Config', configFiles),
			buildSummaryRow('doc', 'Doc', docFiles)
		]
	}, [scanResult, categorizedFiles])

	const codeLanguageData = useMemo(() => {
		if (!scanResult) return []
		return Object.entries(scanResult.languages)
			.filter(([name]) => getCategoryForLanguage(name, languageCategories) === 'code')
			.map(([name, stats]: [string, any]) => ({
				name,
				value: stats.code,
				files: stats.files
			}))
			.sort((a, b) => b.value - a.value)
			.slice(0, 7)
	}, [scanResult, languageCategories])

	const codeDistributionData = useMemo(() => {
		if (!scanResult) return []

		const codeFiles = categorizedFiles.filter(file => file.category === 'code')
		const trueCode = codeFiles.reduce((acc, file) => acc + file.code, 0)
		const comments = codeFiles.reduce((acc, file) => acc + file.comment, 0)
		const blank = codeFiles.reduce((acc, file) => acc + file.blank, 0)
		const total = trueCode + comments + blank

		return [
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
	}, [scanResult, categorizedFiles])

	const languageBreakdownData = useMemo(() => {
		if (!scanResult) return []
		return Object.entries(scanResult.languages)
			.map(([name, stats]: [string, any]) => ({
				name,
				stats
			}))
			.sort((a, b) => b.stats.total - a.stats.total)
	}, [scanResult])

	const languageOptions = useMemo(() => {
		if (!scanResult) return []
		return Object.keys(scanResult.languages).sort((a, b) => a.localeCompare(b))
	}, [scanResult])

	const filteredFiles = useMemo(() => {
		return categorizedFiles
			.filter(file => !searchLang || file.language === searchLang)
			.filter(
				file => !searchQuery || file.path.toLowerCase().includes(searchQuery.toLowerCase())
			)
			.sort((a, b) => b.total - a.total)
			.slice(0, 100)
	}, [categorizedFiles, searchLang, searchQuery])

	const fileExplorerRows = useMemo(
		() =>
			filteredFiles.map(file => ({
				path: file.path,
				language: file.language,
				total: file.total,
				code: file.code,
				comment: file.comment,
				blank: file.blank,
				alert: getFileAlert(file)
			})),
		[filteredFiles]
	)

	const topMetrics = useMemo(() => {
		if (!scanResult) {
			return {
				totalFiles: 0,
				totalLines: 0,
				totalCode: 0,
				mainLanguage: 'N/A'
			}
		}

		const codeTotalLines = categorizedFiles
			.filter(file => file.category === 'code')
			.reduce((acc, file) => acc + file.total, 0)

		const mainLanguageEntry = Object.entries(scanResult.languages).sort(
			(a, b) => b[1].code - a[1].code
		)[0]

		return {
			totalFiles: scanResult.total_files,
			totalLines: scanResult.total_lines,
			totalCode: codeTotalLines,
			mainLanguage: mainLanguageEntry?.[0] ?? 'N/A'
		}
	}, [scanResult, categorizedFiles])

	if (!scanResult) {
		return (
			<div className='flex items-center justify-center h-64'>
				<div className='text-center'>
					<FileCode className='h-12 w-12 text-gray-400 mx-auto mb-4' />
					<p className='text-gray-500'>No scan data available</p>
					<p className='text-sm text-gray-400 mt-2'>Scan your project to see insights</p>
				</div>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
				<Card className='p-5 border bg-gradient-to-br from-white to-slate-50 shadow-sm rounded-xl'>
					<div className='flex items-start justify-between mb-3'>
						<p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
							Total Files
						</p>
						<FileCode className='h-4 w-4 text-slate-500' />
					</div>
					<div className='text-3xl font-bold text-slate-900'>
						{formatNumber(topMetrics.totalFiles)}
					</div>
				</Card>

				<Card className='p-5 border bg-gradient-to-br from-white to-slate-50 shadow-sm rounded-xl'>
					<div className='flex items-start justify-between mb-3'>
						<p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
							Total Lines
						</p>
						<FileText className='h-4 w-4 text-slate-500' />
					</div>
					<div className='text-3xl font-bold text-slate-900'>
						{formatNumber(topMetrics.totalLines)}
					</div>
				</Card>

				<Card className='p-5 border bg-gradient-to-br from-blue-50 to-white shadow-sm rounded-xl'>
					<div className='flex items-start justify-between mb-3'>
						<p className='text-xs font-semibold uppercase tracking-wide text-blue-700'>
							Lines Of Code
						</p>
						<Code2 className='h-4 w-4 text-blue-600' />
					</div>
					<div className='text-3xl font-bold text-blue-700'>
						{formatNumber(topMetrics.totalCode)}
					</div>
				</Card>

				<Card className='p-5 border bg-gradient-to-br from-amber-50 to-white shadow-sm rounded-xl'>
					<div className='flex items-start justify-between mb-3'>
						<p className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
							Main Language
						</p>
						<Trophy className='h-4 w-4 text-amber-600' />
					</div>
					<div className='text-2xl font-bold text-amber-700 truncate'>
						{topMetrics.mainLanguage}
					</div>
				</Card>
			</div>

			<CodeCharts
				codeLanguageData={codeLanguageData}
				codeDistributionData={codeDistributionData}
				languageColors={languageColors}
			/>

			<GlobalStatistics rows={sectionOneRows} />

			<LanguagesBreakdown
				rows={languageBreakdownData}
				languageColors={languageColors}
			/>

			<FilesExplorer
				projectPath={projectPath}
				searchLang={searchLang}
				searchQuery={searchQuery}
				onSearchLangChange={setSearchLang}
				onSearchQueryChange={setSearchQuery}
				languageOptions={languageOptions}
				rows={fileExplorerRows}
				languageColors={languageColors}
			/>
		</div>
	)
}
