export interface GeneralSettings {
	device_id: string
	local_salt: string
	update_channel: string
	last_update_check: string
}

export interface ScanSettings {
	excluded_languages: string[]
	allowed_languages: string[]
	excluded_patterns: string[]
	excluded_dirs: string[]
	excluded_extensions: string[]
	follow_symlinks: boolean
}
