import { type ReactNode, useEffect } from 'react'

interface ModalProps {
	isOpen: boolean
	onClose: () => void
	children: ReactNode
	size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}

		if (isOpen) {
			document.addEventListener('keydown', handleEscape)
			document.body.style.overflow = 'hidden'
		}

		return () => {
			document.removeEventListener('keydown', handleEscape)
			document.body.style.overflow = 'unset'
		}
	}, [isOpen, onClose])

	if (!isOpen) return null

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	}

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center'>
			{/* Backdrop */}
			<div
				className='absolute inset-0 bg-black bg-opacity-50 transition-opacity'
				onClick={onClose}
			/>

			{/* Modal */}
			<div
				className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} mx-4 max-h-[90vh] overflow-hidden`}
			>
				{children}
			</div>
		</div>
	)
}

interface ModalHeaderProps {
	children: ReactNode
	onClose?: () => void
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
	return (
		<div className='flex items-center justify-between p-6 border-b border-gray-200'>
			<h2 className='text-xl font-semibold text-gray-900'>{children}</h2>
			{onClose && (
				<button
					onClick={onClose}
					className='text-gray-400 hover:text-gray-600 transition-colors'
				>
					<svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M6 18L18 6M6 6l12 12'
						/>
					</svg>
				</button>
			)}
		</div>
	)
}

interface ModalBodyProps {
	children: ReactNode
	className?: string
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
	return <div className={`p-6 overflow-y-auto ${className}`}>{children}</div>
}

interface ModalFooterProps {
	children: ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
	return (
		<div className='flex items-center justify-end gap-3 p-6 border-t border-gray-200'>
			{children}
		</div>
	)
}
