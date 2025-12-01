import { invoke } from '@tauri-apps/api/tauri'
import type { Project } from '@/types'

async function loadProjects(): Promise<Project[]> {
	try {
		const list = (await invoke('load_projects')) as any[]
		return (list || []) as Project[]
	} catch {
		return []
	}
}

async function getProjects(): Promise<Project[]> {
	return loadProjects()
}

async function getProject(id: string): Promise<Project | null> {
	try {
		const p = (await invoke('get_project', { id })) as any
		return (p || null) as Project | null
	} catch {
		return null
	}
}

async function getProjectDetails(id: string): Promise<Project | null> {
	return getProject(id)
}

async function createProject(
	projectData: Partial<Project> & { path?: string }
): Promise<{ project: Project }> {
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

async function updateProject(id: string, body: Partial<Project>): Promise<{ project: Project }> {
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
