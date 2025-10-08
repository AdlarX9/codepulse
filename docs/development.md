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

#### Application Web (`apps/web/.env.local`)

```env
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (pour les analytics de téléchargement)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...votre-clé-secrète

# Sécurité
DOWNLOAD_IP_SALT=chaine-aleatoire-longue-et-unique

# Admin (pour le dashboard /admin)
NEXT_ADMIN_USER=admin
NEXT_ADMIN_PASS=mot-de-passe-fort

# GitHub (pour les releases automatisées)
GITHUB_REPO=AdlarX9/code-pulse
GITHUB_TOKEN=ghp_votre-token-github
```

#### Application Desktop
Les variables d'environnement pour le desktop sont définies dans `apps/desktop/src-tauri/tauri.conf.json`.

### Supabase Setup

1. **Créer un projet** sur [supabase.com](https://supabase.com)
2. **Exécuter la migration** : Dans SQL Editor, exécuter `supabase-migration.sql`
3. **Configurer les clés** dans `.env.local`

## Développement

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

#### Application Desktop
- **"Icons not found"** : Exécuter `python3 scripts/create-dev-icons.py`
- **Build Rust échoue** : `cd apps/desktop/src-tauri && cargo clean`
- **Port déjà utilisé (1420)** : `lsof -ti:1420 | xargs kill -9`

#### Application Web
- **Variables d'environnement manquantes** : Vérifier `.env.local`
- **Supabase non configuré** : Vérifier les clés dans `.env.local`
- **Port déjà utilisé (3000)** : `lsof -ti:3000 | xargs kill -9`

### Logs et Debug

#### Desktop App Logs
Les logs de l'application desktop apparaissent dans la console du terminal où elle est lancée.

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
```bash
# Réinstaller toutes les dépendances
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Base de Données
```bash
# Reset Supabase (développement uniquement)
# Supprimer et recréer le projet sur supabase.com
```

---

📖 **Voir aussi** : [Architecture](architecture.md) • [API Reference](api-reference.md)
