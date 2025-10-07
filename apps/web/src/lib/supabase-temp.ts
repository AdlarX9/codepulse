// Utilitaire temporaire pour contourner les problèmes de types Supabase
export function supabaseUpdate(client: any, table: string, data: any) {
	return client.from(table).update(data)
}

export function supabaseUpsert(client: any, table: string, data: any, options?: any) {
	return client.from(table).upsert(data, options)
}

export function supabaseInsert(client: any, table: string, data: any) {
	return client.from(table).insert(data)
}
