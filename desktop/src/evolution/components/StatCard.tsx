import { Card } from '@/components/Card'

type StatCardProps = {
	title: string
	children: React.ReactNode
}

export function StatCard({ title, children }: StatCardProps) {
	return (
		<Card className='rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
			<p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>{title}</p>
			<div className='mt-3'>{children}</div>
		</Card>
	)
}
