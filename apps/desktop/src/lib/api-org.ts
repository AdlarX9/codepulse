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

async function getAuthHeaders(): Promise<Record<string, string>> {
	const token = await api.getToken()
	return token
		? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
		: { 'Content-Type': 'application/json' }
}

// Organizations
export async function getUserOrgs(): Promise<Organization[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/me`, { headers })
	if (!res.ok) throw new Error('Failed to fetch organizations')
	return res.json()
}

export async function getOrg(id: string): Promise<Organization> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${id}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch organization')
	return res.json()
}

export async function createOrg(data: { name: string }): Promise<Organization> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs`, {
		method: 'POST',
		headers,
		body: JSON.stringify(data)
	})
	if (!res.ok) throw new Error('Failed to create organization')
	return res.json()
}

export async function updateOrg(id: string, data: { name: string }): Promise<Organization> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${id}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(data)
	})
	if (!res.ok) throw new Error('Failed to update organization')
	return res.json()
}

// Members
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/members`, { headers })
	if (!res.ok) throw new Error('Failed to fetch members')
	const data = await res.json()
	return data.members || []
}

export async function inviteMember(orgId: string, email: string, role: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/invite`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ email, role })
	})
	if (!res.ok) throw new Error('Failed to invite member')
}

export async function updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/members/${userId}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify({ role })
	})
	if (!res.ok) throw new Error('Failed to update member role')
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/members/${userId}`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to remove member')
}

// Policies
export async function getPolicies(orgId: string): Promise<Policy[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/policies`, { headers })
	if (!res.ok) throw new Error('Failed to fetch policies')
	const data = await res.json()
	return data.policies || []
}

export async function createPolicy(orgId: string, policy: Partial<Policy>): Promise<Policy> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/policies`, {
		method: 'POST',
		headers,
		body: JSON.stringify(policy)
	})
	if (!res.ok) throw new Error('Failed to create policy')
	return res.json()
}

export async function updatePolicy(
	orgId: string,
	policyId: string,
	policy: Partial<Policy>
): Promise<Policy> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/policies/${policyId}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(policy)
	})
	if (!res.ok) throw new Error('Failed to update policy')
	return res.json()
}

export async function deletePolicy(orgId: string, policyId: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/policies/${policyId}`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to delete policy')
}

// Stats
export async function getOrgStats(orgId: string, window: string = '30d'): Promise<Stats> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/orgs/${orgId}/stats?window=${window}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch stats')
	return res.json()
}

export async function getProjectStats(projectId: string, window: string = '30d'): Promise<Stats> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/stats/projects/${projectId}?window=${window}`, { headers })
	if (!res.ok) throw new Error('Failed to fetch project stats')
	return res.json()
}

// Billing
export async function createCheckoutSession(
	_: string,
	data: {
		plan: string
		seats: number
		success_url: string
		cancel_url: string
	}
): Promise<{ checkout_url: string }> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/billing/checkout`, {
		method: 'POST',
		headers,
		body: JSON.stringify(data)
	})
	if (!res.ok) throw new Error('Failed to create checkout session')
	return res.json()
}

export async function createPortalSession(
	_: string,
	returnUrl: string
): Promise<{ portal_url: string }> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/billing/portal`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ return_url: returnUrl })
	})
	if (!res.ok) throw new Error('Failed to create portal session')
	return res.json()
}

export async function getSubscription(_: string): Promise<Subscription> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/billing/subscription`, { headers })
	if (!res.ok) throw new Error('Failed to fetch subscription')
	return res.json()
}

// Integrations
export async function getIntegrations(_: string): Promise<Integration[]> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/integrations`, { headers })
	if (!res.ok) throw new Error('Failed to fetch integrations')
	return res.json()
}

export async function connectSlack(_: string): Promise<{ auth_url: string }> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/integrations/slack/connect`, {
		method: 'POST',
		headers
	})
	if (!res.ok) throw new Error('Failed to connect Slack')
	return res.json()
}

export async function disconnectSlack(_: string): Promise<void> {
	const headers = await getAuthHeaders()
	const res = await fetch(`${API_BASE}/integrations/slack/disconnect`, {
		method: 'DELETE',
		headers
	})
	if (!res.ok) throw new Error('Failed to disconnect Slack')
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
