import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ArrowLeft, Save, LogOut, Trash2, Github, Linkedin, Globe, Twitter } from 'lucide-react'
import { api } from '../lib/api'

interface ProfileManagementProps {
	onBack: () => void
	onLogout: () => void
}

export default function ProfileManagement({ onBack, onLogout }: ProfileManagementProps) {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string>('')
	const [message, setMessage] = useState<string>('')
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [deletePassword, setDeletePassword] = useState('')
	const [deleting, setDeleting] = useState(false)
	const [form, setForm] = useState({
		display_name: '',
		avatar_url: '',
		bio: '',
		github: '',
		linkedin: '',
		twitter: '',
		website: '',
		visibility: 'private'
	})
	const [accountForm, setAccountForm] = useState({
		handle: '',
		email: '',
		current_password: '',
		new_password: '',
		confirm_password: ''
	})
	const [handleStatus, setHandleStatus] = useState<{
		checking: boolean
		available: boolean | null
		message: string
	}>({ checking: false, available: null, message: '' })
	const [handleCheckTimeout, setHandleCheckTimeout] = useState<NodeJS.Timeout | null>(null)

	useEffect(() => {
		load()
	}, [])

	async function load() {
		try {
			setLoading(true)
			setError('')
			const [profileData, userData] = await Promise.all([
				api.getProfile(),
				api.getCurrentUser()
			])
			const p = profileData.profile || {}
			const links = p.links || {}
			setForm({
				display_name: p.display_name || '',
				avatar_url: p.avatar_url || '',
				bio: p.bio || '',
				github: links.github || '',
				linkedin: links.linkedin || '',
				twitter: links.twitter || '',
				website: links.website || '',
				visibility: p.visibility || 'private'
			})
			setAccountForm({
				handle: p.handle || '',
				email: userData?.email || '',
				current_password: '',
				new_password: '',
				confirm_password: ''
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
			const links: any = {}
			if (form.github) links.github = form.github
			if (form.linkedin) links.linkedin = form.linkedin
			if (form.twitter) links.twitter = form.twitter
			if (form.website) links.website = form.website

			await api.updateProfile({
				display_name: form.display_name || undefined,
				avatar_url: form.avatar_url || undefined,
				bio: form.bio || undefined,
				links,
				visibility: form.visibility
			})
			setMessage('Profile updated successfully!')
			setTimeout(() => setMessage(''), 3000)
		} catch (e: any) {
			setError(e?.message || 'Failed to update profile')
		} finally {
			setSaving(false)
		}
	}

	async function handleLogout() {
		try {
			await api.logout()
			onLogout()
		} catch (e: any) {
			setError(e?.message || 'Failed to logout')
		}
	}

	async function handleDeleteAccount() {
		if (!deletePassword) {
			setError('Please enter your password to confirm account deletion')
			return
		}
		setDeleting(true)
		setError('')
		try {
			await api.deleteAccount(deletePassword)
			onLogout()
		} catch (e: any) {
			setError(e?.message || 'Failed to delete account')
		} finally {
			setDeleting(false)
		}
	}

	async function checkHandle(handle: string) {
		if (!handle || handle.length < 3) {
			setHandleStatus({ checking: false, available: null, message: '' })
			return
		}

		setHandleStatus({ checking: true, available: null, message: 'Checking...' })

		try {
			const result = await api.checkHandleAvailability(handle)
			setHandleStatus({
				checking: false,
				available: result.available,
				message: result.reason
			})
		} catch (e: any) {
			setHandleStatus({
				checking: false,
				available: null,
				message: 'Error checking availability'
			})
		}
	}

	function handleHandleChange(value: string) {
		setAccountForm({ ...accountForm, handle: value })

		// Clear existing timeout
		if (handleCheckTimeout) {
			clearTimeout(handleCheckTimeout)
		}

		// Set new timeout for debounced check
		const timeout = setTimeout(() => {
			checkHandle(value)
		}, 500)
		setHandleCheckTimeout(timeout)
	}

	async function saveAccountSettings() {
		setSaving(true)
		setError('')
		setMessage('')
		try {
			const updates: any = {}

			// Handle change
			if (accountForm.handle && accountForm.handle !== form.display_name) {
				updates.handle = accountForm.handle
			}

			// Email change
			if (accountForm.email && accountForm.current_password) {
				updates.email = accountForm.email
				updates.current_password = accountForm.current_password
			}

			// Password change
			if (accountForm.new_password) {
				if (accountForm.new_password !== accountForm.confirm_password) {
					setError('Passwords do not match')
					setSaving(false)
					return
				}
				if (!accountForm.current_password) {
					setError('Current password is required to change password')
					setSaving(false)
					return
				}
				updates.password = accountForm.new_password
				updates.current_password = accountForm.current_password
			}

			if (Object.keys(updates).length > 0) {
				await api.updateProfile(updates)
				setMessage('Account settings updated successfully!')
				setTimeout(() => setMessage(''), 3000)
				// Reload to get updated data
				await load()
			} else {
				setMessage('No changes to save')
				setTimeout(() => setMessage(''), 3000)
			}
		} catch (e: any) {
			setError(e?.message || 'Failed to update account settings')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return <div className='container mx-auto p-6'>Loading profile...</div>
	}

	return (
		<div className='container mx-auto p-6 max-w-4xl'>
			<div className='flex items-center justify-between mb-6'>
				<div className='flex items-center gap-2'>
					<Button variant='ghost' onClick={onBack}>
						<ArrowLeft className='h-4 w-4 mr-2' />
						Back
					</Button>
					<h1 className='text-2xl font-bold'>Profile Management</h1>
				</div>
				<Button variant='outline' onClick={handleLogout}>
					<LogOut className='h-4 w-4 mr-2' />
					Logout
				</Button>
			</div>

			{error && (
				<div className='mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded'>
					{error}
				</div>
			)}
			{message && (
				<div className='mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded'>
					{message}
				</div>
			)}

			<div className='space-y-6'>
				{/* Profile Information */}
				<Card className='p-6 space-y-4'>
					<h2 className='text-lg font-semibold mb-4'>Profile Information</h2>
					<div>
						<label className='block text-sm font-medium mb-1'>Display Name</label>
						<input
							className='w-full border rounded px-3 py-2'
							placeholder='Your display name'
							value={form.display_name}
							onChange={e => setForm({ ...form, display_name: e.target.value })}
						/>
					</div>
					<div>
						<label className='block text-sm font-medium mb-1'>Avatar URL</label>
						<input
							className='w-full border rounded px-3 py-2'
							placeholder='https://example.com/avatar.jpg'
							value={form.avatar_url}
							onChange={e => setForm({ ...form, avatar_url: e.target.value })}
						/>
					</div>
					<div>
						<label className='block text-sm font-medium mb-1'>Bio</label>
						<textarea
							className='w-full border rounded px-3 py-2'
							rows={3}
							placeholder='Tell us about yourself...'
							value={form.bio}
							onChange={e => setForm({ ...form, bio: e.target.value })}
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
				</Card>

				{/* Social Links */}
				<Card className='p-6 space-y-4'>
					<h2 className='text-lg font-semibold mb-4'>Social Links</h2>
					<div>
						<label className='flex items-center gap-2 text-sm font-medium mb-1'>
							<Github className='h-4 w-4' />
							GitHub
						</label>
						<input
							className='w-full border rounded px-3 py-2'
							placeholder='https://github.com/username'
							value={form.github}
							onChange={e => setForm({ ...form, github: e.target.value })}
						/>
					</div>
					<div>
						<label className='flex items-center gap-2 text-sm font-medium mb-1'>
							<Linkedin className='h-4 w-4' />
							LinkedIn
						</label>
						<input
							className='w-full border rounded px-3 py-2'
							placeholder='https://linkedin.com/in/username'
							value={form.linkedin}
							onChange={e => setForm({ ...form, linkedin: e.target.value })}
						/>
					</div>
					<div>
						<label className='flex items-center gap-2 text-sm font-medium mb-1'>
							<Twitter className='h-4 w-4' />
							Twitter/X
						</label>
						<input
							className='w-full border rounded px-3 py-2'
							placeholder='https://twitter.com/username'
							value={form.twitter}
							onChange={e => setForm({ ...form, twitter: e.target.value })}
						/>
					</div>
					<div>
						<label className='flex items-center gap-2 text-sm font-medium mb-1'>
							<Globe className='h-4 w-4' />
							Website
						</label>
						<input
							className='w-full border rounded px-3 py-2'
							placeholder='https://yourwebsite.com'
							value={form.website}
							onChange={e => setForm({ ...form, website: e.target.value })}
						/>
					</div>
				</Card>

				{/* Actions for Profile */}
				<div className='flex justify-end'>
					<Button onClick={save} disabled={saving}>
						<Save className='h-4 w-4 mr-2' />
						{saving ? 'Saving Profile...' : 'Save Profile'}
					</Button>
				</div>

				{/* Account Settings */}
				<Card className='p-6 space-y-4'>
					<h2 className='text-lg font-semibold mb-4'>Account Settings</h2>
					<div>
						<label className='block text-sm font-medium mb-1'>
							Username (Handle)
						</label>
						<input
							className='w-full border rounded px-3 py-2'
							placeholder='username'
							value={accountForm.handle}
							onChange={e => handleHandleChange(e.target.value)}
						/>
						{handleStatus.message && (
							<p
								className={`text-sm mt-1 ${
									handleStatus.available === true
										? 'text-green-600'
										: handleStatus.available === false
										? 'text-red-600'
										: 'text-gray-600'
								}`}
							>
								{handleStatus.checking ? '⏳ ' : handleStatus.available ? '✓ ' : '✗ '}
								{handleStatus.message}
							</p>
						)}
					</div>
					<div>
						<label className='block text-sm font-medium mb-1'>Email</label>
						<input
							type='email'
							className='w-full border rounded px-3 py-2'
							placeholder='your@email.com'
							value={accountForm.email}
							onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
						/>
						<p className='text-xs text-gray-500 mt-1'>
							Changing email requires your current password
						</p>
					</div>
					<div>
						<label className='block text-sm font-medium mb-1'>New Password</label>
						<input
							type='password'
							className='w-full border rounded px-3 py-2'
							placeholder='Leave blank to keep current password'
							value={accountForm.new_password}
							onChange={e =>
								setAccountForm({ ...accountForm, new_password: e.target.value })
							}
						/>
					</div>
					<div>
						<label className='block text-sm font-medium mb-1'>
							Confirm New Password
						</label>
						<input
							type='password'
							className='w-full border rounded px-3 py-2'
							placeholder='Confirm new password'
							value={accountForm.confirm_password}
							onChange={e =>
								setAccountForm({ ...accountForm, confirm_password: e.target.value })
							}
						/>
					</div>
					<div>
						<label className='block text-sm font-medium mb-1'>
							Current Password
						</label>
						<input
							type='password'
							className='w-full border rounded px-3 py-2'
							placeholder='Required to change email or password'
							value={accountForm.current_password}
							onChange={e =>
								setAccountForm({ ...accountForm, current_password: e.target.value })
							}
						/>
					</div>
				</Card>

				{/* Actions for Account */}
				<div className='flex justify-between items-center'>
					<Button onClick={saveAccountSettings} disabled={saving}>
						<Save className='h-4 w-4 mr-2' />
						{saving ? 'Saving...' : 'Save Account Settings'}
					</Button>
					<Button
						variant='destructive'
						onClick={() => setShowDeleteConfirm(true)}
					>
						<Trash2 className='h-4 w-4 mr-2' />
						Delete Account
					</Button>
				</div>

				{/* Delete Account Confirmation */}
				{showDeleteConfirm && (
					<Card className='p-6 border-red-200 bg-red-50'>
						<h3 className='text-lg font-semibold text-red-800 mb-4'>
							Delete Account Confirmation
						</h3>
						<p className='text-sm text-red-700 mb-4'>
							This action is irreversible. All your data will be permanently deleted.
							Please enter your password to confirm.
						</p>
						<div className='space-y-4'>
							<input
								type='password'
								className='w-full border rounded px-3 py-2'
								placeholder='Enter your password'
								value={deletePassword}
								onChange={e => setDeletePassword(e.target.value)}
							/>
							<div className='flex gap-2 justify-end'>
								<Button
									variant='outline'
									onClick={() => {
										setShowDeleteConfirm(false)
										setDeletePassword('')
										setError('')
									}}
								>
									Cancel
								</Button>
								<Button
									variant='destructive'
									onClick={handleDeleteAccount}
									disabled={deleting || !deletePassword}
								>
									{deleting ? 'Deleting...' : 'Confirm Delete'}
								</Button>
							</div>
						</div>
					</Card>
				)}
			</div>
		</div>
	)
}
