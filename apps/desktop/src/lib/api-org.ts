import { api } from './api'
import type {
	Organization,
	OrgMember,
	Policy,
	Integration,
	Stats,
	Subscription
} from '../types/organization'

const API_BASE = api.API_BASE

async function getAuthHeaders(orgId?: string): Promise<Record<string, string>> {
	const token = await api.getToken()
	const headers: Record<string, string> = { 'Content-Type': 'application/json' }
	if (token) headers['Authorization'] = `Bearer ${token}`
	if (orgId) headers['X-Codepulse-Org'] = orgId
	return headers
}

/**
 * Helpers to log API errors consistently
 */
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
	console.error('[API-ORG] HTTP error', {
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
	console.error('[API-ORG] Network error', { endpoint, error: err })
}

// Organizations
export async function getUserOrgs(): Promise<Organization[]> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/orgs/me`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, 'GET /orgs/me')
		return res.json()
	} catch (err) {
		logNetworkError(err, 'GET /orgs/me')
		throw err
	}
}

export async function getOrg(id: string): Promise<Organization> {
	const headers = await getAuthHeaders(id)
	const endpoint = `${API_BASE}/orgs/${id}`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, `GET /orgs/${id}`)
		return res.json()
	} catch (err) {
		logNetworkError(err, `GET /orgs/${id}`)
		throw err
	}
}

export async function createOrg(data: { name: string }): Promise<Organization> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/orgs`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(data)
		})
		if (!res.ok) await logAndThrowApiError(res, 'POST /orgs')
		return res.json()
	} catch (err) {
		logNetworkError(err, 'POST /orgs')
		throw err
	}
}

export async function updateOrg(id: string, data: { name: string }): Promise<Organization> {
	const headers = await getAuthHeaders(id)
	const endpoint = `${API_BASE}/orgs/${id}`
	try {
		const res = await fetch(endpoint, {
			method: 'PATCH',
			headers,
			body: JSON.stringify(data)
		})
		if (!res.ok) await logAndThrowApiError(res, `PATCH /orgs/${id}`)
		return res.json()
	} catch (err) {
		logNetworkError(err, `PATCH /orgs/${id}`)
		throw err
	}
}

// Members
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/members`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, `GET /orgs/${orgId}/members`)
		const data = await res.json()
		return data.members || []
	} catch (err) {
		logNetworkError(err, `GET /orgs/${orgId}/members`)
		throw err
	}
}

export async function inviteMember(orgId: string, email: string, role: string): Promise<void> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/invite`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({ email, role })
		})
		if (!res.ok) await logAndThrowApiError(res, `POST /orgs/${orgId}/invite`)
	} catch (err) {
		logNetworkError(err, `POST /orgs/${orgId}/invite`)
		throw err
	}
}

export async function updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/members/${userId}`
	try {
		const res = await fetch(endpoint, {
			method: 'PATCH',
			headers,
			body: JSON.stringify({ role })
		})
		if (!res.ok) await logAndThrowApiError(res, `PATCH /orgs/${orgId}/members/${userId}`)
	} catch (err) {
		logNetworkError(err, `PATCH /orgs/${orgId}/members/${userId}`)
		throw err
	}
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/members/${userId}`
	try {
		const res = await fetch(endpoint, {
			method: 'DELETE',
			headers
		})
		if (!res.ok) await logAndThrowApiError(res, `DELETE /orgs/${orgId}/members/${userId}`)
	} catch (err) {
		logNetworkError(err, `DELETE /orgs/${orgId}/members/${userId}`)
		throw err
	}
}

// Policies
export async function getPolicies(orgId: string): Promise<Policy[]> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/policies`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, `GET /orgs/${orgId}/policies`)
		const data = await res.json()
		return data.policies || []
	} catch (err) {
		logNetworkError(err, `GET /orgs/${orgId}/policies`)
		throw err
	}
}

export async function createPolicy(orgId: string, policy: Partial<Policy>): Promise<Policy> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/policies`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(policy)
		})
		if (!res.ok) await logAndThrowApiError(res, `POST /orgs/${orgId}/policies`)
		return res.json()
	} catch (err) {
		logNetworkError(err, `POST /orgs/${orgId}/policies`)
		throw err
	}
}

