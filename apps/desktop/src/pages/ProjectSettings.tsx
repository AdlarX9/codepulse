import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { ScanSettingsForm } from '../components/ScanSettings'
import type { ScanSettings } from '../types'

interface ProjectSettingsProps {
	projectId: string
	onBack: () => void
}

export default function ProjectSettings({ projectId, onBack }: ProjectSettingsProps) {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string>('')
	const [message, setMessage] = useState<string>('')
	const [settings, setSettings] = useState<ScanSettings>({
		excluded_dirs: [],
		excluded_extensions: [],
		excluded_patterns: [],
		follow_symlinks: false,
		excluded_languages: [],
		allowed_languages: []
	})

	useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId])

	async function load() {
		try {
			setLoading(true)
			setError('')
			const data = await api.getProject(projectId)
			const p = data.project || data
			setSettings({
				excluded_dirs: p.settings?.excluded_dirs || [],
				excluded_extensions: p.settings?.excluded_extensions || [],
				excluded_patterns: p.settings?.excluded_patterns || [],
				follow_symlinks: !!p.settings?.follow_symlinks,
				excluded_languages: p.settings?.excluded_languages || [],
				allowed_languages: p.settings?.allowed_languages || []
			})
		} catch (e) {
			setError('Failed to load project settings')
		} finally {
			setLoading(false)
		}
	}

	async function save(next: ScanSettings) {
		setSaving(true)
		setError('')
		setMessage('')
		try {
			await api.updateProject(projectId, { settings: next })
			setMessage('Settings saved')
			setSettings(next)
			onBack()
		} catch (e: any) {
			setError(e?.message || 'Failed to save settings')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return <div className='container mx-auto p-6'>Loading project settings...</div>
	}

	return (
		<div className='container mx-auto p-6'>
			<div className='flex items-center gap-2 mb-6'>
				<Button variant='ghost' onClick={onBack}>
					<ArrowLeft className='h-4 w-4 mr-2' />
					Back
				</Button>
				<h1 className='text-2xl font-bold'>Project Settings</h1>
			</div>

			{error && <div className='mb-4 text-red-600'>{error}</div>}
			{message && <div className='mb-4 text-green-600'>{message}</div>}

			<ScanSettingsForm
				initial={settings}
				onSave={save}
				onCancel={onBack}
				saving={saving}
				title='Project Scan Settings'
			/>
		</div>
	)
}
