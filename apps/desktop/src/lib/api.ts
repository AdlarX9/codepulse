import { invoke } from '@tauri-apps/api/tauri'

export interface User {
	id: string
	email: string
	handle?: string
	created_at?: string
}

async function readErrorPayload(res: Response): Promise<unknown> {
	try {
		const ct = res.headers.get('content-type') || ''
		if (ct.includes('application/json')) {
			return await res.json()
		}
		return await res.text()
	} catch {
		return null
	}
}

async function logAndThrowApiError(res: Response, endpoint: string): Promise<never> {
	const body = await readErrorPayload(res)
	console.error('[API] HTTP error', {
		endpoint,
		status: res.status,
		statusText: res.statusText,
		body
	})
	const msg =
		(typeof body === 'string' && body) ||
		((body as any)?.error as string) ||
		((body as any)?.message as string) ||
		'Request failed'
	throw new Error(`${res.status} ${res.statusText} - ${msg}`)
}

function logNetworkError(err: unknown, endpoint: string): void {
	console.error('[API] Network error', { endpoint, error: err })
}

async function updateProfile(body: any): Promise<any> {
	const headers = await getAuthHeaders()
	headers['Content-Type'] = 'application/json'
	const endpoint = `${API_BASE}/me/profile`
	try {
		const res = await fetch(endpoint, {
			method: 'PATCH',
			headers,
			body: JSON.stringify(body)
		})
		if (!res.ok) await logAndThrowApiError(res, 'PATCH /me/profile')
		const data = await res.json()
		console.log('Profile updated:', data)
		return data
	} catch (error) {
		logNetworkError(error, 'PATCH /me/profile')
		throw error
	}
}

async function logout(): Promise<void> {
	await clearToken()
}

async function deleteAccount(password: string): Promise<void> {
	const headers = await getAuthHeaders()
	headers['Content-Type'] = 'application/json'
	const endpoint = `${API_BASE}/me/account`
	try {
		const res = await fetch(endpoint, {
			method: 'DELETE',
			headers,
			body: JSON.stringify({ password })
		})
		if (!res.ok) await logAndThrowApiError(res, 'DELETE /me/account')
		await clearToken()
	} catch (error) {
		logNetworkError(error, 'DELETE /me/account')
		throw error
	}
}

async function checkHandleAvailability(handle: string): Promise<{
	available: boolean
	reason: string
}> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/me/profile/check-handle?handle=${encodeURIComponent(handle)}`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, 'GET /me/profile/check-handle')
		return res.json()
	} catch (error) {
		logNetworkError(error, 'GET /me/profile/check-handle')
		throw error
	}
}

export interface DeviceStartResponse {
	code: string
	expires_at: string
}
export interface DevicePollResponse {
	completed: boolean
	token?: string
}

export const API_BASE: string =
	(import.meta as any).env?.VITE_API_URL || 'http://localhost:8080/api'
export const WEB_BASE: string = (import.meta as any).env?.VITE_WEB_URL || 'http://localhost:3000'

async function getToken(): Promise<string | null> {
	try {
		const token = await invoke<string | null>('get_auth_token')
		return token
	} catch (error) {
		console.error('Failed to get token:', error)
		return null
	}
}

async function setToken(token: string): Promise<void> {
	try {
		await invoke('set_auth_token', { token })
	} catch (error) {
		console.error('Failed to set token:', error)
		throw error
	}
}

async function clearToken(): Promise<void> {
	try {
		await invoke('clear_auth_token')
	} catch (error) {
		console.error('Failed to clear token:', error)
		throw error
	}
}

async function getAuthHeaders(): Promise<Record<string, string>> {
	const token = await getToken()
	return token ? { Authorization: `Bearer ${token}` } : {}
}

async function getCurrentUser(): Promise<User | null> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/auth/me`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) {
			// Log all API errors, but don't throw here to preserve existing behavior (return null on 401/etc.)
			const body = await readErrorPayload(res)
			console.error('[API] HTTP error', {
				endpoint: 'GET /auth/me',
				status: res.status,
				statusText: res.statusText,
				body
			})
			return null
		}
		const data = await res.json()
		return data.user as User
	} catch (error) {
		logNetworkError(error, 'GET /auth/me')
		return null
	}
}

