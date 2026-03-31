function sanitizePath(rawPath: string): string {
	return rawPath.trim().replace(/^"|"$/g, '')
}

function fromFileUri(uri: string): string | null {
	try {
		const parsed = new URL(uri)
		if (parsed.protocol !== 'file:') {
			return null
		}

		let pathname = decodeURIComponent(parsed.pathname)
		if (/^\/[a-zA-Z]:\//.test(pathname)) {
			pathname = pathname.slice(1)
		}

		return sanitizePath(pathname)
	} catch {
		return null
	}
}

function looksLikePath(value: string): boolean {
	if (!value) {
		return false
	}

	if (value.startsWith('/')) {
		return true
	}

	return /^[a-zA-Z]:[\\/]/.test(value)
}

export function extractDroppedDirectoryPath(dataTransfer: DataTransfer): string | null {
	const files = Array.from(dataTransfer.files)
	for (const file of files) {
		const maybePath = (file as File & { path?: string }).path
		if (maybePath) {
			return sanitizePath(maybePath)
		}
	}

	const uriList = dataTransfer.getData('text/uri-list')
	if (uriList) {
		const firstUri = uriList
			.split('\n')
			.map(line => line.trim())
			.find(line => line && !line.startsWith('#'))

		if (firstUri) {
			const path = fromFileUri(firstUri)
			if (path) {
				return path
			}
		}
	}

	const plainText = sanitizePath(dataTransfer.getData('text/plain'))
	if (!plainText) {
		return null
	}

	if (plainText.startsWith('file://')) {
		return fromFileUri(plainText)
	}

	if (looksLikePath(plainText)) {
		return plainText
	}

	return null
}
