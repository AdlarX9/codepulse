import { invoke } from '@tauri-apps/api/tauri'

export interface User {
	id: string
	email: string
	handle?: string
	created_at?: string
}

async function updateProfile(body: any): Promise<any> {
	const headers = await getAuthHeaders()
	headers['Content-Type'] = 'application/json'
	const res = await fetch(`${API_BASE}/me/profile`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(body)
	})
	if (!res.ok) throw new Error('Failed to update profile')
	return res.json()
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
	(import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api'
export const WEB_BASE: string =
	(import.meta as any).env?.VITE_WEB_BASE_URL || 'http://localhost:3000'

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
	const res = await fetch(`${API_BASE}/auth/me`, { headers })
	if (!res.ok) return null
	const data = await res.json()
	return data.user as User
}

async function getProjects(): Promise<any[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/me/projects`, { headers })
	if (!res.ok) throw new Error('Failed to fetch projects')
	const data = await res.json()
	return data.projects || []
}

async function getProject(id: string): Promise<any> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/me/projects/${id}`, { headers })
	if (!res.ok) throw new Error('Project not found')
	return res.json()
}

async function getProjectDetails(id: string): Promise<any> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/me/projects/${id}/details`, { headers })
	if (!res.ok) throw new Error('Project not found')
	return res.json()
}

async function getProfile(): Promise<any> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/me/profile`, { headers })
	if (!res.ok) throw new Error('Failed to fetch profile')
	return res.json()
}

async function updateProject(id: string, body: any): Promise<any> {
	const headers = await getAuthHeaders()
	headers['Content-Type'] = 'application/json'
	const res = await fetch(`${API_BASE}/me/projects/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(body)
	})
	if (!res.ok) throw new Error('Failed to update project')
	return res.json()
}

async function deleteProject(id: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/me/projects/${id}`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to delete project')
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
	const res = await fetch(`${API_BASE}/me/projects`, {
		method: 'POST',
		headers,
		body: JSON.stringify(projectData)
	})
	if (!res.ok) throw new Error('Failed to create project')
	return res.json()
}

async function rescanProject(
	projectId: string,
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
	const res = await fetch(`${API_BASE}/me/projects/${projectId}/snapshot`, {
		method: 'POST',
		headers,
		body: JSON.stringify(scanData)
	})
	if (!res.ok) throw new Error('Failed to save scan snapshot')
	return res.json()
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
	updateProfile
}
