import type { Platform } from '@codepulse/core'

interface AssetInfo {
	url: string
	sha256: string
}

/**
 * Resolve asset URL for download
 * First tries to load from assets.json, falls back to GitHub API
 */
export async function resolveAssetUrl(
	platform: Platform,
	version: string = 'latest'
): Promise<string> {
	// Try local assets.json first (updated by CI)
	try {
		const assetsUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/assets.json`
		const response = await fetch(assetsUrl, { cache: 'no-store' })

		if (response.ok) {
			const manifest = await response.json()
			const asset = getAssetFromManifest(manifest, platform, version)
			if (asset) return asset
		}
	} catch (error) {
		console.warn('Failed to load assets.json:', error)
	}

	// Fallback to GitHub API
	return resolveFromGitHub(platform, version)
}

function getAssetFromManifest(manifest: any, platform: Platform, version: string): string | null {
	if (version !== 'latest' && manifest.version !== version) {
		return null
	}

	const assets = manifest.assets?.[platform]
	if (!assets) return null

	switch (platform) {
		case 'mac':
			return assets.dmg || null
		case 'win':
			return assets.msi || assets.exe || null
		case 'linux':
			return assets.appImage || assets.deb || null
		default:
			return null
	}
}

async function resolveFromGitHub(platform: Platform, version: string): Promise<string> {
	const repo = process.env.GITHUB_REPO || 'AdlarX9/code-pulse'
	const token = process.env.GITHUB_TOKEN

	const headers: HeadersInit = {
		Accept: 'application/vnd.github+json'
	}
	if (token) {
		headers.Authorization = `Bearer ${token}`
	}

	// Get release
	const releaseUrl =
		version === 'latest'
			? `https://api.github.com/repos/${repo}/releases/latest`
			: `https://api.github.com/repos/${repo}/releases/tags/${version}`

	const response = await fetch(releaseUrl, { headers, cache: 'no-store' })

	if (!response.ok) {
		throw new Error(`Failed to fetch release: ${response.statusText}`)
	}

	const release = await response.json()
	const assets = release.assets || []

	// Find matching asset
	let pattern: RegExp
	switch (platform) {
		case 'mac':
			pattern = /\.dmg$/i
			break
		case 'win':
			pattern = /\.(msi|exe)$/i
			break
		case 'linux':
			pattern = /\.(AppImage|deb)$/i
			break
		default:
			throw new Error(`Unsupported platform: ${platform}`)
	}

	const asset = assets.find((a: any) => pattern.test(a.name))
	if (!asset) {
		throw new Error(`No asset found for platform: ${platform}`)
	}

	return asset.browser_download_url
}
