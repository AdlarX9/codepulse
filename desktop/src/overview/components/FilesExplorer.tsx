import { AlertTriangle, Info, Search } from 'lucide-react'
import { Card } from '@/components/Card'
import { resolveLanguageColor } from '@/handles/scan'

type FileAlert = {
	level: 'high' | 'low'
	label: string
} | null

type FileExplorerRow = {
	path: string
	language: string
	total: number
	code: number
	comment: number
	blank: number
	alert: FileAlert
}

type FilesExplorerProps = {
	projectPath: string
	searchLang: string
	searchQuery: string
	onSearchLangChange: (value: string) => void
	onSearchQueryChange: (value: string) => void
	languageOptions: string[]
	rows: FileExplorerRow[]
	languageColors: Record<string, string>
}

function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
}

function getRelativePath(absolutePath: string, basePath: string): string {
	if (absolutePath.startsWith(basePath)) {
		return absolutePath.slice(basePath.length).replace(/^[\\/]/, '')
	}
	return absolutePath
}

export function FilesExplorer({
	projectPath,
	searchLang,
	searchQuery,
	onSearchLangChange,
	onSearchQueryChange,
	languageOptions,
	rows,
	languageColors
}: FilesExplorerProps) {
	return (
		<Card className='rounded-xl border bg-white p-4 shadow-sm sm:p-6'>
			<div className='flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between'>
				<h3 className='text-lg font-semibold text-slate-900'>Files Explorer</h3>
				<div className='flex w-full flex-col gap-2 sm:flex-row md:w-auto'>
					<div className='relative w-full md:w-52'>
						<select
							className='w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 bg-white'
							value={searchLang}
							onChange={e => onSearchLangChange(e.target.value)}
						>
							<option value=''>All languages</option>
							{languageOptions.map(language => (
								<option key={language} value={language}>
									{language}
								</option>
							))}
						</select>
					</div>
					<div className='relative w-full md:w-72'>
						<Search className='h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2' />
						<input
							type='text'
							className='w-full border border-slate-300 rounded-md pl-9 pr-3 py-2 text-sm'
							placeholder='Search path...'
							value={searchQuery}
							onChange={e => onSearchQueryChange(e.target.value)}
						/>
					</div>
				</div>
			</div>
			<div className='text-xs text-slate-500 mb-4'>
				Project root: <span className='font-mono break-all'>{projectPath}</span>
			</div>
			<div className='overflow-x-auto'>
				<table className='w-full'>
					<thead className='border-b border-slate-200'>
						<tr className='text-left text-sm text-slate-600'>
							<th className='pb-3 font-medium'>Path</th>
							<th className='pb-3 font-medium'>Language</th>
							<th className='pb-3 font-medium text-right'>Total</th>
							<th className='hidden pb-3 text-right font-medium sm:table-cell'>
								True code
							</th>
							<th className='hidden pb-3 text-right font-medium md:table-cell'>
								Comments
							</th>
							<th className='hidden pb-3 text-right font-medium lg:table-cell'>
								Blank
							</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-slate-100'>
						{rows.map(file => (
							<tr key={file.path} className='text-sm hover:bg-slate-50'>
								<td className='py-3 font-mono text-xs text-slate-700'>
									<div className='flex items-center gap-2'>
										{file.alert?.level === 'high' && (
											<span title={file.alert.label}>
												<AlertTriangle className='h-4 w-4 text-amber-600 shrink-0' />
											</span>
										)}
										{file.alert?.level === 'low' && (
											<span title={file.alert.label}>
												<Info className='h-4 w-4 text-sky-600 shrink-0' />
											</span>
										)}
										<span className='break-all'>
											{getRelativePath(file.path, projectPath)}
										</span>
									</div>
								</td>
								<td className='py-3'>
									<div className='flex items-center gap-2'>
										<div
											className='w-2.5 h-2.5 rounded-full'
											style={{
												backgroundColor: resolveLanguageColor(
													file.language,
													languageColors
												)
											}}
										/>
										<span>{file.language}</span>
									</div>
								</td>
								<td className='py-3 text-right text-slate-900 font-semibold'>
									{formatNumber(file.total)}
								</td>
								<td className='hidden py-3 text-right font-medium text-slate-900 sm:table-cell'>
									{formatNumber(file.code)}
								</td>
								<td className='hidden py-3 text-right text-slate-600 md:table-cell'>
									{formatNumber(file.comment)}
								</td>
								<td className='hidden py-3 text-right text-slate-600 lg:table-cell'>
									{formatNumber(file.blank)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
