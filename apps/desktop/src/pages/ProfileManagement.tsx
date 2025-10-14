import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '../lib/api'

interface ProfileManagementProps {
	onBack: () => void
}

export default function ProfileManagement({ onBack }: ProfileManagementProps) {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string>('')
	const [message, setMessage] = useState<string>('')
	const [form, setForm] = useState({
		display_name: '',
		avatar_url: '',
		bio: '',
		links: '{}',
		visibility: 'private'
	})

	useEffect(() => {
		load()
	}, [])

	async function load() {
		try {
			setLoading(true)
			setError('')
			const data = await api.getProfile()
			const p = data.profile || {}
			setForm({
				display_name: p.display_name || '',
				avatar_url: p.avatar_url || '',
				bio: p.bio || '',
				links: JSON.stringify(p.links || {}, null, 2),
				visibility: p.visibility || 'private'
			})
		} catch (e) {
			setError('Failed to load profile')
		} finally {
			setLoading(false)
		}
	}

	async function save() {
		setSaving(true)
		setError('')
		setMessage('')
		try {
			let links: any = {}
			try {
				links = JSON.parse(form.links || '{}')
			} catch {
				throw new Error('Invalid JSON in links')
			}
			await api.updateProfile({
				display_name: form.display_name || undefined,
				avatar_url: form.avatar_url || undefined,
				bio: form.bio || undefined,
				links,
				visibility: form.visibility
			})
			setMessage('Profile updated')
		} catch (e: any) {
			setError(e?.message || 'Failed to update profile')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return <div className='container mx-auto p-6'>Loading profile...</div>
	}

	return (
		<div className='container mx-auto p-6'>
			<div className='flex items-center gap-2 mb-6'>
				<Button variant='ghost' onClick={onBack}>
					<ArrowLeft className='h-4 w-4 mr-2' />
					Back
				</Button>
				<h1 className='text-2xl font-bold'>Profile Management</h1>
			</div>

			{error && <div className='mb-4 text-red-600'>{error}</div>}
			{message && <div className='mb-4 text-green-600'>{message}</div>}

			<Card className='p-6 space-y-4'>
				<div>
					<label className='block text-sm font-medium mb-1'>Display Name</label>
					<input
						className='w-full border rounded px-3 py-2'
						value={form.display_name}
						onChange={e => setForm({ ...form, display_name: e.target.value })}
					/>
				</div>
				<div>
					<label className='block text-sm font-medium mb-1'>Avatar URL</label>
					<input
						className='w-full border rounded px-3 py-2'
						value={form.avatar_url}
						onChange={e => setForm({ ...form, avatar_url: e.target.value })}
					/>
				</div>
				<div>
					<label className='block text-sm font-medium mb-1'>Bio</label>
					<textarea
						className='w-full border rounded px-3 py-2'
						rows={3}
						value={form.bio}
						onChange={e => setForm({ ...form, bio: e.target.value })}
					/>
				</div>
				<div>
					<label className='block text-sm font-medium mb-1'>Links (JSON)</label>
					<textarea
						className='w-full border rounded px-3 py-2 font-mono text-sm'
						rows={6}
						value={form.links}
						onChange={e => setForm({ ...form, links: e.target.value })}
					/>
				</div>
				<div>
					<label className='block text-sm font-medium mb-1'>Visibility</label>
					<select
						className='w-full border rounded px-3 py-2'
						value={form.visibility}
						onChange={e => setForm({ ...form, visibility: e.target.value })}
					>
						<option value='private'>Private</option>
						<option value='public'>Public</option>
					</select>
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
