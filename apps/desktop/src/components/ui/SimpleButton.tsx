import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface SimpleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode
	variant?: 'default' | 'secondary' | 'ghost' | 'danger'
	size?: 'sm' | 'md' | 'lg'
}

export function SimpleButton({
	children,
	variant = 'default',
	size = 'md',
	className = '',
	...props
}: SimpleButtonProps) {
	const baseClasses =
		'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

	const variantClasses = {
		default: 'bg-blue-400 text-white hover:bg-blue-500 focus:ring-blue-500',
		secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
		ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
		danger: 'bg-red-400 text-white hover:bg-red-500 focus:ring-red-500'
	}

	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-6 py-3 text-lg'
	}

	return (
		<button
			className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
			{...props}
		>
			{children}
		</button>
	)
}
