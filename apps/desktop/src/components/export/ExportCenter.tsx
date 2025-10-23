import { useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import type { ScanResult } from '@/types'
import * as exportLib from '@/lib/export'

interface ExportCenterProps {
	scanResult: ScanResult
	projectName?: string
}

export default function ExportCenter({ scanResult, projectName }: ExportCenterProps) {
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
