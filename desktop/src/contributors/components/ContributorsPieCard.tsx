import { Card } from '@/components/Card'
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { PieContributorSlice } from '../types'
import { formatInt } from '../analytics'

type ContributorsPieCardProps = {
	slices: PieContributorSlice[]
}

export function ContributorsPieCard({ slices }: ContributorsPieCardProps) {
	return (
		<Card className='rounded-xl border border-gray-200 bg-white p-6 shadow-sm'>
			<h4 className='mb-4 text-base font-semibold text-gray-900'>LOC Share by Contributor</h4>
			{slices.length === 0 ? (
				<div className='flex h-[340px] items-center justify-center text-gray-500'>
					No line attribution data
				</div>
			) : (
				<div className='h-[340px]'>
					<ResponsiveContainer width='100%' height='100%'>
						<PieChart>
							<Pie
								data={slices}
								dataKey='lines'
								nameKey='label'
								cx='50%'
								cy='50%'
								outerRadius={110}
								innerRadius={55}
								paddingAngle={2}
							>
								{slices.map(slice => (
									<Cell key={slice.key} fill={slice.color} />
								))}
							</Pie>
							<Tooltip
								formatter={(value: number, _name, item: any) => {
									const payload = item?.payload as PieContributorSlice | undefined
									if (!payload) {
										return [formatInt(value), 'lines']
									}
									return [
										formatInt(value),
										`${payload.label} (${payload.percentage.toFixed(1)}%)`
									]
								}}
							/>
							<Legend />
						</PieChart>
					</ResponsiveContainer>
				</div>
			)}
		</Card>
	)
}
