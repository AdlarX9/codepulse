import { useEffect, useMemo, useState } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import type { ScanSettings } from '@/types'

type ScanSettingsFormProps = {
	initial: ScanSettings
	onSave: (settings: ScanSettings) => Promise<void> | void
	onCancel?: () => void
	saving?: boolean
	title?: string
}

function normalizeExpressions(input: string): string[] {
	return input
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)
}

export default function ScanSettingsForm({
	initial,
	onSave,
	onCancel,
	saving,
	title
}: ScanSettingsFormProps) {
	const [excludedText, setExcludedText] = useState('')
	const [followSymlinks, setFollowSymlinks] = useState(false)
	const [isSaving, setIsSaving] = useState(false)

	useEffect(() => {
		setExcludedText((initial?.excluded_expressions || []).join('\n'))
		setFollowSymlinks(Boolean(initial?.follow_symlinks))
	}, [initial])

	const preview = useMemo(() => normalizeExpressions(excludedText), [excludedText])

	async function saveSettings() {
		setIsSaving(true)
		try {
			await onSave({
				excluded_expressions: normalizeExpressions(excludedText),
				follow_symlinks: followSymlinks
			})
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className='min-h-screen bg-background p-6'>
			<div className='max-w-4xl mx-auto space-y-6'>
				<div className='flex items-center justify-between'>
					<h1 className='text-3xl font-bold'>{title || 'Scan Settings'}</h1>
					{onCancel && (
						<Button variant='ghost' size='sm' onClick={onCancel}>
							<X className='h-5 w-5' />
						</Button>
					)}
				</div>

				<Card className='p-6 space-y-4'>
					<div>
						<h2 className='text-xl font-semibold'>Excluded Expressions</h2>
						<p className='text-sm text-muted-foreground mt-1'>
							One expression per line. Supports the same patterns used by the Rust backend.
						</p>
					</div>

					<textarea
						value={excludedText}
						onChange={e => setExcludedText(e.target.value)}
						rows={14}
						className='w-full rounded-md border border-input bg-background p-3 font-mono text-sm'
						placeholder='node_modules\n.git\n*.lock\n!src/generated'
					/>

					<div className='text-xs text-muted-foreground'>
						{preview.length} expression(s)
					</div>
				</Card>

				<Card className='p-6 space-y-4'>
					<div className='flex items-center justify-between'>
						<div>
							<h2 className='text-xl font-semibold'>Symlinks</h2>
							<p className='text-sm text-muted-foreground mt-1'>
								Follow symbolic links during scan.
							</p>
						</div>
						<label className='inline-flex items-center gap-2 text-sm'>
							<input
								type='checkbox'
								checked={followSymlinks}
								onChange={e => setFollowSymlinks(e.target.checked)}
							/>
							<span>follow_symlinks</span>
						</label>
					</div>
				</Card>

				<div className='flex justify-end'>
					<Button onClick={saveSettings} disabled={saving || isSaving} className='gap-2'>
						<Save className='h-4 w-4' />
						{saving || isSaving ? 'Saving...' : 'Save Settings'}
					</Button>
				</div>
			</div>
		</div>
	)
}
