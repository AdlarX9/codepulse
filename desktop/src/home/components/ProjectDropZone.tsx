import { extractDroppedDirectoryPath } from '@/home/drop-path'
import { FolderSearch } from 'lucide-react'
import { DragEvent, useEffect, useRef, useState } from 'react'

interface ProjectDropZoneProps {
	disabled?: boolean
	onProjectPathDrop: (projectPath: string) => Promise<void>
}

export default function ProjectDropZone({
	disabled = false,
	onProjectPathDrop
}: ProjectDropZoneProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [localError, setLocalError] = useState<string | null>(null)
	const lastDroppedRef = useRef<{ path: string; at: number } | null>(null)

	function shouldIgnoreDuplicateDrop(path: string): boolean {
		const now = Date.now()
		if (
			lastDroppedRef.current &&
			lastDroppedRef.current.path === path &&
			now - lastDroppedRef.current.at < 800
		) {
			return true
		}

		lastDroppedRef.current = { path, at: now }
		return false
	}

	async function handleResolvedDropPath(projectPath: string) {
		if (!projectPath || disabled || shouldIgnoreDuplicateDrop(projectPath)) {
			return
		}

		setLocalError(null)
		await onProjectPathDrop(projectPath)
	}

	useEffect(() => {
		let unlisten: (() => void) | undefined

		void (async () => {
			try {
				const { appWindow } = await import('@tauri-apps/api/window')
				unlisten = await appWindow.onFileDropEvent(event => {
					const payload = event.payload as
						| { type: 'drop'; paths: string[] }
						| { type: 'hover'; paths: string[] }
						| { type: 'cancel' }

					if (payload.type === 'hover') {
						setIsDragging(true)
						return
					}

					if (payload.type === 'cancel') {
						setIsDragging(false)
						return
					}

					setIsDragging(false)
					const firstPath = payload.paths?.[0]
					if (firstPath) {
						void handleResolvedDropPath(firstPath)
					}
				})
			} catch {
				// DOM drop handling remains active as fallback.
			}
		})()

		return () => {
			if (unlisten) {
				unlisten()
			}
		}
	}, [disabled, onProjectPathDrop])

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		if (disabled) {
			return
		}
		event.preventDefault()
		event.dataTransfer.dropEffect = 'copy'
		setIsDragging(true)
	}

	function handleDragLeave(event: DragEvent<HTMLDivElement>) {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setIsDragging(false)
		}
	}

	async function handleDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault()
		setIsDragging(false)
		if (disabled) {
			return
		}

		const projectPath = extractDroppedDirectoryPath(event.dataTransfer)
		if (!projectPath) {
			setLocalError(
				'Could not read the dropped folder path. Drop directly from Finder/Explorer.'
			)
			return
		}

		await handleResolvedDropPath(projectPath)
	}

	return (
		<div
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={event => {
				void handleDrop(event)
			}}
			className={`relative rounded-2xl border-2 border-dashed p-8 transition-all duration-200 ${
				isDragging
					? 'border-blue-400 bg-blue-50/70 shadow-[0_12px_35px_-22px_rgba(37,99,235,0.9)]'
					: 'border-blue-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
			}`}
		>
			<div className='flex flex-col items-center justify-center gap-3 text-center'>
				<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700'>
					<FolderSearch className='h-6 w-6' />
				</div>
				<p className='text-sm font-semibold text-slate-800'>Drop a project folder here</p>
				<p className='max-w-md text-xs text-slate-500'>
					CodePulse will grab the directory path and launch the regular scan pipeline.
				</p>
				{localError ? (
					<p className='text-xs font-medium text-amber-700'>{localError}</p>
				) : null}
			</div>
		</div>
	)
}
