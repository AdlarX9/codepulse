import { Card } from '@/components/Card'
import { ContributorRow } from '../types'
import { formatDecimal, formatInt } from '../analytics'

type ContributorsTableCardProps = {
	rows: ContributorRow[]
}

export function ContributorsTableCard({ rows }: ContributorsTableCardProps) {
	return (
		<Card className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<h4 className='mb-4 text-base font-semibold text-gray-900'>
				Contributors Productivity
			</h4>
			<div className='overflow-x-auto'>
				<table className='w-full text-sm'>
					<thead className='border-b border-gray-200 text-left text-gray-600'>
						<tr>
							<th className='pb-3 font-medium'>Contributor</th>
							<th className='pb-3 text-right font-medium'>Commits</th>
							<th className='pb-3 text-right font-medium'>Lines</th>
							<th className='pb-3 text-right font-medium'>Lines / commit</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-gray-100'>
						{rows.map(contributor => (
							<tr key={contributor.key} className='hover:bg-gray-50'>
								<td className='py-3'>
									<p className='font-semibold text-gray-900'>
										{contributor.pseudo}
									</p>
									<p className='text-xs text-gray-500'>
										{contributor.email || contributor.name}
									</p>
								</td>
								<td className='py-3 text-right text-gray-700'>
									{formatInt(contributor.commits)}
								</td>
								<td className='py-3 text-right text-gray-700'>
									{formatInt(contributor.lines)}
								</td>
								<td className='py-3 text-right font-medium text-gray-900'>
									{formatDecimal(contributor.lines_per_commit)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
