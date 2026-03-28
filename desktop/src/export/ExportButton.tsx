import { useState } from 'react'
import * as exportLib from '@/export/functions'
import { Download, FileText, FileJson, FileSpreadsheet, Code } from 'lucide-react'
import { ExportFormat } from '@/types'
import { Button } from '@/components/Button'
import { useMainContext } from '@/navigation/MainContext'

interface ExportButtonProps {
	variant?: 'default' | 'outline' | 'ghost'
	size?: 'default' | 'sm' | 'lg'
}

export default function ExportButton({ variant = 'outline', size = 'sm' }: ExportButtonProps) {
	const [showMenu, setShowMenu] = useState(false)
	const [exporting, setExporting] = useState(false)
	const { scanResult, projectName } = useMainContext()

	if (!scanResult) {
		return null
	}

	async function handleExport(format: ExportFormat) {
		if (!scanResult) {
			return
		}

		const data = scanResult

		try {
			setExporting(true)
			setShowMenu(false)

			let content = ''
			const fileName = projectName || 'code-analysis'

			switch (format) {
				case 'json':
					content = exportLib.exportToJSON(data)
					break
				case 'csv':
					content = exportLib.exportToCSV(data)
					break
				case 'markdown':
					content = exportLib.exportToMarkdown(data, projectName)
					break
				case 'html':
					content = exportLib.exportToHTML(data, projectName)
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
