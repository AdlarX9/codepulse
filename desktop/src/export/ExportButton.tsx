import { useState } from 'react'
import * as exportLib from './functions'
import {
	Braces,
	Code,
	Download,
	FileJson,
	FileSpreadsheet,
	FileText,
	FileType2,
	FileType
} from 'lucide-react'
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
	const { scanResult, projectName, projectPath, hasGit } = useMainContext()

	if (!scanResult) {
		return null
	}

	async function handleExport(format: ExportFormat) {
		if (!scanResult) {
			return
		}

		try {
			setExporting(true)
			setShowMenu(false)

			const success = await exportLib.runExport({
				format,
				scanResult,
				projectName,
				projectPath,
				hasGit
			})

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
							<div className='px-4 py-1 text-[11px] uppercase tracking-wide text-gray-500'>
								Raw data
							</div>
							<button
								onClick={() => handleExport('raw-json')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileJson className='h-4 w-4 text-blue-600' />
								<span>JSON (Files/Commits/Contributors)</span>
							</button>
							<button
								onClick={() => handleExport('raw-csv')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileSpreadsheet className='h-4 w-4 text-green-600' />
								<span>CSV (3 sheets)</span>
							</button>
							<button
								onClick={() => handleExport('raw-sql')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<Braces className='h-4 w-4 text-slate-700' />
								<span>SQL (3 tables)</span>
							</button>
							<button
								onClick={() => handleExport('raw-xml')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<Code className='h-4 w-4 text-orange-600' />
								<span>XML (3 sections)</span>
							</button>

							<div className='my-1 h-px bg-gray-200' />
							<div className='px-4 py-1 text-[11px] uppercase tracking-wide text-gray-500'>
								Visual report
							</div>
							<button
								onClick={() => handleExport('visual-html')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<Code className='h-4 w-4 text-indigo-600' />
								<span>HTML report</span>
							</button>
							<button
								onClick={() => handleExport('visual-pdf')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileType className='h-4 w-4 text-red-600' />
								<span>PDF report</span>
							</button>
							<button
								onClick={() => handleExport('visual-markdown')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileText className='h-4 w-4 text-purple-600' />
								<span>Markdown report</span>
							</button>
							<button
								onClick={() => handleExport('visual-latex')}
								className='w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3'
							>
								<FileType2 className='h-4 w-4 text-teal-600' />
								<span>LaTeX report</span>
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
