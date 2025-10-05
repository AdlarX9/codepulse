/**
 * Constants used across CodePulse
 */

export const EXCLUDED_DIR_NAMES = [
	'node_modules',
	'.git',
	'.svn',
	'.hg',
	'dist',
	'build',
	'out',
	'target',
	'.next',
	'.nuxt',
	'.turbo',
	'coverage',
	'__pycache__',
	'.pytest_cache',
	'.venv',
	'venv',
	'vendor',
	'bin',
	'obj'
]

export const PLATFORMS: Record<string, string> = {
	mac: 'macOS',
	win: 'Windows',
	linux: 'Linux'
}

export const RELEASE_CHANNELS = ['stable', 'beta', 'nightly'] as const

export const DEFAULT_SCAN_OPTIONS = {
	excludeDirs: EXCLUDED_DIR_NAMES,
	excludeExtensions: [] as string[],
	followSymlinks: false
}
