import { ScanSettings } from '@/types'
import { invoke } from '@tauri-apps/api'

export async function listSupportedLanguages(): Promise<string[]> {
	const result: string[] = await invoke<string[]>('list_supported_languages')
	return result
}

export async function getCommonExcludedLanguages(): Promise<string[]> {
	const result: string[] = await invoke<string[]>('get_common_excluded_languages')
	return result
}

export async function getScanSettings(): Promise<ScanSettings> {
	const result: ScanSettings = await invoke<ScanSettings>('get_scan_settings')
	return result
}

export async function updateScanSettings(settings: ScanSettings): Promise<void> {
	await invoke('update_scan_settings', { settings })
}
