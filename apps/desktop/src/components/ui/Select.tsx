import { type ReactNode } from 'react'

interface SelectProps {
	value: string
	onChange: (value: string) => void
	children: ReactNode
	placeholder?: string
	disabled?: boolean
	className?: string
}

export function Select({
	value,
	onChange,
	children,
	placeholder,
	disabled,
	className = ''
}: SelectProps) {
	return (
		<select
			value={value}
			onChange={e => onChange(e.target.value)}
			disabled={disabled}
			className={`
				block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
				focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
				disabled:bg-gray-100 disabled:cursor-not-allowed
				${className}
			`}
		>
			{placeholder && <option value=''>{placeholder}</option>}
			{children}
		</select>
	)
}

interface SelectOptionProps {
	value: string
	children: ReactNode
	disabled?: boolean
}

export function SelectOption({ value, children, disabled }: SelectOptionProps) {
	return (
		<option value={value} disabled={disabled}>
			{children}
		</option>
	)
}