export async function updatePolicy(
	orgId: string,
	policyId: string,
	policy: Partial<Policy>
): Promise<Policy> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/policies/${policyId}`
	try {
		const res = await fetch(endpoint, {
			method: 'PATCH',
			headers,
			body: JSON.stringify(policy)
		})
		if (!res.ok) await logAndThrowApiError(res, `PATCH /orgs/${orgId}/policies/${policyId}`)
		return res.json()
	} catch (err) {
		logNetworkError(err, `PATCH /orgs/${orgId}/policies/${policyId}`)
		throw err
	}
}

export async function deletePolicy(orgId: string, policyId: string): Promise<void> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/policies/${policyId}`
	try {
		const res = await fetch(endpoint, {
			method: 'DELETE',
			headers
		})
		if (!res.ok) await logAndThrowApiError(res, `DELETE /orgs/${orgId}/policies/${policyId}`)
	} catch (err) {
		logNetworkError(err, `DELETE /orgs/${orgId}/policies/${policyId}`)
		throw err
	}
}

// Stats
export async function getOrgStats(orgId: string, window: string = '30d'): Promise<Stats> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/orgs/${orgId}/stats?window=${window}`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, `GET /orgs/${orgId}/stats?window=${window}`)
		return res.json()
	} catch (err) {
		logNetworkError(err, `GET /orgs/${orgId}/stats?window=${window}`)
		throw err
	}
}

export async function getProjectStats(projectId: string, window: string = '30d'): Promise<Stats> {
	const headers = await getAuthHeaders()
	const endpoint = `${API_BASE}/stats/projects/${projectId}?window=${window}`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok)
			await logAndThrowApiError(res, `GET /stats/projects/${projectId}?window=${window}`)
		return res.json()
	} catch (err) {
		logNetworkError(err, `GET /stats/projects/${projectId}?window=${window}`)
		throw err
	}
}

// Billing
export async function createCheckoutSession(
	orgId: string,
	data: {
		plan: string
		seats: number
		success_url: string
		cancel_url: string
	}
): Promise<{ checkout_url: string }> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/billing/checkout`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(data)
		})
		if (!res.ok) await logAndThrowApiError(res, 'POST /billing/checkout')
		return res.json()
	} catch (err) {
		logNetworkError(err, 'POST /billing/checkout')
		throw err
	}
}

export async function createPortalSession(
	orgId: string,
	returnUrl: string
): Promise<{ portal_url: string }> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/billing/portal`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({ return_url: returnUrl })
		})
		if (!res.ok) await logAndThrowApiError(res, 'POST /billing/portal')
		return res.json()
	} catch (err) {
		logNetworkError(err, 'POST /billing/portal')
		throw err
	}
}

export async function getSubscription(orgId: string): Promise<Subscription> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/billing/subscription`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, 'GET /billing/subscription')
		return res.json()
	} catch (err) {
		logNetworkError(err, 'GET /billing/subscription')
		throw err
	}
}

// Integrations
export async function getIntegrations(orgId: string): Promise<Integration[]> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/integrations`
	try {
		const res = await fetch(endpoint, { headers })
		if (!res.ok) await logAndThrowApiError(res, 'GET /integrations')
		return res.json()
	} catch (err) {
		logNetworkError(err, 'GET /integrations')
		throw err
	}
}

export async function connectSlack(orgId: string): Promise<{ auth_url: string }> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/integrations/slack/connect`
	try {
		const res = await fetch(endpoint, {
			method: 'POST',
			headers
		})
		if (!res.ok) await logAndThrowApiError(res, 'POST /integrations/slack/connect')
		return res.json()
	} catch (err) {
		logNetworkError(err, 'POST /integrations/slack/connect')
		throw err
	}
}

export async function disconnectSlack(orgId: string): Promise<void> {
	const headers = await getAuthHeaders(orgId)
	const endpoint = `${API_BASE}/integrations/slack/disconnect`
	try {
		const res = await fetch(endpoint, {
			method: 'DELETE',
			headers
		})
		if (!res.ok) await logAndThrowApiError(res, 'DELETE /integrations/slack/disconnect')
	} catch (err) {
		logNetworkError(err, 'DELETE /integrations/slack/disconnect')
		throw err
	}
}

export const orgApi = {
	getUserOrgs,
	getOrg,
	createOrg,
	updateOrg,
	getOrgMembers,
	inviteMember,
	updateMemberRole,
	removeMember,
	getPolicies,
	createPolicy,
	updatePolicy,
	deletePolicy,
	getOrgStats,
	getProjectStats,
	createCheckoutSession,
	createPortalSession,
	getSubscription,
	getIntegrations,
	connectSlack,
	disconnectSlack
}
