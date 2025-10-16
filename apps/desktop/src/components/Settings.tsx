import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/tauri'
import { X, Plus, Trash2, Save } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Autocomplete } from './ui/Autocomplete'
import type { UserSettings } from '../types'
import { ALL_LANGUAGES, COMMON_EXCLUDED_LANGUAGES } from '../constants/languages'
interface SettingsProps {
	onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
	const [settings, setSettings] = useState<UserSettings>({
		excluded_dirs: [],
		excluded_extensions: [],
		excluded_patterns: [],
		follow_symlinks: false,
		excluded_languages: [],
		allowed_languages: [],
		sync_enabled: false,
		device_id: '',
		local_salt: '',
		auto_update: true,
		update_channel: 'stable',
		last_update_check: ''
	})
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	// inputs
	const [newExcludedLanguage, setNewExcludedLanguage] = useState('')
	const [newAllowedLanguage, setNewAllowedLanguage] = useState('')
	const [newPattern, setNewPattern] = useState('')
	const [newDir, setNewDir] = useState('')
	const [newExt, setNewExt] = useState('')

	useEffect(() => {
		loadSettings()
	}, [])

	async function loadSettings() {
		try {
			const loadedSettings = await invoke<UserSettings>('get_settings')
			setSettings(loadedSettings)
		} catch (error) {
			console.error('Failed to load settings:', error)
		} finally {
			setLoading(false)
		}
	}

	async function saveSettings() {
		setSaving(true)
		try {
			await invoke('update_settings', { settings })
			onBack()
		} catch (error) {
			console.error('Failed to save settings:', error)
			alert(`Failed to save settings: ${error}`)
		} finally {
			setSaving(false)
		}
	}

	// ---------- helpers ----------
	function addToList<K extends keyof UserSettings>(
		key: K,
		value: string,
		normalizer?: (s: string) => string
	) {
		const v = normalizer ? normalizer(value) : value
		if (!v) return
		const current = (settings[key] as unknown as string[]) || []
		if (current.includes(v)) return
		setSettings({ ...settings, [key]: [...current, v] } as UserSettings)
	}

	function removeFromList<K extends keyof UserSettings>(key: K, value: string) {
		const current = (settings[key] as unknown as string[]) || []
		setSettings({
			...settings,
			[key]: current.filter((x: string) => x !== value)
		} as UserSettings)
	}

	// normalize extensions: lowercased, without leading dot
	const normalizeExt = (s: string) => s.trim().toLowerCase().replace(/^\./, '')

	if (loading) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='text-muted-foreground'>Loading settings...</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-background p-6'>
			<div className='max-w-5xl mx-auto'>
				<div className='flex items-center justify-between mb-6'>
					<h1 className='text-3xl font-bold'>Settings</h1>
					<Button variant='ghost' size='sm' onClick={onBack}>
						<X className='h-5 w-5' />
					</Button>
				</div>