async function getProjects(): Promise<any[]> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/me/projects`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, 'GET /me/projects')
		const data = await res.json()
		return data.projects || []
	} catch (error) {
		logNetworkError(error, 'GET /me/projects')
		throw error
	}
}

async function getProject(id: string): Promise<any> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/me/projects/${id}`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, `GET /me/projects/${id}`)
		return res.json()
	} catch (error) {
		logNetworkError(error, `GET /me/projects/${id}`)
		throw error
	}
}

async function getProjectDetails(id: string): Promise<any> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/me/projects/${id}/details`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, `GET /me/projects/${id}/details`)
		return res.json()
	} catch (error) {
		logNetworkError(error, `GET /me/projects/${id}/details`)
		throw error
	}
}

async function getProfile(): Promise<any> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/me/profile`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, 'GET /me/profile')
		return res.json()
	} catch (error) {
		logNetworkError(error, 'GET /me/profile')
		throw error
	}
}

async function updateProject(id: string, body: any): Promise<any> {
	const headers = await getAuthHeaders()
	headers['Content-Type'] = 'application/json'
	const endpoint = `${API_BASE}/me/projects/${id}`
	try {
		const res = await fetch(endpoint, {
			method: 'PATCH',
			headers,
			body: JSON.stringify(body)
		})
		if (!res.ok) await logAndThrowApiError(res, `PATCH /me/projects/${id}`)
		return res.json()
	} catch (error) {
		logNetworkError(error, `PATCH /me/projects/${id}`)
		throw error
	}
}

async function deleteProject(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/me/projects/${id}`
	try {
		const res = await fetch(endpoint, {
			method: 'DELETE',
			headers
		})
		if (!res.ok) await logAndThrowApiError(res, `DELETE /me/projects/${id}`)
	} catch (error) {
		logNetworkError(error, `DELETE /me/projects/${id}`)
		throw error
	}
}

async function createProject(projectData: {
	name?: string
	description?: string
	path?: string
	visibility?: string
	settings?: any
}): Promise<any> {
	const headers = await getAuthHeaders()
	headers['Content-Type'] = 'application/json'
	const endpoint = `${API_BASE}/me/projects`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(projectData)
		})
		if (!res.ok) await logAndThrowApiError(res, 'POST /me/projects')
		return res.json()
	} catch (error) {
		logNetworkError(error, 'POST /me/projects')
		throw error
	}
}

async function rescanProject(
	_projectId: string,
	scanData: {
		project_key_hash: string
		totals: {
			total: number
			code: number
			comment: number
			blank: number
			core_code_lines: number
			info_lines: number
		}
		per_language: Array<{
			language: string
			files: number
			total: number
			code: number
			comment: number
			blank: number
		}>
		device_id: string
		app_version?: string
		scanned_at: string
	}
): Promise<any> {
	const headers = await getAuthHeaders()
	headers['Content-Type'] = 'application/json'
	const endpoint = `${API_BASE}/sync/scan`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(scanData)
		})
		if (!res.ok) await logAndThrowApiError(res, 'POST /sync/scan')
		return res.json()
	} catch (error) {
		logNetworkError(error, 'POST /sync/scan')
		throw error
	}
}

export const api = {
	API_BASE,
	WEB_BASE,
	getToken,
	setToken,
	clearToken,
	getCurrentUser,
	getProjects,
	getProject,
	getProjectDetails,
	createProject,
	updateProject,
	deleteProject,
	rescanProject,
	getProfile,
	updateProfile,
	checkHandleAvailability,
	logout,
	deleteAccount
}
