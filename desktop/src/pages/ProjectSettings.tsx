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
	const [rawSettings, setRawSettings] = useState<Record<string, any>>({})
	const [isPublic, setIsPublic] = useState<boolean>(false)
	const [profileHandle, setProfileHandle] = useState<string>('')
	const [pinned, setPinned] = useState<boolean>(false)
	const [tagsInput, setTagsInput] = useState<string>('')
	const [notes, setNotes] = useState<string>('')

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
			setIsPublic((p.visibility as string) === 'public')
			try {
				const profile = await api.getProfile()
				if (profile?.profile?.handle) setProfileHandle(profile.profile.handle)
			} catch {}
			const current = p.settings || {}
			setRawSettings(current)
			setPinned(!!current.pinned)
			setTagsInput(Array.isArray(current.tags) ? (current.tags as string[]).join(', ') : '')
			setNotes(typeof current.notes === 'string' ? current.notes : '')
			setSettings({
				excluded_dirs: current?.excluded_dirs || [],
				excluded_extensions: current?.excluded_extensions || [],
				excluded_patterns: current?.excluded_patterns || [],
				follow_symlinks: !!current?.follow_symlinks,
				excluded_languages: current?.excluded_languages || [],
				allowed_languages: current?.allowed_languages || []
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
			const merged = {
				...rawSettings,
				...next,
				pinned,
				tags: tagsInput
					.split(',')
					.map(s => s.trim())
					.filter(Boolean),
				notes
			}
			await api.updateProject(projectId, { settings: merged })
			setMessage('Settings saved')
			setSettings(next)
			setRawSettings(merged)
			onBack()
		} catch (e: any) {
			setError(e?.message || 'Failed to save settings')
		} finally {
			setSaving(false)
		}
	}

	async function saveMeta() {
		setSaving(true)
		setError('')
		setMessage('')
		try {
			const merged = {
				...rawSettings,
				pinned,
				tags: tagsInput
					.split(',')
					.map(s => s.trim())
					.filter(Boolean),
				notes
			}
			await api.updateProject(projectId, { settings: merged })
			setMessage('Project info saved')
			setRawSettings(merged)
		} catch (e: any) {
			setError(e?.message || 'Failed to save project info')
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

			{/* Project Meta */}
			<div className='mt-6 p-4 border rounded-md'>
				<h3 className='font-semibold mb-3'>Project Info</h3>
				<div className='flex items-center gap-2 mb-3'>
					<input
						type='checkbox'
						checked={pinned}
						onChange={e => setPinned(e.target.checked)}
						id='pinned'
					/>
					<label htmlFor='pinned' className='text-sm'>
						Pin in sidebar
					</label>
				</div>
				<div className='mb-3'>
					<label className='text-sm font-medium mb-1 block'>Tags (comma-separated)</label>
					<input
						type='text'
						value={tagsInput}
						onChange={e => setTagsInput(e.target.value)}
						className='w-full px-3 py-2 border rounded'
						placeholder='productivity, tools'
					/>
				</div>
				<div className='mb-3'>
					<label className='text-sm font-medium mb-1 block'>Notes</label>
					<textarea
						value={notes}
						onChange={e => setNotes(e.target.value)}
						className='w-full px-3 py-2 border rounded min-h-[120px]'
						placeholder='Project goals, context, links, etc.'
					/>
				</div>
				<Button onClick={saveMeta} disabled={saving}>
					Save Project Info
				</Button>
			</div>

			{isPublic && profileHandle && (
				<div className='mt-6'>
					<div className='p-4 border rounded-md'>
						<h3 className='font-semibold mb-2'>Share Public Link</h3>
						<div className='flex items-center gap-2'>
							<code className='text-xs bg-gray-100 px-2 py-1 rounded'>
								{`${api.WEB_BASE}/u/${profileHandle}/${projectId}`}
							</code>
							<Button
								variant='outline'
								onClick={() =>
									navigator.clipboard.writeText(
										`${api.WEB_BASE}/u/${profileHandle}/${projectId}`
									)
								}
							>
								Copy
							</Button>
						</div>
						<p className='text-xs text-muted-foreground mt-1'>
							Anyone with this link can view your project profile.
						</p>
					</div>
				</div>
			)}

			{/* Collaborators, invites, transfer ownership removed in local-only mode */}
		</div>
	)
}
