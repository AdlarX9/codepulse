import { Card } from '@/components/Card'
import { resolveLanguageColor } from '@/handles/scan'

type LanguageBreakdownRow = {
	name: string
	stats: {
		files: number
		total: number
		code: number
		comment: number
		blank: number
	}
}

type OverviewLanguagesBreakdownSectionProps = {
	rows: LanguageBreakdownRow[]
	languageColors: Record<string, string>
}

function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
}

export function OverviewLanguagesBreakdownSection({
	rows,
	languageColors
}: OverviewLanguagesBreakdownSectionProps) {
	return (
		<Card className='p-6 border bg-white shadow-sm'>
			<h3 className='text-lg font-semibold text-slate-900 mb-4'>Languages Breakdown</h3>
			<div className='overflow-x-auto'>
				<table className='w-full'>
					<thead className='border-b border-slate-200'>
						<tr className='text-left text-sm text-slate-600'>
							<th className='pb-3 font-medium'>Language</th>
							<th className='pb-3 font-medium text-right'>Files</th>
							<th className='pb-3 font-medium text-right'>Total</th>
							<th className='pb-3 font-medium text-right'>True code</th>
							<th className='pb-3 font-medium text-right'>Comments</th>
							<th className='pb-3 font-medium text-right'>Blank</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-slate-100'>
						{rows.map(({ name, stats }) => (
							<tr key={name} className='text-sm hover:bg-slate-50'>
								<td className='py-3 font-medium'>
									<div className='flex items-center gap-2'>
										<div
											className='w-3 h-3 rounded-full'
											style={{
												backgroundColor: resolveLanguageColor(
													name,
													languageColors
												)
											}}
										/>
										{name}
									</div>
								</td>
								<td className='py-3 text-right text-slate-600'>
									{formatNumber(stats.files)}
								</td>
								<td className='py-3 text-right text-slate-900 font-semibold'>
									{formatNumber(stats.total)}
								</td>
								<td className='py-3 text-right text-slate-900 font-medium'>
									{formatNumber(stats.code)}
								</td>
								<td className='py-3 text-right text-slate-600'>
									{formatNumber(stats.comment)}
								</td>
								<td className='py-3 text-right text-slate-600'>
									{formatNumber(stats.blank)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
