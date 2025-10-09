# 🛠️ Guide de Développement - CodePulse

Guide complet pour développer, configurer et déployer CodePulse.

## Vue d'Ensemble

CodePulse est un **monorepo** organisé avec :

- `apps/` : Applications desktop (Tauri) et web (Next.js)
- `packages/` : Code partagé (types, utilitaires)
- `scripts/` : Scripts d'automatisation

## Configuration Rapide

```bash
# Configuration automatique complète
./codepulse.sh setup
```

Cette commande :

- Vérifie et installe les dépendances (Node.js, pnpm)
- Installe les packages du monorepo
- Génère les icônes de développement
- Configure l'environnement web (.env.local)

## Configuration

### Variables d'Environnement

# Site

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# PostgreSQL Database

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=codepulse
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Sécurité

DOWNLOAD_IP_SALT=chaine-aleatoire-longue-et-unique

# Admin (pour le dashboard /admin)

NEXT_ADMIN_USER=admin
NEXT_ADMIN_PASS=mot-de-passe-fort

# GitHub (pour les releases automatisées)

GITHUB_REPO=AdlarX9/code-pulse

### Structure du Code

```
apps/
├── desktop/                 # Application desktop Tauri
│   ├── src/                 # Frontend React/TypeScript
│   ├── src-tauri/           # Backend Rust + config Tauri
│   └── README.md           # Doc spécifique desktop
└── web/                     # Application web Next.js
    ├── src/app/             # Pages et API routes
    ├── src/components/      # Composants React
    └── README.md           # Doc spécifique web

packages/
├── core/                    # Types et constantes partagés
└── telemetry/              # Utilitaires de logging

scripts/                     # Scripts d'automatisation
```

### Lancement en Développement

#### Application Desktop Seulement

```bash
./codepulse.sh desktop
```

#### Application Web Seulement

```bash
./codepulse.sh web
```

#### Les Deux Applications

```bash
./codepulse.sh dev
```

### Build

#### Build Complet

```bash
# Build tout (desktop + web + packages)
pnpm -w build
```

#### Build Desktop Seulement

```bash
cd apps/desktop
pnpm tauri build
```

#### Build Web Seulement

```bash
cd apps/web
pnpm build
```

## Tests

### Tests Automatisés

```bash
# Tests Rust (backend desktop)
cd apps/desktop/src-tauri
cargo test

# Vérification TypeScript
pnpm -w lint

# Tests de build complet
pnpm build
```

### Tests Manuels

#### Application Desktop

1. Lancer `pnpm tauri dev`
2. Sélectionner un dossier de code
3. Vérifier l'analyse et les statistiques
4. Tester l'export CSV/JSON

#### Application Web

1. Lancer `pnpm dev`
2. Visiter http://localhost:3000
3. Accéder à `/admin` (avec les credentials configurés)
4. Vérifier le dashboard analytics

## Debugging

### Problèmes Courants

- **"Icons not found"** : Exécuter `python3 scripts/create-dev-icons.py`
- **Build Rust échoue** : `cd apps/desktop/src-tauri && cargo clean`
- **Port déjà utilisé (1420)** : `lsof -ti:1420 | xargs kill -9`

#### Application Web

- **Variables d'environnement manquantes** : Vérifier `.env.local` et les variables PostgreSQL
- **PostgreSQL non démarré** : Vérifier que Docker Desktop est lancé et que le conteneur tourne sur le port 5432
- **Port déjà utilisé (3000)** : `lsof -ti:3000 | xargs kill -9`

### Logs et Debug

#### Desktop App Logs

{{ ... }}

#### Web App Logs

```bash
# Voir les logs en temps réel
cd apps/web && pnpm dev
```

## Déploiement

### Environnements

- **Développement** : `localhost` avec données de test
- **Production** : Déploiement avec domaine personnalisé

### Build de Production

#### Application Desktop

```bash
cd apps/desktop
pnpm tauri build --release

# Artefacts générés dans src-tauri/target/release/bundle/
# - macOS : .dmg
# - Windows : .msi
# - Linux : .AppImage et .deb
```

#### Application Web

```bash
cd apps/web
pnpm build
pnpm start  # Pour tester le build

# Déployer sur Vercel/Netlify avec :
# - Variables d'environnement configurées
# - Domaine personnalisé
# - Headers de sécurité
```

## CI/CD

Les pipelines GitHub Actions automatisent :

- Tests sur chaque PR
- Build et release sur tags
- Déploiement web automatique

Voir `.github/workflows/` pour les détails.

## Sécurité

### Code Signing (Production)

Requis pour la distribution des applications desktop.

#### macOS

```bash
export APPLE_CERTIFICATE=<base64-cert>
export APPLE_CERTIFICATE_PASSWORD=<password>
export APPLE_ID=<apple-id>
export APPLE_PASSWORD=<app-password>
export APPLE_TEAM_ID=<team-id>
```

#### Windows

Configurer dans `tauri.conf.json` :

```json
{
	"tauri": {
		"bundle": {
			"windows": {
				"certificateThumbprint": "...",
				"digestAlgorithm": "sha256"
			}
		}
	}
}
```

### Sécurité Web

- **HTTPS obligatoire** : Tous les domaines en production
- **Headers de sécurité** : Configurés dans `next.config.js`
- **CORS** : Restreint aux domaines autorisés
- **CSP** : Content Security Policy active

## Performance

### Optimisations Appliquées

- **Rust Backend** : Scanner ultra-rapide (10k fichiers en ~2-3s)
- **Code Splitting** : Next.js automatique
- **Image Optimization** : WebP et formats modernes
- **Caching** : Redis pour les sessions et métriques

### Monitoring Performance

- **Bundle Analyzer** : `pnpm build --analyze`
- **Core Web Vitals** : Mesurés automatiquement
- **Database Queries** : Logging activé en développement

## Résolution de Problèmes

### Mémoire/Espace Disque

```bash
# Nettoyer le cache Docker (si utilisé)
docker system prune -a

# Nettoyer les builds locaux
pnpm clean

# Vérifier l'espace disque
df -h
```

### Dépendances

````bash
# Réinstaller toutes les dépendances
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

### Base de Données
```bash
# Vérifier les logs Next.js pour les erreurs PostgreSQL
cd apps/web && pnpm dev

# Reset PostgreSQL (développement uniquement)
# Arrêter Docker, supprimer le volume et relancer
docker-compose down -v && docker-compose up -d
````
