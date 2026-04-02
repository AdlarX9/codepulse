type ResourceListener = () => void

type ResourceEntry<T> = {
	data: T | null
	error: string | null
	updatedAt: number | null
	promise: Promise<T> | null
	requestId: number
	listeners: Set<ResourceListener>
}

export type ResourceSnapshot<T> = {
	data: T | null
	error: string | null
	loading: boolean
	refreshing: boolean
	updatedAt: number | null
}

const resourceStore = new Map<string, ResourceEntry<unknown>>()

export function normalizeCachePath(path: string): string {
	const trimmed = path.trim().replace(/\\/g, '/')
	const squashed = trimmed.replace(/\/+/g, '/')
	return squashed.length > 1 ? squashed.replace(/\/+$/, '') : squashed
}

export function formatResourceError(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	if (typeof error === 'string') {
		return error
	}

	return 'Unknown error'
}

function getResourceEntry<T>(key: string): ResourceEntry<T> {
	const current = resourceStore.get(key)
	if (current) {
		return current as ResourceEntry<T>
	}

	const created: ResourceEntry<T> = {
		data: null,
		error: null,
		updatedAt: null,
		promise: null,
		requestId: 0,
		listeners: new Set<ResourceListener>()
	}
	resourceStore.set(key, created)
	return created
}

function notifyResourceEntry(entry: ResourceEntry<unknown>) {
	for (const listener of entry.listeners) {
		listener()
	}
}

export function getResourceSnapshot<T>(key: string): ResourceSnapshot<T> {
	const entry = getResourceEntry<T>(key)
	const hasData = entry.data !== null
	const isPending = entry.promise !== null

	return {
		data: entry.data,
		error: entry.error,
		loading: !hasData && isPending,
		refreshing: hasData && isPending,
		updatedAt: entry.updatedAt
	}
}

export function subscribeResource(key: string, listener: ResourceListener): () => void {
	const entry = getResourceEntry(key)
	entry.listeners.add(listener)

	return () => {
		entry.listeners.delete(listener)
	}
}

export async function loadResource<T>(
	key: string,
	loader: () => Promise<T>,
	options?: { force?: boolean }
): Promise<T> {
	const entry = getResourceEntry<T>(key)

	if (entry.promise && !options?.force) {
		return entry.promise
	}

	entry.requestId += 1
	const requestId = entry.requestId
	const promise = loader()
	entry.promise = promise
	notifyResourceEntry(entry)

	try {
		const data = await promise
		if (entry.requestId === requestId) {
			entry.data = data
			entry.error = null
			entry.updatedAt = Date.now()
		}
		return data
	} catch (error) {
		if (entry.requestId === requestId) {
			entry.error = formatResourceError(error)
		}
		throw error
	} finally {
		if (entry.requestId === requestId) {
			entry.promise = null
			notifyResourceEntry(entry)
		}
	}
}

export function setResourceData<T>(key: string, data: T): void {
	const entry = getResourceEntry<T>(key)
	entry.data = data
	entry.error = null
	entry.updatedAt = Date.now()
	notifyResourceEntry(entry)
}

export function clearResource(key: string): void {
	const entry = getResourceEntry(key)
	entry.data = null
	entry.error = null
	entry.updatedAt = null
	entry.promise = null
	entry.requestId += 1
	notifyResourceEntry(entry)
}

export function buildProjectCacheKey(prefix: string, path: string): string {
	return `${prefix}:${normalizeCachePath(path).toLowerCase()}`
}

export function buildProjectSetCacheKey(
	prefix: string,
	projects: Array<{ id: string; name: string; path: string }>
): string {
	const normalized = projects
		.map(project => ({
			id: project.id.trim(),
			name: project.name.trim(),
			path: normalizeCachePath(project.path)
		}))
		.sort((left, right) => {
			const pathCompare = left.path.localeCompare(right.path)
			if (pathCompare !== 0) return pathCompare
			const nameCompare = left.name.localeCompare(right.name)
			if (nameCompare !== 0) return nameCompare
			return left.id.localeCompare(right.id)
		})

	return `${prefix}:${JSON.stringify(normalized)}`
}