				<div className='space-y-6'>
					{/* Excluded Languages */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Excluded Languages</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							Select languages to exclude from analysis. Files matching these
						</p>

						<div className='space-y-4'>
							{/* Quick Select */}
							<div>
								<label className='text-sm font-medium mb-2 block'>
									Common Languages
								</label>
								<div className='flex flex-wrap gap-2'>
									{COMMON_EXCLUDED_LANGUAGES.map(lang => {
										const isSelected =
											settings.excluded_languages.includes(lang)
										return (
											<button
												key={lang}
												onClick={() =>
													isSelected
														? removeFromList('excluded_languages', lang)
														: addToList('excluded_languages', lang)
												}
												className={`px-3 py-1 rounded-full text-sm transition-colors ${
													isSelected
														? 'bg-primary text-primary-foreground'
														: 'bg-muted hover:bg-muted/80'
												}`}
											>
												{lang}
											</button>
										)
									})}
								</div>
							</div>

							{/* Custom Language */}
							<div>
								<label className='text-sm font-medium mb-2 block'>
									Add Language (with autocomplete)
								</label>
								<Autocomplete
									value={newExcludedLanguage}
									onChange={setNewExcludedLanguage}
									onAdd={() => {
										addToList('excluded_languages', newExcludedLanguage.trim())
										setNewExcludedLanguage('')
									}}
									suggestions={ALL_LANGUAGES.filter(
										l => !settings.excluded_languages.includes(l)
									)}
									placeholder='Type to search languages...'
								/>
							</div>

							{/* Excluded List */}
							{settings.excluded_languages.length > 0 && (
								<div>
									<label className='text-sm font-medium mb-2 block'>
										Currently Excluded
									</label>
									<div className='flex flex-wrap gap-2'>
										{settings.excluded_languages.map(lang => (
											<div
												key={lang}
												className='flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive rounded-md'
											>
												<span className='text-sm'>{lang}</span>
												<button
													onClick={() =>
														removeFromList('excluded_languages', lang)
													}
													className='hover:bg-destructive/20 rounded p-0.5'
												>
													<Trash2 className='h-3 w-3' />
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</Card>

					{/* Allowed Languages */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-1'>
							Allowed Languages (Allowlist)
						</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							Optional. If this list is not empty, only these languages will be
							analyzed. Leave empty to allow all (except excluded).
						</p>

						<div className='space-y-4'>
							{/* Quick Select */}
							<div>
								<label className='text-sm font-medium mb-2 block'>
									Add Allowed Language (with autocomplete)
								</label>
								<Autocomplete
									value={newAllowedLanguage}
									onChange={setNewAllowedLanguage}
									onAdd={() => {
										addToList('allowed_languages', newAllowedLanguage.trim())
										setNewAllowedLanguage('')
									}}
									suggestions={ALL_LANGUAGES.filter(
										l => !settings.allowed_languages.includes(l)
									)}
									placeholder='Type to search languages...'
								/>
							</div>

							{settings.allowed_languages.length > 0 && (
								<div>
									<label className='text-sm font-medium mb-2 block'>
										Allowlist
									</label>
									<div className='flex flex-wrap gap-2'>
										{settings.allowed_languages.map(lang => (
											<div
												key={lang}
												className='flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md'
											>
												<span className='text-sm'>{lang}</span>
												<button
													onClick={() =>
														removeFromList('allowed_languages', lang)
													}
													className='hover:bg-emerald-500/20 rounded p-0.5'
												>
													<Trash2 className='h-3 w-3' />
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</Card>

					{/* Excluded Directories (names) */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Excluded Directories (names)</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							Add directory names to exclude (exact match, no wildcards). For
							patterns, use the section below.
						</p>

						<div className='space-y-4'>
							<div className='flex gap-2'>
								<input
									type='text'
									value={newDir}
									onChange={e => setNewDir(e.target.value)}
									onKeyDown={e =>
										e.key === 'Enter' &&
										(() => {
											addToList('excluded_dirs', newDir.trim())
											setNewDir('')
										})()
									}
									placeholder='e.g., node_modules, vendor, build'
									className='flex-1 px-3 py-2 bg-background border border-input rounded-md'
								/>
								<Button
									onClick={() => {
										addToList('excluded_dirs', newDir.trim())
										setNewDir('')
									}}
								>
									<Plus className='h-4 w-4' />
								</Button>
							</div>

							{settings.excluded_dirs.length > 0 && (
								<div className='space-y-2'>
									{settings.excluded_dirs.map(d => (
										<div
											key={d}
											className='flex items-center justify-between p-3 bg-muted rounded-md'
										>
											<code className='text-sm font-mono'>{d}</code>
											<button
												onClick={() => removeFromList('excluded_dirs', d)}
												className='text-destructive hover:bg-destructive/10 rounded p-1'
											>
												<Trash2 className='h-4 w-4' />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</Card>

					{/* Excluded Directory Patterns */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Excluded Directory Patterns</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							Add directory patterns to exclude. Use <code>*</code> as a wildcard
							(e.g., <code>tutos*</code>).
						</p>

						<div className='space-y-4'>
							<div className='flex gap-2'>
								<input
									type='text'
									value={newPattern}
									onChange={e => setNewPattern(e.target.value)}
									onKeyDown={e =>
										e.key === 'Enter' &&
										(() => {
											addToList('excluded_patterns', newPattern.trim())
											setNewPattern('')
										})()
									}
									placeholder='e.g., lib, tutos*, test_*'
									className='flex-1 px-3 py-2 bg-background border border-input rounded-md'
								/>
								<Button
									onClick={() => {
										addToList('excluded_patterns', newPattern.trim())
										setNewPattern('')
									}}
								>
									<Plus className='h-4 w-4' />
								</Button>
							</div>

							{settings.excluded_patterns.length > 0 && (
								<div className='space-y-2'>
									{settings.excluded_patterns.map(pattern => (
										<div
											key={pattern}
											className='flex items-center justify-between p-3 bg-muted rounded-md'
										>
											<code className='text-sm font-mono'>{pattern}</code>
											<button
												onClick={() =>
													removeFromList('excluded_patterns', pattern)
												}
												className='text-destructive hover:bg-destructive/10 rounded p-1'
											>
												<Trash2 className='h-4 w-4' />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</Card>

					{/* Excluded Extensions */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Excluded Extensions</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							List file extensions to exclude (without the leading dot). Example:{' '}
							<code>lock</code>, <code>min.js</code> is not an extension (use patterns
							instead).
						</p>

						<div className='space-y-4'>
							<div className='flex gap-2'>
								<input
									type='text'
									value={newExt}
									onChange={e => setNewExt(e.target.value)}
									onKeyDown={e =>
										e.key === 'Enter' &&
										(() => {
											const norm = normalizeExt(newExt)
											addToList('excluded_extensions', norm, normalizeExt)
											setNewExt('')
										})()
									}
									placeholder='e.g., lock, tmp, bak'
									className='flex-1 px-3 py-2 bg-background border border-input rounded-md'
								/>
								<Button
									onClick={() => {
										const norm = normalizeExt(newExt)
										addToList('excluded_extensions', norm, normalizeExt)
										setNewExt('')
									}}
								>
									<Plus className='h-4 w-4' />
								</Button>
							</div>

							{settings.excluded_extensions.length > 0 && (
								<div className='flex flex-wrap gap-2'>
									{settings.excluded_extensions.map(ext => (
										<div
											key={ext}
											className='flex items-center gap-2 px-3 py-1 bg-muted rounded-md'
										>
											<span className='text-sm font-mono'>.{ext}</span>
											<button
												onClick={() =>
													removeFromList('excluded_extensions', ext)
												}
												className='text-destructive hover:bg-destructive/10 rounded p-1'
											>
												<Trash2 className='h-4 w-4' />
											</button>
										</div>
									))}
								</div>
							)}
						</div>
					</Card>

					{/* Follow symlinks */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Follow Symlinks</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							When enabled, the scanner will follow symbolic links while walking
							directories.
						</p>

						<label className='flex items-center gap-3 cursor-pointer'>
							<input
								type='checkbox'
								checked={settings.follow_symlinks}
								onChange={e =>
									setSettings({ ...settings, follow_symlinks: e.target.checked })
								}
								className='w-5 h-5'
							/>
							<span className='text-sm font-medium'>
								Follow symlinks during analysis
							</span>
						</label>
					</Card>

					{/* Auto-Update Settings */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>Auto-Update</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							Automatically check for and install updates to CodePulse.
						</p>

						<div className='space-y-4'>
							<label className='flex items-center gap-3 cursor-pointer'>
								<input
									type='checkbox'
									checked={settings.auto_update}
									onChange={e =>
										setSettings({ ...settings, auto_update: e.target.checked })
									}
									className='w-5 h-5'
								/>
								<span className='text-sm font-medium'>
									Enable automatic updates
								</span>
							</label>

							{settings.auto_update && (
								<div>
									<label className='block text-sm font-medium mb-2'>
										Update Channel
									</label>
									<select
										value={settings.update_channel}
										onChange={e =>
											setSettings({
												...settings,
												update_channel: e.target.value
											})
										}
										className='w-full px-3 py-2 bg-background border border-input rounded-md'
									>
										<option value='stable'>Stable (Recommended)</option>
										<option value='beta'>Beta (Early Access)</option>
									</select>
									<p className='text-xs text-muted-foreground mt-1'>
										{settings.update_channel === 'beta'
											? 'Get early access to new features (may be unstable)'
											: 'Stable releases only (recommended for production use)'}
									</p>
								</div>
							)}

							{settings.last_update_check && (
								<div className='text-xs text-muted-foreground'>
									Last checked:{' '}
									{new Date(
										parseInt(settings.last_update_check) * 1000
									).toLocaleDateString()}
								</div>
							)}
						</div>
					</Card>

					{/* Sync (opt-in) */}
					<Card className='p-6'>
						<h2 className='text-xl font-semibold mb-4'>
							Sync Aggregated Stats (Opt-in)
						</h2>
						<p className='text-sm text-muted-foreground mb-4'>
							When enabled, the app can queue anonymous aggregated statistics (no file
							paths, no contents) for synchronization. You can review queued files
							locally.
						</p>

						<label className='flex items-center gap-3 cursor-pointer mb-3'>
							<input
								type='checkbox'
								checked={settings.sync_enabled}
								onChange={e =>
									setSettings({ ...settings, sync_enabled: e.target.checked })
								}
								className='w-5 h-5'
							/>
							<span className='text-sm font-medium'>
								Enable sync of aggregated stats
							</span>
						</label>

						<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
							<div>
								<label className='text-sm font-medium mb-1 block'>Device ID</label>
								<input
									readOnly
									value={settings.device_id}
									className='w-full px-3 py-2 bg-muted border border-input rounded-md'
								/>
							</div>
							<div>
								<label className='text-sm font-medium mb-1 block'>Local Salt</label>
								<input
									readOnly
									value={settings.local_salt}
									className='w-full px-3 py-2 bg-muted border border-input rounded-md'
								/>
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
