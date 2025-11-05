import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { email, password } = await request.json()

		// Vérifier les identifiants admin
		const adminId = process.env.NEXT_ADMIN_ID
		const adminPass = process.env.NEXT_ADMIN_PASS

		if (!adminId || !adminPass) {
			console.error("Variables d'environnement admin manquantes")
			return NextResponse.json({ error: 'Configuration serveur incorrecte' }, { status: 500 })
		}

		// Vérifier les identifiants
		if (email === adminId && password === adminPass) {
			return NextResponse.json({ success: true })
		} else {
			return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
		}
	} catch (error) {
		console.error("Erreur lors de l'authentification admin:", error)
		return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
	}
}
