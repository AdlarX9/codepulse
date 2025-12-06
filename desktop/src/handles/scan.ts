import { ScanSettings } from '@/features/settings/types'
import { ScanResult } from '@/types'
import { invoke } from '@tauri-apps/api'

export function scanDirectory(path: string, scanSettings: ScanSettings): Promise<ScanResult> {
	return invoke<ScanResult>('scan_directory', { path, scanSettings })
}
