import { ScanResult } from '@/types'
import { invoke } from '@tauri-apps/api'

export function scanDirectory(path: string): Promise<ScanResult> {
	return invoke<ScanResult>('scan_directory', { path })
}
