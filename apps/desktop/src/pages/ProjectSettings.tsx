import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '../lib/api'

interface ProjectSettingsProps {
	projectId: string
	onBack: () => void
}

export default function ProjectSettings({ projectId, onBack }: ProjectSettingsProps) {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string>('')
	const [message, setMessage] = useState<string>('')
	const [jsonText, setJsonText] = useState<string>('{}')

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
			setJsonText(JSON.stringify(p.settings || {}, null, 2))
		} catch (e) {
			setError('Failed to load project settings')
		} finally {
			setLoading(false)
		}
	}

	async function save() {
		setSaving(true)
		setError('')
		setMessage('')
		try {
			let settings: any = {}
			try {
				settings = JSON.parse(jsonText || '{}')
			} catch {
				throw new Error('Invalid JSON')
			}
			await api.updateProject(projectId, { settings })
			setMessage('Settings saved')
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

			<Card className='p-6 space-y-4'>
				<div>
					<label className='block text-sm font-medium mb-2'>Custom Settings (JSON)</label>
					<textarea
						className='w-full border rounded px-3 py-2 font-mono text-sm'
						rows={16}
						value={jsonText}
						onChange={e => setJsonText(e.target.value)}
					/>
					<p className='text-xs text-muted-foreground mt-2'>
						These settings are stored in the database and can be used to customize scans
						or integrations.
					</p>
				</div>

				<div className='flex justify-end'>
					<Button onClick={save} disabled={saving}>
						<Save className='h-4 w-4 mr-2' />
						{saving ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</Card>
		</div>
	)
}
