import { useState, useEffect } from 'react'
import { orgApi } from '../../lib/api-org'
import type { OrgMember } from '../../types/organization'
import { Card } from '../ui/Card'
import { SimpleButton as Button } from '../ui/SimpleButton'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select, SelectOption } from '../ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import { Badge } from '../ui/Badge'

interface TeamTabProps {
	orgId: string
}

export default function TeamTab({ orgId }: TeamTabProps) {
	const [members, setMembers] = useState<OrgMember[]>([])
	const [loading, setLoading] = useState(true)
	const [showInviteModal, setShowInviteModal] = useState(false)
	const [inviteEmail, setInviteEmail] = useState('')
	const [inviteRole, setInviteRole] = useState('member')
	const [inviting, setInviting] = useState(false)

	useEffect(() => {
		loadMembers()
	}, [orgId])

	async function loadMembers() {
		try {
			setLoading(true)
			const data = await orgApi.getOrgMembers(orgId)
			setMembers(data)
		} catch (error) {
			console.error('Failed to load members:', error)
		} finally {
			setLoading(false)
		}
	}

	async function handleInvite() {
		if (!inviteEmail.trim()) return

		try {
			setInviting(true)
			await orgApi.inviteMember(orgId, inviteEmail, inviteRole)
			await loadMembers()
			setShowInviteModal(false)
			setInviteEmail('')
			setInviteRole('member')
		} catch (error) {
			console.error('Failed to invite member:', error)
			alert('Failed to invite member')
		} finally {
			setInviting(false)
		}
	}

	async function handleRoleChange(userId: string, newRole: string) {
		try {
			await orgApi.updateMemberRole(orgId, userId, newRole)
			await loadMembers()
		} catch (error) {
			console.error('Failed to update role:', error)
			alert('Failed to update member role')
		}
	}

	async function handleRemove(userId: string) {
		if (!confirm('Are you sure you want to remove this member?')) return

		try {
			await orgApi.removeMember(orgId, userId)
			await loadMembers()
		} catch (error) {
			console.error('Failed to remove member:', error)
			alert('Failed to remove member')
		}
	}

	const getRoleBadge = (role: string) => {
		switch (role) {
			case 'owner':
				return <Badge variant='primary'>Owner</Badge>
			case 'admin':
				return <Badge variant='info'>Admin</Badge>
			default:
				return <Badge variant='default'>Member</Badge>
		}
	}

	if (loading) {
		return <div className='text-center py-8'>Loading team members...</div>
	}

	return (
		<div>
			<Card>
				<div className='p-6'>
					<div className='flex items-center justify-between mb-6'>
						<div>
							<h3 className='text-lg font-semibold text-gray-900'>Team Members</h3>
							<p className='text-sm text-gray-600 mt-1'>
								Invite and manage members of your organization
							</p>
						</div>
						<Button onClick={() => setShowInviteModal(true)}>Invite Member</Button>
					</div>

					{members.length === 0 ? (
						<div className='text-center py-8 text-gray-600'>
							No team members yet. Invite your first member!
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Member</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead className='text-right'>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{members.map(member => (
									<TableRow key={member.id}>
										<TableCell>
											<div className='flex items-center gap-3'>
												<div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center'>
													<span className='text-sm font-medium text-gray-600'>
														{member.user?.email?.[0].toUpperCase()}
													</span>
												</div>
												<div>
													<div className='font-medium'>
														{member.user?.handle || 'Unknown'}
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell className='text-gray-600'>
											{member.user?.email}
										</TableCell>
										<TableCell>{getRoleBadge(member.role)}</TableCell>
										<TableCell className='text-gray-600'>
											{new Date(member.created_at).toLocaleDateString()}
										</TableCell>
										<TableCell className='text-right'>
											{member.role !== 'owner' && (
												<div className='flex items-center justify-end gap-2'>
													<select
														value={member.role}
														onChange={e =>
															handleRoleChange(
																member.user_id,
																e.target.value
															)
														}
														className='text-sm border border-gray-300 rounded px-2 py-1'
													>
														<option value='member'>Member</option>
														<option value='admin'>Admin</option>
													</select>
													<button
														onClick={() => handleRemove(member.user_id)}
														className='text-red-600 hover:text-red-800'
													>
														<svg
															className='w-5 h-5'
															fill='none'
															viewBox='0 0 24 24'
															stroke='currentColor'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
															/>
														</svg>
													</button>
												</div>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</Card>

			<Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)}>
				<ModalHeader onClose={() => setShowInviteModal(false)}>
					Invite Team Member
				</ModalHeader>
				<ModalBody>
					<div className='space-y-4'>
						<Input
							type='email'
							label='Email Address'
							value={inviteEmail}
							onChange={setInviteEmail}
							placeholder='colleague@company.com'
							required
						/>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>
								Role
							</label>
							<Select value={inviteRole} onChange={setInviteRole}>
								<SelectOption value='member'>
									Member - Can view and scan projects
								</SelectOption>
								<SelectOption value='admin'>
									Admin - Can manage settings and members
								</SelectOption>
							</Select>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<Button variant='secondary' onClick={() => setShowInviteModal(false)}>
						Cancel
					</Button>
					<Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
						{inviting ? 'Inviting...' : 'Send Invite'}
					</Button>
				</ModalFooter>
			</Modal>
		</div>
	)
}
