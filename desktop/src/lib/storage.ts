import { invoke } from '@tauri-apps/api/tauri'
import type { ApiProject } from '@/types'

async function loadProjects(): Promise<ApiProject[]> {
	try {
		const list = (await invoke('load_projects')) as any[]
		return (list || []) as ApiProject[]
	} catch {
		return []
	}
}

async function getProjects(): Promise<ApiProject[]> {
	return loadProjects()
}

async function getProject(id: string): Promise<ApiProject | null> {
	try {
		const p = (await invoke('get_project', { id })) as any
		return (p || null) as ApiProject | null
	} catch {
		return null
	}
}

async function getProjectDetails(id: string): Promise<ApiProject | null> {
	return getProject(id)
}

async function createProject(
	projectData: Partial<ApiProject> & { path?: string }
): Promise<{ project: ApiProject }> {
	const now = new Date().toISOString()
	const project: any = {
		id: (crypto as any)?.randomUUID
			? (crypto as any).randomUUID()
			: `${Date.now()}-${Math.random()}`,
		user_id: 'local',
		name: projectData.name || 'Project',
		description: projectData.description || '',
		visibility: (projectData.visibility as any) || 'private',
		created_at: now,
		updated_at: now
	}
	await invoke('upsert_project', { project })
	return { project }
}

async function updateProject(
	id: string,
	body: Partial<ApiProject>
): Promise<{ project: ApiProject }> {
	const current =
		(await getProject(id)) ||
		({
			id,
			user_id: 'local',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			visibility: 'private'
		} as any)
	const project = { ...current, ...body, id, updated_at: new Date().toISOString() } as any
	await invoke('upsert_project', { project })
	return { project }
}

async function deleteProject(id: string): Promise<void> {
	await invoke('delete_project', { id })
}

export default {
	loadProjects,
	getProjects,
	getProject,
	getProjectDetails,
	createProject,
	updateProject,
	deleteProject
}
