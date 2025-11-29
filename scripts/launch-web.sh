#!/bin/bash

# Script de lancement simplifié pour l'app web

set -e

echo "🌐 Lancement de CodePulse Web..."
echo ""

# Vérifier qu'on est à la racine du projet
if [ ! -f "package.json" ]; then
	echo "❌ Erreur: Exécutez ce script depuis la racine du projet"
	exit 1
fi

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
	echo "📦 Installation des dépendances..."
	pnpm install
	echo ""
fi

# Vérifier que .env.local existe
if [ ! -f "web/.env.local" ]; then
	echo "⚠️  Fichier .env.local manquant"
	echo ""
	echo "Création du fichier .env.local..."
	cp web/.env.example web/.env.local
	echo ""
	echo "⚠️  IMPORTANT: Éditez web/.env.local avec vos credentials Supabase"
	echo ""
	echo "Vous devez configurer:"
	echo "  - SUPABASE_URL"
	echo "  - SUPABASE_SERVICE_ROLE_KEY"
	echo "  - DOWNLOAD_IP_SALT"
	echo "  - NEXT_ADMIN_USER"
	echo "  - NEXT_ADMIN_PASS"
	echo ""
	read -p "Appuyez sur Entrée une fois configuré..."
fi

echo "✅ Prérequis OK"
echo ""
echo "🔨 Lancement de l'application..."
echo "   - Next.js sur http://localhost:3000"
echo ""

# Lancer Next.js
cd web
pnpm dev
