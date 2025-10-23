import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { api } from '@/lib/api'

interface Invite {
	id: string
	token: string
	email?: string
	git_username?: string
	role: 'admin' | 'collaborator'
	status: 'pending' | 'accepted' | 'revoked' | 'expired'
	expires_at?: string
	created_at: string
}

interface Props {
	projectId: string
}

export default function InvitesManager({ projectId }: Props) {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [invites, setInvites] = useState<Invite[]>([])

	const [email, setEmail] = useState('')
	const [gitUsername, setGitUsername] = useState('')
	const [role, setRole] = useState<'admin' | 'collaborator'>('collaborator')
	const [days, setDays] = useState<number>(14)
	const [saving, setSaving] = useState(false)

	async function load() {
		try {
			setLoading(true)
			setError('')
			const list = await api.listInvites(projectId)
			setInvites(list || [])
		} catch (e: any) {
			setError(e?.message || 'Failed to load invites')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId])

	async function create() {
		if (!email.trim() && !gitUsername.trim()) return
		setSaving(true)
		setError('')
		try {
			await api.createInvite(projectId, {
				email: email.trim() || undefined,
				git_username: gitUsername.trim() || undefined,
				role,
				expires_in_days: days
			})
			setEmail('')
			setGitUsername('')
			setRole('collaborator')
			setDays(14)
			await load()
		} catch (e: any) {
			setError(e?.message || 'Failed to create invite')
		} finally {
			setSaving(false)
		}
	}

	async function revoke(id: string) {
		try {
			await api.revokeInvite(projectId, id)
			setInvites(prev => prev.filter(i => i.id !== id))
		} catch (e) {}
	}

	const baseUrl = api.WEB_BASE || 'http://localhost:3000'

	return (
		<Card className='p-6'>
			<h2 className='text-xl font-semibold mb-4'>Invites</h2>
			{error && <div className='mb-3 text-red-600 text-sm'>{error}</div>}

			<div className='grid md:grid-cols-4 gap-3 mb-4'>
				<div>
					<label className='text-sm font-medium mb-1 block'>
						Recipient Email (optional)
					</label>
					<input
						type='email'
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder='user@example.com'
						className='w-full px-3 py-2 border rounded'
					/>
				</div>
				<div>
					<label className='text-sm font-medium mb-1 block'>
						Git Username (optional)
					</label>
					<input
						type='text'
						value={gitUsername}
						onChange={e => setGitUsername(e.target.value)}
						placeholder='octocat'
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
				<div>
					<label className='text-sm font-medium mb-1 block'>Expires (days)</label>
					<input
						type='number'
						min={1}
						max={365}
						value={days}
						onChange={e => setDays(parseInt(e.target.value || '14', 10))}
						className='w-full px-3 py-2 border rounded'
					/>
				</div>
			</div>
			<div className='mb-6'>
				<Button
					onClick={create}
					disabled={saving || (!email.trim() && !gitUsername.trim())}
				>
					{saving ? 'Creating...' : 'Create Invite'}
				</Button>
			</div>

			{loading ? (
				<div className='text-sm text-gray-600'>Loading invites...</div>
			) : invites.length === 0 ? (
				<div className='text-sm text-gray-600'>No pending invites.</div>
			) : (
				<div className='overflow-x-auto'>
					<table className='w-full text-sm'>
						<thead>
							<tr className='text-left text-gray-500'>
								<th className='p-2'>Recipient</th>
								<th className='p-2'>Role</th>
								<th className='p-2'>Expires</th>
								<th className='p-2'>Link</th>
								<th className='p-2'></th>
							</tr>
						</thead>
						<tbody>
							{invites.map(inv => (
								<tr key={inv.id} className='border-t'>
									<td className='p-2'>{inv.email || inv.git_username || '-'}</td>
									<td className='p-2'>{inv.role}</td>
									<td className='p-2'>
										{inv.expires_at
											? new Date(inv.expires_at).toLocaleDateString()
											: '-'}
									</td>
									<td className='p-2'>
										<code className='text-xs bg-gray-100 px-2 py-1 rounded'>
											{`${baseUrl}/invite/${inv.token}`}
										</code>
									</td>
									<td className='p-2 text-right'>
										<div className='flex justify-end gap-2'>
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													navigator.clipboard.writeText(
														`${baseUrl}/invite/${inv.token}`
													)
												}
											>
												Copy
											</Button>
											<Button
												variant='outline'
												size='sm'
												onClick={() => revoke(inv.id)}
											>
												Revoke
											</Button>
										</div>
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
