import { useState, useEffect, useCallback } from 'react'
import { consoleOverlayBus, ConsoleLogPayload, ConsoleLevel } from '../lib/consoleOverlayBus'
import { X } from 'lucide-react'

interface Toast {
	id: string
	level: ConsoleLevel
	text: string
	timestamp: number
	count: number
	timerId?: number
	remainingMs: number
}

export function ConsoleOverlay() {
	const [toasts, setToasts] = useState<Toast[]>([])

	const removeToast = useCallback((id: string) => {
		setToasts(prev => {
			const toast = prev.find(t => t.id === id)
			if (toast?.timerId) {
				clearTimeout(toast.timerId)
			}
			return prev.filter(t => t.id !== id)
		})
	}, [])

	const pauseToast = useCallback((id: string) => {
		setToasts(prev => prev.map(t => (t.id === id ? { ...t, timerId: undefined } : t)))
	}, [])

	const resumeToast = useCallback(
		(id: string) => {
			setToasts(prev => {
				const toast = prev.find(t => t.id === id)
				if (!toast) return prev

				const timerId = window.setTimeout(() => {
					removeToast(id)
				}, toast.remainingMs)

				return prev.map(t => (t.id === id ? { ...t, timerId, remainingMs: 0 } : t))
			})
		},
		[removeToast]
	)

	useEffect(() => {
		const handler = (payload: ConsoleLogPayload) => {
			setToasts(prev => {
				// Coalesce if same text within 1s
				const recent = prev.find(
					t => t.text === payload.text && Date.now() - t.timestamp < 1000
				)

				if (recent) {
					return prev.map(t => (t.id === recent.id ? { ...t, count: t.count + 1 } : t))
				}

				// Add new, limit to 50
				const newToast: Toast = {
					...payload,
					count: 1,
					remainingMs: 10000,
					timerId: window.setTimeout(() => {
						removeToast(payload.id)
					}, 10000)
				}

				const updated = [...prev, newToast]
				return updated.length > 50 ? updated.slice(1) : updated
			})
		}

		consoleOverlayBus.listen(handler)
		return () => consoleOverlayBus.unlisten(handler)
	}, [removeToast])

	if (toasts.length === 0) return null

	return (
		<div className='fixed top-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none'>
			{toasts.map(toast => (
				<ToastItem
					key={toast.id}
					toast={toast}
					onClose={() => removeToast(toast.id)}
					onPause={() => pauseToast(toast.id)}
					onResume={() => resumeToast(toast.id)}
				/>
			))}
		</div>
	)
}

interface ToastItemProps {
	toast: Toast
	onClose: () => void
	onPause: () => void
	onResume: () => void
}

function ToastItem({ toast, onClose, onPause, onResume }: ToastItemProps) {
	const levelStyles = {
		log: 'border-border',
		info: 'border-primary',
		warn: 'border-amber-500 text-amber-500',
		error: 'border-destructive text-destructive',
		debug: 'border-muted text-muted-foreground'
	}

	const formatTime = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
	}

	return (
		<div
			className={`bg-card border-l-4 ${levelStyles[toast.level]} p-3 rounded shadow-lg pointer-events-auto max-w-md`}
			onMouseEnter={onPause}
			onMouseLeave={onResume}
		>
			<div className='flex items-start justify-between gap-2'>
				<div className='flex-1'>
					<div className='text-xs text-muted-foreground'>
						{formatTime(toast.timestamp)}
					</div>
					<div className='text-sm font-mono break-words'>{toast.text}</div>
				</div>
				{toast.count > 1 && (
					<span className='text-xs bg-muted px-1.5 py-0.5 rounded'>x{toast.count}</span>
				)}
				<button
					onClick={onClose}
					className='text-muted-foreground hover:text-foreground flex-shrink-0'
				>
					<X className='h-4 w-4' />
				</button>
			</div>
		</div>
	)
}
