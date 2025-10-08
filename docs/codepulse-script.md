# 🎛️ CodePulse - Interface de Commande

`codepulse.sh` est l'interface unifiée pour gérer toutes les opérations du projet CodePulse.

## Utilisation

```bash
./codepulse.sh [commande] [options]
```

## Commandes Disponibles

### 🚀 Applications

| Commande | Description |
|----------|-------------|
| `desktop` | Lance l'application desktop Tauri |
| `web` | Lance l'application web Next.js |
| `dev` | Lance desktop et web simultanément |

### 🛠️ Développement

| Commande | Description |
|----------|-------------|
| `setup` | Configuration initiale complète du projet |
| `icons` | Génère les icônes de développement |
| `build` | Build toutes les applications |
| `build-desktop` | Build l'application desktop seulement |
| `test` | Lance tous les tests (Rust + TypeScript) |

### 📦 Releases

| Commande | Description |
|----------|-------------|
| `release <version>` | Crée un tag de release Git (ex: v1.0.0) |

### 🧹 Utilitaires

| Commande | Description |
|----------|-------------|
| `clean` | Nettoie les fichiers temporaires et builds |
| `help` | Affiche l'aide détaillée |

## Exemples

```bash
# Configuration initiale
./codepulse.sh setup

# Lancer l'application desktop
./codepulse.sh desktop

# Lancer l'application web
./codepulse.sh web

# Lancer les deux applications
./codepulse.sh dev

# Créer une release
./codepulse.sh release v1.2.3

# Nettoyer le projet
./codepulse.sh clean
```

---

**Note** : Ce script remplace toutes les commandes techniques complexes. Plus besoin de mémoriser `pnpm tauri dev` ou d'autres commandes spécialisées !
