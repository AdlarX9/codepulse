import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { api } from '@/lib/api'

interface Collaborator {
	id: string
	user_id?: string
	git_username: string
	git_email?: string
	role: 'admin' | 'collaborator' | 'owner'
	commits_count?: number
	lines_added?: number
	lines_deleted?: number
}

interface Props {
	projectId: string
}

export default function CollaboratorsManager({ projectId }: Props) {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string>('')
	const [collabs, setCollabs] = useState<Collaborator[]>([])

	const [userId, setUserId] = useState('')
	const [gitUsername, setGitUsername] = useState('')
	const [gitEmail, setGitEmail] = useState('')
	const [role, setRole] = useState<'admin' | 'collaborator'>('collaborator')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId])

	async function load() {
		try {
			setLoading(true)
			setError('')
			const list = await api.getCollaborators(projectId)
			setCollabs(list || [])
		} catch (e: any) {
			setError(e?.message || 'Failed to load collaborators')
		} finally {
			setLoading(false)
		}
	}

	async function add() {
		if (!userId.trim() && !gitUsername.trim()) return
		setSaving(true)
		setError('')
		try {
			await api.addCollaborator(projectId, {
				user_id: userId.trim() || undefined,
				git_username: gitUsername.trim() || undefined,
				git_email: gitEmail.trim() || undefined,
				role
			})
			setUserId('')
			setGitUsername('')
			setGitEmail('')
			setRole('collaborator')
			await load()
		} catch (e: any) {
			setError(e?.message || 'Failed to add collaborator')
		} finally {
			setSaving(false)
		}
	}

	async function updateRole(id: string, next: 'admin' | 'collaborator') {
		try {
			await api.updateCollaborator(projectId, id, { role: next })
			setCollabs(prev => prev.map(c => (c.id === id ? { ...c, role: next } : c)))
		} catch (e) {
			// ignore
		}
	}

	async function remove(id: string) {
		try {
			await api.removeCollaborator(projectId, id)
			setCollabs(prev => prev.filter(c => c.id !== id))
		} catch (e) {
			// ignore
		}
	}

	if (loading) {
		return (
			<Card className='p-6'>
				<div className='text-sm text-gray-600'>Loading collaborators...</div>
			</Card>
		)
	}

	return (
		<Card className='p-6'>
			<h2 className='text-xl font-semibold mb-4'>Collaborators</h2>
			{error && <div className='mb-3 text-red-600 text-sm'>{error}</div>}

			<div className='grid md:grid-cols-4 gap-3 mb-4'>
				<div>
					<label className='text-sm font-medium mb-1 block'>User ID (optional)</label>
					<input
						type='text'
						value={userId}
						onChange={e => setUserId(e.target.value)}
						placeholder='UUID of registered user'
						className='w-full px-3 py-2 border rounded'
					/>
				</div>
				<div>
					<label className='text-sm font-medium mb-1 block'>Git Username</label>
					<input
						type='text'
						value={gitUsername}
						onChange={e => setGitUsername(e.target.value)}
						placeholder='e.g. octocat'
						className='w-full px-3 py-2 border rounded'
					/>
				</div>
				<div>
					<label className='text-sm font-medium mb-1 block'>Git Email (optional)</label>
					<input
						type='email'
						value={gitEmail}
						onChange={e => setGitEmail(e.target.value)}
						placeholder='name@example.com'
						className='w-full px-3 py-2 border rounded'
					/>
				</div>
				<div>
					<label className='text-sm font-medium mb-1 block'>Role</label>
					<select
						value={role}
						onChange={e =>
							setRole((e.target.value as 'admin' | 'collaborator') || 'collaborator')
						}
						className='w-full px-3 py-2 border rounded'
					>
						<option value='collaborator'>Collaborator</option>
						<option value='admin'>Admin</option>
					</select>
				</div>
			</div>
			<div className='mb-6'>
				<Button onClick={add} disabled={saving || (!userId.trim() && !gitUsername.trim())}>
					{saving ? 'Adding...' : 'Add Collaborator'}
				</Button>
			</div>

			{collabs.length === 0 ? (
				<div className='text-sm text-gray-600'>No collaborators yet.</div>
			) : (
				<div className='overflow-x-auto'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='text-left text-gray-500'>
								<th className='p-2'>Git Username</th>
								<th className='p-2'>Email</th>
								<th className='p-2'>Role</th>
								<th className='p-2'>Commits</th>
								<th className='p-2'>Δ Lines</th>
								<th className='p-2'></th>
							</tr>
						</thead>
						<tbody>
							{collabs.map(c => (
								<tr key={c.id} className='border-t'>
									<td className='p-2'>{c.git_username || '-'}</td>
									<td className='p-2'>{c.git_email || '-'}</td>
									<td className='p-2'>
										{c.role === 'owner' ? (
											<span className='px-2 py-0.5 text-xs rounded bg-gray-100 border'>
												Owner
											</span>
										) : (
											<select
												value={c.role}
												onChange={e =>
													updateRole(
														c.id,
														(e.target.value as
															| 'admin'
															| 'collaborator') || 'collaborator'
													)
												}
												className='px-2 py-1 border rounded'
											>
												<option value='collaborator'>Collaborator</option>
												<option value='admin'>Admin</option>
											</select>
										)}
									</td>
									<td className='p-2'>{c.commits_count ?? '-'}</td>
									<td className='p-2'>
										{c.lines_added != null && c.lines_deleted != null
											? `${c.lines_added - c.lines_deleted}`
											: '-'}
									</td>
									<td className='p-2 text-right'>
										{c.role !== 'owner' && (
											<Button
												variant='outline'
												size='sm'
												onClick={() => remove(c.id)}
											>
												Remove
											</Button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Card>
	)
}
