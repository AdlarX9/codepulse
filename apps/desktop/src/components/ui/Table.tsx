import { type ReactNode } from 'react'

interface TableProps {
	children: ReactNode
	className?: string
}

export function Table({ children, className = '' }: TableProps) {
	return (
		<div className='overflow-x-auto'>
			<table className={`min-w-full divide-y divide-gray-200 ${className}`}>{children}</table>
		</div>
	)
}

interface TableHeaderProps {
	children: ReactNode
}

export function TableHeader({ children }: TableHeaderProps) {
	return <thead className='bg-gray-50'>{children}</thead>
}

interface TableBodyProps {
	children: ReactNode
}

export function TableBody({ children }: TableBodyProps) {
	return <tbody className='bg-white divide-y divide-gray-200'>{children}</tbody>
}

interface TableRowProps {
	children: ReactNode
	className?: string
}

export function TableRow({ children, className = '' }: TableRowProps) {
	return <tr className={className}>{children}</tr>
}

interface TableHeadProps {
	children: ReactNode
	className?: string
}

export function TableHead({ children, className = '' }: TableHeadProps) {
	return (
		<th
			scope='col'
			className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
		>
			{children}
		</th>
	)
}

interface TableCellProps {
	children: ReactNode
	className?: string
}

export function TableCell({ children, className = '' }: TableCellProps) {
	return (
		<td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}>
			{children}
		</td>
	)
}
