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
	echo ""
	echo -e "${YELLOW}Développement:${NC}"
	echo "  setup				Configuration initiale du projet"
	echo "  icons				Générer les icônes de développement"
	echo "  build				Build Codepulse"
	echo "  test				 Lancer tous les tests"
	echo ""
	echo -e "${YELLOW}Utilitaires:${NC}"
	echo "  clean				Nettoyer les fichiers temporaires"
	echo "  help				 Afficher cette aide"
	echo ""
	echo "Exemples:"
	echo "  $0 desktop		   # Lancer l'app desktop"
	echo "  $0 web			   # Lancer la landing page"
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
	if [ ! -f "web/.env.local" ]; then
		echo -e "${BLUE}⚙️  Configuration de l'environnement web...${NC}"
		cp web/.env.example web/.env.local
		echo -e "${YELLOW}⚠️  Éditez web/.env.local avec vos credentials${NC}"
	fi

	# Setup desktop env if needed
	if [ ! -f "desktop/.env.local" ]; then
		echo -e "${BLUE}⚙️  Configuration de l'environnement desktop...${NC}"
		cp desktop/.env.example desktop/.env.local
		echo -e "${YELLOW}⚠️  Éditez desktop/.env.local avec vos credentials${NC}"
	fi

	echo -e "${GREEN}✅ Configuration terminée !${NC}"
	echo ""
	echo "Commandes disponibles :"
	echo "  $0 desktop	# Lancer l'app desktop"
	echo "  $0 web		# Lancer l'app web"
}

run_tests() {
	echo -e "${BLUE}🧪 Lancement des tests...${NC}"
		
	# TypeScript tests
	echo -e "${BLUE}▶️  Tests TypeScript...${NC}"
	pnpm -w lint
		
	# Rust tests
	echo -e "${BLUE}▶️  Tests Rust...${NC}"
	cd desktop/src-tauri
	cargo test
	cd ../../..
		
	echo -e "${GREEN}✅ Tous les tests passent !${NC}"
}

clean_project() {
	echo -e "${BLUE}🧹 Nettoyage des fichiers temporaires...${NC}"
		
	# Clean node_modules in subdirs
	find . -name "node_modules" -type d -prune -exec rm -rf {} +
		
	# Clean build artifacts
	rm -rf desktop/dist
	rm -rf web/.next
	rm -rf desktop/src-tauri/target
		
	# Clean packages
	rm -rf packages/*/dist
		
	echo -e "${GREEN}✅ Nettoyage terminé !${NC}"
}

launch_desktop() {
	echo -e "${BLUE}🚀 Lancement de l'application desktop...${NC}"
	bash scripts/launch-desktop.sh
}

launch_web() {
	echo -e "${BLUE}🌐 Lancement de l'application web...${NC}"
	npx tailwindcss -i ./web/assets/tailwind.css -o ./web/assets/tailwind.generated.css --minify --content './**/*.{php,html,js}'
	php -S 127.0.0.1:8080 -t web
}

build_desktop() {
	echo -e "${BLUE}🔨 Build de l'application desktop...${NC}"
	bash scripts/build-tauri.sh
}

generate_icons() {
	echo -e "${BLUE}🎨 Génération des icônes de développement...${NC}"
	bash scripts/create-dev-icons.sh
}

format_code() {
	echo -e "${BLUE}🎨 Formatage du code...${NC}"
	npm run format
	cd desktop/src-tauri
	cargo fmt
	cd ../../
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
		build_desktop
		;;
		
	"test")
		run_tests
		;;
		
	"clean")
		clean_project
		;;
	
	"format")
		format_code
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
