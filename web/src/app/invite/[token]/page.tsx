'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth-service'

export default function InvitePage({ params }: { params: { token: string } }) {
	const { token } = params
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string>('')
	const [invite, setInvite] = useState<{
		project_id: string
		role: 'admin' | 'collaborator'
	} | null>(null)
	const [accepting, setAccepting] = useState(false)
	const router = useRouter()

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true)
				setError('')
				const res = await fetch(
					`http://localhost:8080/api/invites/${encodeURIComponent(token)}`
				)
				if (!res.ok) {
					const body = await res.json().catch(() => ({}))
					throw new Error(body?.error || 'Invite not found or expired')
				}
				const data = await res.json()
				setInvite(data.invite || null)
			} catch (e: any) {
				setError(e?.message || 'Failed to load invite')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [token])

	async function accept() {
		try {
			setAccepting(true)
			setError('')
			const user = await authService.getCurrentUser()
			if (!user) {
				router.push('/auth/signin')
				return
			}
			const t = authService.getToken()
			const res = await fetch(
				`http://localhost:8080/api/invites/${encodeURIComponent(token)}/accept`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${t}` }
				}
			)
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(body?.error || 'Failed to accept invite')
			}
			router.push('/')
		} catch (e: any) {
			setError(e?.message || 'Failed to accept invite')
		} finally {
			setAccepting(false)
		}
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='container mx-auto px-4 py-12 max-w-xl'>
				<div className='bg-white rounded-lg shadow p-6'>
					<h1 className='text-2xl font-bold mb-2'>Project Invite</h1>
					{loading ? (
						<div className='text-gray-600'>Loading invite…</div>
					) : error ? (
						<div className='text-red-600'>{error}</div>
					) : invite ? (
						<div>
							<p className='mb-4'>
								You have been invited to join a project as{' '}
								<span className='font-semibold'>{invite.role}</span>.
							</p>
							<div className='flex gap-2 mt-4'>
								<button
									onClick={accept}
									disabled={accepting}
									className='px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50'
								>
									{accepting ? 'Accepting…' : 'Accept Invite'}
								</button>
								<Link
									href='/'
									className='px-4 py-2 border rounded hover:bg-gray-50'
								>
									Cancel
								</Link>
							</div>
						</div>
					) : (
						<div className='text-gray-600'>Invite not found.</div>
					)}
				</div>
			</div>
		</div>
	)
}
