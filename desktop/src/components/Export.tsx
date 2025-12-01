import { Download, FileText, FileJson, FileSpreadsheet, Code } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import * as exportLib from '@/lib/export'
import type { ScanResult } from '@/types'
import { useMemo, useState } from 'react'

interface ExportButtonProps {
	scanResult: ScanResult
	projectName?: string
	variant?: 'default' | 'outline' | 'ghost'
	size?: 'default' | 'sm' | 'lg'
}

interface ExportCenterProps {
	scanResult: ScanResult
	projectName?: string
}

export function ExportButton({
	scanResult,
	projectName,
	variant = 'outline',
	size = 'sm'
}: ExportButtonProps) {
	const [showMenu, setShowMenu] = useState(false)
	const [exporting, setExporting] = useState(false)

	async function handleExport(format: exportLib.ExportFormat) {
		try {
			setExporting(true)
			setShowMenu(false)

			let content: string
			const fileName = projectName || 'code-analysis'

			switch (format) {
				case 'json':
					content = exportLib.exportToJSON(scanResult)
					break
				case 'csv':
					content = exportLib.exportToCSV(scanResult)
					break
				case 'markdown':
					content = exportLib.exportToMarkdown(scanResult, projectName)
					break
				case 'html':
					content = exportLib.exportToHTML(scanResult, projectName)
					break
			}

			const success = await exportLib.saveToFile(content, fileName, format)

			if (success) {
				// Could show a toast notification here
				console.log('Export successful')
			}
		} catch (error) {
			console.error('Export failed:', error)
		} finally {
			setExporting(false)
		}
	}

	return (
		<div className='relative'>
			<Button
				variant={variant}
				size={size}
				onClick={() => setShowMenu(!showMenu)}
				disabled={exporting}
			>
				<Download className='h-4 w-4 mr-2' />
				Export
			</Button>

			{showMenu && (
				<>
					{/* Backdrop */}
					<div className='fixed inset-0 z-10' onClick={() => setShowMenu(false)} />

					{/* Menu */}
					<div className='absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden'>
						<div className='py-1'>
							<button
								onClick={() => handleExport('json')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileJson className='h-4 w-4 text-blue-600' />
								<span>JSON</span>
							</button>
							<button
								onClick={() => handleExport('csv')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileSpreadsheet className='h-4 w-4 text-green-600' />
								<span>CSV</span>
							</button>
							<button
								onClick={() => handleExport('markdown')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileText className='h-4 w-4 text-purple-600' />
								<span>Markdown</span>
							</button>
							<button
								onClick={() => handleExport('html')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<Code className='h-4 w-4 text-orange-600' />
								<span>HTML</span>
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	)
}

export function ExportCenter({ scanResult, projectName }: ExportCenterProps) {
	const [format, setFormat] = useState<'json' | 'csv' | 'markdown' | 'html'>('markdown')
	const [includeLanguages, setIncludeLanguages] = useState(true)
	const [includeSummary, setIncludeSummary] = useState(true)

	const preview = useMemo(() => {
		const data = scanResult
		switch (format) {
			case 'json':
				return exportLib.exportToJSON(data)
			case 'csv':
				return exportLib.exportToCSV(data)
			case 'markdown':
				return exportLib.exportToMarkdown(data, projectName)
			case 'html':
				return exportLib.exportToHTML(data, projectName)
		}
	}, [format, scanResult, projectName])

	async function handleExport() {
		const name = projectName || 'code-analysis'
		switch (format) {
			case 'json':
				await exportLib.saveToFile(exportLib.exportToJSON(scanResult), name, 'json')
				break
			case 'csv':
				await exportLib.saveToFile(exportLib.exportToCSV(scanResult), name, 'csv')
				break
			case 'markdown':
				await exportLib.saveToFile(
					exportLib.exportToMarkdown(scanResult, projectName),
					name,
					'markdown'
				)
				break
			case 'html':
				await exportLib.saveToFile(
					exportLib.exportToHTML(scanResult, projectName),
					name,
					'html'
				)
				break
		}
	}

	return (
		<div className='space-y-4'>
			<Card className='p-6'>
				<h3 className='text-lg font-semibold mb-3'>Export Options</h3>
				<div className='grid md:grid-cols-3 gap-4'>
					<div>
						<div className='text-sm text-gray-600 mb-2'>Format</div>
						<div className='flex gap-2'>
							<label className='flex items-center gap-1 text-sm'>
								<input
									type='radio'
									checked={format === 'markdown'}
									onChange={() => setFormat('markdown')}
								/>{' '}
								Markdown
							</label>
							<label className='flex items-center gap-1 text-sm'>
								<input
									type='radio'
									checked={format === 'html'}
									onChange={() => setFormat('html')}
								/>{' '}
								HTML
							</label>
							<label className='flex items-center gap-1 text-sm'>
								<input
									type='radio'
									checked={format === 'json'}
									onChange={() => setFormat('json')}
								/>{' '}
								JSON
							</label>
							<label className='flex items-center gap-1 text-sm'>
								<input
									type='radio'
									checked={format === 'csv'}
									onChange={() => setFormat('csv')}
								/>{' '}
								CSV
							</label>
						</div>
					</div>
					<div>
						<div className='text-sm text-gray-600 mb-2'>Content</div>
						<div className='flex gap-4'>
							<label className='flex items-center gap-2 text-sm'>
								<input
									type='checkbox'
									checked={includeSummary}
									onChange={e => setIncludeSummary(e.target.checked)}
								/>{' '}
								Summary
							</label>
							<label className='flex items-center gap-2 text-sm'>
								<input
									type='checkbox'
									checked={includeLanguages}
									onChange={e => setIncludeLanguages(e.target.checked)}
								/>{' '}
								Languages
							</label>
						</div>
					</div>
					<div className='flex items-end'>
						<Button onClick={handleExport}>Export</Button>
					</div>
				</div>
			</Card>
			<Card className='p-6'>
				<h3 className='text-lg font-semibold mb-3'>Preview</h3>
				<div className='h-96 overflow-auto bg-gray-50 border rounded p-3 text-xs font-mono whitespace-pre-wrap'>
					{typeof preview === 'string' ? preview : JSON.stringify(preview, null, 2)}
				</div>
			</Card>
		</div>
	)
}
