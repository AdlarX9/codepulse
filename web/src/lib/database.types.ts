export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string
					email: string | null
					created_at: string
				}
				Insert: {
					id?: string
					email?: string | null
					created_at?: string
				}
				Update: {
					id?: string
					email?: string | null
					created_at?: string
				}
			}
			profiles: {
				Row: {
					user_id: string
					handle: string
					display_name: string | null
					avatar_url: string | null
					bio: string | null
					links: Record<string, any>
					visibility: 'private' | 'public'
				}
				Insert: {
					user_id: string
					handle: string
					display_name?: string | null
					avatar_url?: string | null
					bio?: string | null
					links?: Record<string, any>
					visibility?: 'private' | 'public'
				}
				Update: {
					user_id?: string
					handle?: string
					display_name?: string | null
					avatar_url?: string | null
					bio?: string | null
					links?: Record<string, any>
					visibility?: 'private' | 'public'
				}
			}
			projects: {
				Row: {
					id: string
					user_id: string
					project_key_hash: string
					name: string | null
					visibility: 'private' | 'public'
					created_at: string
				}
				Insert: {
					id?: string
					user_id: string
					project_key_hash: string
					name?: string | null
					visibility?: 'private' | 'public'
					created_at?: string
				}
				Update: {
					id?: string
					user_id?: string
					project_key_hash?: string
					name?: string | null
					visibility?: 'private' | 'public'
					created_at?: string
				}
			}
			scans: {
				Row: {
					id: string
					user_id: string
					project_id: string
					created_at: string
					total: number
					code: number
					comment: number
					blank: number
					comment_ratio: number
					core_code_lines: number
					info_lines: number
					device_id: string | null
					version_tag: string | null
				}
				Insert: {
					id?: string
					user_id: string
					project_id: string
					created_at?: string
					total: number
					code: number
					comment: number
					blank: number
					comment_ratio: number
					core_code_lines?: number
					info_lines?: number
					device_id?: string | null
					version_tag?: string | null
				}
				Update: {
					id?: string
					user_id?: string
					project_id?: string
					created_at?: string
					total?: number
					code?: number
					comment?: number
					blank?: number
					comment_ratio?: number
					core_code_lines?: number
					info_lines?: number
					device_id?: string | null
					version_tag?: string | null
				}
			}
			scan_langs: {
				Row: {
					scan_id: string
					language: string
					files: number
					total: number
					code: number
					comment: number
					blank: number
				}
				Insert: {
					scan_id: string
					language: string
					files: number
					total: number
					code: number
					comment: number
					blank: number
				}
				Update: {
					scan_id?: string
					language?: string
					files?: number
					total?: number
					code?: number
					comment?: number
					blank?: number
				}
			}
			github_links: {
				Row: {
					id: string
					user_id: string
					project_id: string
					repo_full_name: string
					installation_id: number | null
					repo_data: Record<string, any> | null
					latest_release: Record<string, any> | null
					last_commit: Record<string, any> | null
					stars_count: number | null
					created_at: string
					updated_at: string
				}
				Insert: {
					id?: string
					user_id: string
					project_id: string
					repo_full_name: string
					installation_id?: number | null
					repo_data?: Record<string, any> | null
					latest_release?: Record<string, any> | null
					last_commit?: Record<string, any> | null
					stars_count?: number | null
					created_at?: string
					updated_at?: string
				}
				Update: {
					id?: string
					user_id?: string
					project_id?: string
					repo_full_name?: string
					installation_id?: number | null
					repo_data?: Record<string, any> | null
					latest_release?: Record<string, any> | null
					last_commit?: Record<string, any> | null
					stars_count?: number | null
					created_at?: string
					updated_at?: string
				}
			}
			downloads: {
				Row: {
					id: string
					created_at: string
					platform: string
					version: string
					country: string | null
					region: string | null
					city: string | null
					referrer: string | null
					user_agent: string | null
					ip_hash: string | null
				}
				Insert: {
					id?: string
					created_at?: string
					platform: string
					version: string
					country?: string | null
					region?: string | null
					city?: string | null
					referrer?: string | null
					user_agent?: string | null
					ip_hash?: string | null
				}
				Update: {
					id?: string
					created_at?: string
					platform?: string
					version?: string
					country?: string | null
					region?: string | null
					city?: string | null
					referrer?: string | null
					user_agent?: string | null
					ip_hash?: string | null
				}
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			[_ in never]: never
		}
		Enums: {
			[_ in never]: never
		}
	}
}
