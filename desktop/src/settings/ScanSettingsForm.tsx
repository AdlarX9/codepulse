import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import type { ScanSettings } from '@/types'

type ScanSettingsFormProps = {
	initial: ScanSettings
	onSave: (settings: ScanSettings) => Promise<void> | void
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
	const initialNormalized = useMemo(
		() => normalizeExpressions((initial?.excluded_expressions || []).join('\n')),
		[initial]
	)
	const hasChanges =
		followSymlinks !== Boolean(initial?.follow_symlinks) ||
		JSON.stringify(preview) !== JSON.stringify(initialNormalized)

	async function saveSettings() {
		if (!hasChanges) {
			return
		}

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
		<div className='h-full bg-background px-2 py-2 sm:px-4 sm:py-4'>
			<div className='max-w-5xl mx-auto space-y-5'>
				<div className='flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-5'>
					<div>
						<h1 className='text-2xl font-bold text-card-foreground'>
							{title || 'Scan Settings'}
						</h1>
						<p className='mt-1 text-sm text-muted-foreground'>
							Configure how the Scanner explores files and ignores paths.
						</p>
					</div>
					<Button
						onClick={saveSettings}
						disabled={saving || isSaving || !hasChanges}
						className='gap-2 min-w-40'
					>
						<Save className='h-4 w-4' />
						{saving || isSaving ? 'Saving...' : 'Save Settings'}
					</Button>
				</div>

				<Card className='p-6 space-y-4'>
					<div>
						<h2 className='text-xl font-semibold'>Excluded Expressions</h2>
						<p className='text-sm text-muted-foreground mt-1'>
							One expression per line. Supports the same expressions as a <code>.gitignore</code> file.
						</p>
					</div>

					<textarea
						value={excludedText}
						onChange={e => setExcludedText(e.target.value)}
						rows={12}
						className='w-full min-h-72 rounded-lg border border-input bg-background p-3 font-mono text-sm leading-6 custom-scroll'
						placeholder='node_modules\n.git\n*.lock\n!src/generated'
					/>

					<div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
						<span>{preview.length} expression(s)</span>
						<span>
							Examples: <code className='rounded bg-muted px-1 py-0.5'>dist</code>{' '}
							<code className='rounded bg-muted px-1 py-0.5'>*.lock</code>{' '}
							<code className='rounded bg-muted px-1 py-0.5'>!src/generated</code>
						</span>
					</div>
				</Card>

				<Card className='p-6 space-y-4'>
					<div className='flex items-center justify-between'>
						<div>
							<h2 className='text-xl font-semibold'>Symlinks</h2>
							<p className='text-sm text-muted-foreground mt-1'>
								Enable this only if your repository structure requires following
								links.
							</p>
						</div>
						<label className='inline-flex items-center gap-2 text-sm'>
							<input
								type='checkbox'
								checked={followSymlinks}
								onChange={e => setFollowSymlinks(e.target.checked)}
							/>
							<span>Follow Symlinks</span>
						</label>
					</div>
				</Card>
			</div>
		</div>
	)
}
