export interface User {
	id: string
	email: string
	handle?: string
	created_at?: string
}

async function updateEmail(new_email: string, password: string): Promise<void> {
	const headers: Record<string, string> = { ...authHeaders(), 'Content-Type': 'application/json' }
	const res = await fetch(`${API_BASE}/auth/email`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ new_email, password })
	})
	if (!res.ok) throw new Error('Failed to update email')
}

async function updatePassword(current_password: string, new_password: string): Promise<void> {
	const headers: Record<string, string> = { ...authHeaders(), 'Content-Type': 'application/json' }
	const res = await fetch(`${API_BASE}/auth/password`, {
		method: 'PUT',
		headers,
		body: JSON.stringify({ current_password, new_password })
	})
	if (!res.ok) throw new Error('Failed to update password')
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

function getToken(): string | null {
	return localStorage.getItem('auth-token')
}
function setToken(token: string) {
	localStorage.setItem('auth-token', token)
}
function clearToken() {
	localStorage.removeItem('auth-token')
}

function authHeaders(): Record<string, string> {
	const token = getToken()
	return token ? { Authorization: `Bearer ${token}` } : {}
}

async function getCurrentUser(): Promise<User | null> {
	const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() as HeadersInit })
	if (!res.ok) return null
	const data = await res.json()
	return data.user as User
}

async function getProjects(): Promise<any[]> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() }
	const res = await fetch(`${API_BASE}/me/projects`, { headers })
	if (!res.ok) throw new Error('Failed to fetch projects')
	const data = await res.json()
	return data.projects || []
}

async function getProject(id: string): Promise<any> {
	const res = await fetch(`${API_BASE}/me/projects/${id}`, {
		headers: authHeaders() as HeadersInit
	})
	if (!res.ok) throw new Error('Project not found')
	return res.json()
}

async function getProfile(): Promise<any> {
	const headers: Record<string, string> = { ...authHeaders(), 'Content-Type': 'application/json' }
	const res = await fetch(`${API_BASE}/me/profile`, { headers })
	if (!res.ok) throw new Error('Failed to fetch profile')
	return res.json()
}

async function updateProfile(body: any): Promise<any> {
	const headers: Record<string, string> = { ...authHeaders(), 'Content-Type': 'application/json' }
	const res = await fetch(`${API_BASE}/me/profile`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(body)
	})
	if (!res.ok) throw new Error('Failed to update profile')
	return res.json()
}

async function updateProject(id: string, body: any): Promise<any> {
	const headers: Record<string, string> = { ...authHeaders(), 'Content-Type': 'application/json' }
	const res = await fetch(`${API_BASE}/me/projects/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(body)
	})
	if (!res.ok) throw new Error('Failed to update project')
	return res.json()
}

async function deleteProject(id: string): Promise<void> {
	const res = await fetch(`${API_BASE}/me/projects/${id}`, {
		method: 'DELETE',
		headers: authHeaders() as HeadersInit
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
	const headers: Record<string, string> = { ...authHeaders(), 'Content-Type': 'application/json' }
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
	const headers: Record<string, string> = { ...authHeaders(), 'Content-Type': 'application/json' }
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
	createProject,
	updateProject,
	deleteProject,
	rescanProject,
	getProfile,
	updateProfile,
	updateEmail,
	updatePassword
}
