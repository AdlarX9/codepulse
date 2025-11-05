import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { X, Save, Info } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import type { UserSettings } from '../types'

interface UserSettingsProps {
	onBack?: () => void
}

export default function UserSettingsPage({ onBack }: UserSettingsProps) {
	const [settings, setSettings] = useState<UserSettings>({
		device_id: '',
		local_salt: '',
		update_channel: 'stable',
		last_update_check: ''
	})
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		loadSettings()
	}, [])

	async function loadSettings() {
		try {
			const loadedSettings = await invoke<UserSettings>('get_user_settings')
			setSettings(loadedSettings)
		} catch (error) {
			console.error('Failed to load user settings:', error)
		} finally {
			setLoading(false)
		}
	}

	async function saveSettings() {
		setSaving(true)
		try {
			await invoke('update_user_settings', { settings })
			onBack?.()
		} catch (error) {
			console.error('Failed to save user settings:', error)
			alert(`Failed to save user settings: ${error}`)
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='text-muted-foreground'>Loading user settings...</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background p-6'>
			<div className='max-w-3xl mx-auto'>
				<div className='flex items-center justify-between mb-6'>
					<h1 className='text-3xl font-bold'>User Settings</h1>
					{onBack && (
						<Button variant='ghost' size='sm' onClick={onBack}>
							<X className='h-5 w-5' />
						</Button>
					)}
				</div>

				<div className='space-y-6'>
					{/* Device Information */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Device Information</h2>
						<p className='text-sm text-muted-foreground mb-6'>
							These identifiers are generated automatically and used for syncing your
							data.
						</p>

						<div className='space-y-4'>
							<div>
								<label className='text-sm font-medium mb-2 block'>Device ID</label>
								<div className='flex items-center gap-2 p-3 bg-muted rounded-md'>
									<code className='text-sm font-mono flex-1 break-all'>
										{settings.device_id || 'Not generated yet'}
									</code>
								</div>
								<p className='text-xs text-muted-foreground mt-1'>
									Unique identifier for this device
								</p>
							</div>

							<div>
								<label className='text-sm font-medium mb-2 block'>Local Salt</label>
								<div className='flex items-center gap-2 p-3 bg-muted rounded-md'>
									<code className='text-sm font-mono flex-1 break-all'>
										{settings.local_salt || 'Not generated yet'}
									</code>
								</div>
								<p className='text-xs text-muted-foreground mt-1'>
									Used for secure data hashing
								</p>
							</div>
						</div>
					</Card>

					{/* Git Provider Tokens */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Git Provider Tokens</h2>
						<p className='text-sm text-muted-foreground mb-6'>
							Optional: provide Personal Access Tokens to enable advanced KPIs
							(PR-based throughput, cycle/lead time) and remote repository features.
							Tokens are stored locally on your device.
						</p>

						<div className='space-y-4'>
							<div>
								<label className='text-sm font-medium mb-2 block'>
									GitHub Token
								</label>
								<input
									type='password'
									value={settings.github_token || ''}
									onChange={e =>
										setSettings({ ...settings, github_token: e.target.value })
									}
									className='w-full px-3 py-2 bg-background border border-input rounded-md'
									placeholder='ghp_...'
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Requires repo:read (or equivalent) to read merged PRs.
								</p>
							</div>

							<div>
								<label className='text-sm font-medium mb-2 block'>
									GitLab Token
								</label>
								<input
									type='password'
									value={settings.gitlab_token || ''}
									onChange={e =>
										setSettings({ ...settings, gitlab_token: e.target.value })
									}
									className='w-full px-3 py-2 bg-background border border-input rounded-md'
									placeholder='glpat-...'
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Requires read_api to read merged MRs.
								</p>
							</div>
						</div>
					</Card>

					{/* Update Settings */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Update Settings</h2>
						<p className='text-sm text-muted-foreground mb-6'>
							Configure how CodePulse checks for updates. Updates are always checked
							automatically.
						</p>

						<div className='space-y-4'>
							<div>
								<label className='text-sm font-medium mb-2 block'>
									Update Channel
								</label>
								<select
									value={settings.update_channel}
									onChange={e =>
										setSettings({ ...settings, update_channel: e.target.value })
									}
									className='w-full px-3 py-2 bg-background border border-input rounded-md'
								>
									<option value='stable'>Stable (Recommended)</option>
									<option value='beta'>Beta (Early Access)</option>
								</select>
								<p className='text-xs text-muted-foreground mt-1'>
									{settings.update_channel === 'stable'
										? 'Receive only stable, tested releases'
										: 'Get early access to new features (may contain bugs)'}
								</p>
							</div>

							<div>
								<label className='text-sm font-medium mb-2 block'>
									Last Update Check
								</label>
								<div className='flex items-center gap-2 p-3 bg-muted rounded-md'>
									<code className='text-sm font-mono'>
										{settings.last_update_check
											? new Date(
													parseInt(settings.last_update_check) * 1000
												).toLocaleString()
											: 'Never'}
									</code>
								</div>
								<p className='text-xs text-muted-foreground mt-1'>
									CodePulse automatically checks for updates every hour
								</p>
							</div>
						</div>

						<div className='mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-md flex gap-3'>
							<Info className='h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5' />
							<div className='text-sm text-blue-900 dark:text-blue-100'>
								<p className='font-medium mb-1'>Automatic Updates</p>
								<p className='text-xs opacity-90'>
									CodePulse automatically checks for updates to ensure you have
									the latest features and security patches. You cannot disable
									this feature.
								</p>
							</div>
						</div>
					</Card>

					{/* Actions */}
					<div className='flex justify-end gap-3'>
						<Button variant='outline' onClick={onBack}>
							Cancel
						</Button>
						<Button onClick={saveSettings} disabled={saving}>
							<Save className='h-4 w-4 mr-2' />
							{saving ? 'Saving...' : 'Save Settings'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
