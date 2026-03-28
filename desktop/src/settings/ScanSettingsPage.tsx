import { useState, useEffect } from 'react'
import type { ScanSettings } from '@/types'
import ScanSettingsForm from './ScanSettingsForm'
import { getScanSettings, updateScanSettings } from './invokes'

interface ScanSettingsProps {
	onBack?: () => void
}

export default function ScanSettingsPage({ onBack }: ScanSettingsProps) {
	const [settings, setSettings] = useState<ScanSettings>({
		excluded_expressions: [],
		follow_symlinks: false
	})
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		loadSettings()
	}, [])

	async function loadSettings() {
		try {
			const loadedSettings = await getScanSettings()
			setSettings(loadedSettings)
		} catch (error) {
			console.error('Failed to load scan settings:', error)
		} finally {
			setLoading(false)
		}
	}

	async function saveUserSettings(s: ScanSettings) {
		setSaving(true)
		try {
			await updateScanSettings(s)
			onBack?.()
		} catch (error) {
			console.error('Failed to save scan settings:', error)
			alert(`Failed to save scan settings: ${error}`)
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='text-muted-foreground'>Loading scan settings...</div>
			</div>
		)
	}

	return (
		<ScanSettingsForm
			initial={settings}
			onSave={saveUserSettings}
			onCancel={onBack}
			saving={saving}
			title='Scan Settings'
		/>
	)
}
