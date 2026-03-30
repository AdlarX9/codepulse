import { Card } from '@/components/Card'

export type SummaryRow = {
	key: 'total' | 'code' | 'config' | 'doc'
	label: string
	totalFiles: number
	totalLines: number
	mean: number
	median: number
	stdDeviation: number
}

function formatNumber(num: number): string {
	return new Intl.NumberFormat('en-US').format(num)
}

function formatDecimal(num: number): string {
	return new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 1,
		minimumFractionDigits: 1
	}).format(num)
}

const summaryRowStyles: Record<SummaryRow['key'], string> = {
	total: 'bg-slate-50 border-slate-200',
	code: 'bg-blue-50 border-blue-200',
	config: 'bg-emerald-50 border-emerald-200',
	doc: 'bg-amber-50 border-amber-200'
}

type OverviewGlobalStatisticsSectionProps = {
	rows: SummaryRow[]
}

export function OverviewGlobalStatisticsSection({ rows }: OverviewGlobalStatisticsSectionProps) {
	return (
		<Card className='p-6 border bg-white shadow-sm'>
			<div className='flex items-center gap-2 mb-4'>
				<h3 className='text-lg font-semibold text-slate-900'>Global Statistics</h3>
			</div>
			<div className='overflow-x-auto'>
				<table className='w-full min-w-[900px]'>
					<thead>
						<tr className='text-left text-xs uppercase tracking-wide text-slate-500'>
							<th className='pb-3 pr-3 font-semibold'>Scope</th>
							<th className='pb-3 px-3 font-semibold text-right'>Total Files</th>
							<th className='pb-3 px-3 font-semibold text-right'>Total Lines</th>
							<th className='pb-3 px-3 font-semibold text-right'>
								Mean (lines/file)
							</th>
							<th className='pb-3 px-3 font-semibold text-right'>
								Median (lines/file)
							</th>
							<th className='pb-3 pl-3 font-semibold text-right'>Std deviation</th>
						</tr>
					</thead>
					<tbody className='text-sm text-slate-700'>
						{rows.map(row => (
							<tr key={row.key} className='border-b border-slate-100 last:border-0'>
								<td className='py-3 pr-3'>
									<span
										className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${summaryRowStyles[row.key]}`}
									>
										{row.label}
									</span>
								</td>
								<td className='py-3 px-3 text-right font-medium'>
									{formatNumber(row.totalFiles)}
								</td>
								<td className='py-3 px-3 text-right font-semibold text-slate-900'>
									{formatNumber(row.totalLines)}
								</td>
								<td className='py-3 px-3 text-right'>{formatDecimal(row.mean)}</td>
								<td className='py-3 px-3 text-right'>
									{formatDecimal(row.median)}
								</td>
								<td className='py-3 pl-3 text-right'>
									{formatDecimal(row.stdDeviation)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
