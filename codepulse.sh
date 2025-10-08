#!/bin/bash

# CodePulse - Interface Unifiée de Gestion
# Usage: ./codepulse.sh [command] [options]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_help() {
	echo -e "${BLUE}CodePulse - Interface de Gestion${NC}"
	echo "================================="
	echo ""
	echo "Usage: $0 [command] [options]"
	echo ""
	echo -e "${YELLOW}Applications:${NC}"
	echo "  desktop			  Lancer l'application desktop"
	echo "  web				  Lancer l'application web"
	echo "  dev				  Lancer desktop + web simultanément"
	echo ""
	echo -e "${YELLOW}Développement:${NC}"
	echo "  setup				Configuration initiale du projet"
	echo "  icons				Générer les icônes de développement"
	echo "  build				Build toutes les applications"
	echo "  build-desktop		Build l'application desktop seulement"
	echo "  test				 Lancer tous les tests"
	echo ""
	echo -e "${YELLOW}Releases:${NC}"
	echo "  release <version>	Créer un tag de release (ex: v1.0.0)"
	echo ""
	echo -e "${YELLOW}Utilitaires:${NC}"
	echo "  clean				Nettoyer les fichiers temporaires"
	echo "  help				 Afficher cette aide"
	echo ""
	echo "Exemples:"
	echo "  $0 desktop		   # Lancer l'app desktop"
	echo "  $0 web			   # Lancer l'app web"
	echo "  $0 release v1.2.3	# Créer release v1.2.3"
}

check_dependencies() {
	echo -e "${BLUE}Vérification des dépendances...${NC}"
		
	# Node.js
	if ! command -v node &> /dev/null; then
		echo -e "${RED}❌ Node.js requis. Installez-le depuis https://nodejs.org/${NC}"
		exit 1
	fi
		
	# pnpm
	if ! command -v pnpm &> /dev/null; then
		echo -e "${YELLOW}⚠️  pnpm non trouvé. Installation...${NC}"
		npm install -g pnpm
	fi
		
	echo -e "${GREEN}✅ Dépendances OK${NC}"
}

setup_project() {
	echo -e "${BLUE}Configuration initiale de CodePulse...${NC}"
		
	check_dependencies
		
	# Install dependencies
	echo -e "${BLUE}📦 Installation des dépendances...${NC}"
	pnpm install
		
	# Generate icons
	echo -e "${BLUE}🎨 Génération des icônes...${NC}"
	bash scripts/create-dev-icons.sh
		
	# Setup web env if needed
	if [ ! -f "apps/web/.env.local" ]; then
		echo -e "${BLUE}⚙️  Configuration de l'environnement web...${NC}"
		cp apps/web/.env.example apps/web/.env.local
		echo -e "${YELLOW}⚠️  Éditez apps/web/.env.local avec vos credentials${NC}"
	fi
		
	echo -e "${GREEN}✅ Configuration terminée !${NC}"
	echo ""
	echo "Commandes disponibles :"
	echo "  $0 desktop	# Lancer l'app desktop"
	echo "  $0 web		# Lancer l'app web"
}

launch_desktop() {
	echo -e "${BLUE}🚀 Lancement de l'application desktop...${NC}"
	bash scripts/launch-desktop.sh
}

launch_web() {
	echo -e "${BLUE}🌐 Lancement de l'application web...${NC}"
	bash scripts/launch-web.sh
}

launch_both() {
	echo -e "${BLUE}🚀 Lancement desktop + web...${NC}"
	echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter les deux applications${NC}"
		
	# Launch web in background
	bash scripts/launch-web.sh &
	WEB_PID=$!
		
	# Launch desktop in foreground
	bash scripts/launch-desktop.sh &
	DESKTOP_PID=$!
		
	# Wait for both processes
	wait $WEB_PID $DESKTOP_PID
}

build_all() {
	echo -e "${BLUE}📦 Build de toutes les applications...${NC}"
	pnpm -w build
	echo -e "${GREEN}✅ Build terminé !${NC}"
}

build_desktop() {
	echo -e "${BLUE}🔨 Build de l'application desktop...${NC}"
	bash scripts/build-tauri.sh
}

run_tests() {
	echo -e "${BLUE}🧪 Lancement des tests...${NC}"
		
	# TypeScript tests
	echo -e "${BLUE}▶️  Tests TypeScript...${NC}"
	pnpm -w lint
		
	# Rust tests
	echo -e "${BLUE}▶️  Tests Rust...${NC}"
	cd apps/desktop/src-tauri
	cargo test
	cd ../../..
		
	echo -e "${GREEN}✅ Tous les tests passent !${NC}"
}

create_release() {
	if [ -z "$1" ]; then
		echo -e "${RED}❌ Version requise. Usage: $0 release v1.0.0${NC}"
		exit 1
	fi
		
	echo -e "${BLUE}🏷️  Création de la release $1...${NC}"
	node scripts/release-tag.js $1
}

clean_project() {
	echo -e "${BLUE}🧹 Nettoyage des fichiers temporaires...${NC}"
		
	# Clean node_modules in subdirs
	find . -name "node_modules" -type d -prune -exec rm -rf {} +
		
	# Clean build artifacts
	rm -rf apps/desktop/dist
	rm -rf apps/web/.next
	rm -rf apps/desktop/src-tauri/target
		
	# Clean packages
	rm -rf packages/*/dist
		
	echo -e "${GREEN}✅ Nettoyage terminé !${NC}"
}

generate_icons() {
	echo -e "${BLUE}🎨 Génération des icônes de développement...${NC}"
	bash scripts/create-dev-icons.sh
}

# Main command handling
case "$1" in
	"desktop")
		launch_desktop
		;;
		
	"web")
		launch_web
		;;
		
	"dev")
		launch_both
		;;
		
	"setup")
		setup_project
		;;
		
	"icons")
		generate_icons
		;;
		
	"build")
		build_all
		;;
		
	"build-desktop")
		build_desktop
		;;
		
	"test")
		run_tests
		;;
		
	"release")
		create_release $2
		;;
		
	"clean")
		clean_project
		;;
		
	"help"|"--help"|"-h"|"")
		print_help
		;;
		
	*)
		echo -e "${RED}❌ Commande inconnue: '$1'${NC}"
		echo ""
		print_help
		exit 1
		;;
esac
