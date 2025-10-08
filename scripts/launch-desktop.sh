#!/bin/bash

# Script de lancement simplifié pour l'app desktop

set -e

echo "🚀 Lancement de CodePulse Desktop..."
echo ""

# Vérifier qu'on est à la racine du projet
if [ ! -f "package.json" ]; then
	echo "❌ Erreur: Exécutez ce script depuis la racine du projet"
	exit 1
fi

# Vérifier que les icônes existent
if [ ! -f "apps/desktop/src-tauri/icons/32x32.png" ]; then
	echo "⚠️  Icônes manquantes. Génération..."
	python3 scripts/create-dev-icons.py
	echo ""
fi

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
	echo "📦 Installation des dépendances..."
	pnpm install
	echo ""
fi

# Vérifier que Rust est installé
if ! command -v rustc &> /dev/null; then
	echo "❌ Rust n'est pas installé. Installez-le avec:"
	echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
	exit 1
fi

echo "✅ Prérequis OK"
echo ""
echo "🔨 Lancement de l'application..."
echo "   - Frontend React sur http://localhost:1420"
echo "   - Backend Rust en compilation..."
echo ""
echo "⏳ Première compilation peut prendre 2-5 minutes..."
echo ""

# Lancer Tauri
cd apps/desktop
pnpm tauri dev
