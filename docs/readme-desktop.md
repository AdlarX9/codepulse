# 🖥️ CodePulse Desktop App

Guide complet de l'application desktop CodePulse.

## Vue d'Ensemble

L'application desktop CodePulse est une application native multiplateforme construite avec [Tauri](https://tauri.app/) qui combine les performances d'un backend Rust avec une interface utilisateur React moderne.

## Fonctionnalités Principales

- 🚀 **Analyse ultra-rapide** : Scanner Rust optimisé (10k fichiers en ~2-3s)
- 📊 **Visualisations riches** : Graphiques interactifs avec Recharts
- 💾 **Export flexible** : CSV, JSON avec métadonnées complètes
- 🎨 **Interface moderne** : Design responsive avec thème sombre/clair
- 🔒 **Privacy-first** : Analyse 100% locale, aucune donnée envoyée

## Architecture Technique

### Backend (Rust/Tauri)
- **Moteur de scan** : Analyse syntaxique et comptage de lignes
- **Parallélisation** : Traitement multi-threads avec Rayon
- **Performance** : Optimisé pour les gros projets (100k+ fichiers)

### Frontend (React/TypeScript)
- **UI Framework** : React 18 avec hooks modernes
- **Styling** : Tailwind CSS avec thème personnalisable
- **État** : Context API pour gestion globale
- **Routing** : React Router pour navigation

## Installation & Développement

### Prérequis
- **Node.js 20+** ([télécharger](https://nodejs.org/))
- **pnpm 9+** (`npm install -g pnpm`)
- **Rust 1.70+** ([rustup](https://rustup.rs/))

### Installation
```bash
# 1. Cloner le projet
git clone https://github.com/AdlarX9/code-pulse.git
cd code-pulse

# 2. Installer les dépendances
pnpm install

# 3. Générer les icônes (obligatoire)
python3 scripts/create-dev-icons.py

# 4. Lancer en développement
cd apps/desktop
pnpm tauri dev
```

## Utilisation

### Analyse de Code

1. **Sélectionner un dossier** : Cliquer sur "Sélectionner un dossier"
2. **Choisir la destination** : Navigateur de fichiers système
3. **Lancer l'analyse** : Bouton "Scanner" avec barre de progression
4. **Consulter les résultats** :
   - Vue d'ensemble avec métriques principales
   - Répartition par langage avec graphiques
   - Détail des fichiers avec statistiques individuelles

### Visualisations Disponibles

#### Métriques Globales
- **Lignes totales** : Nombre total de lignes dans le projet
- **Lignes de code** : Code source uniquement
- **Lignes de commentaires** : Commentaires et documentation
- **Lignes vides** : Espaces et lignes vides
- **Ratio commentaires** : Pourcentage de commentaires

#### Répartition par Langage
- **Graphique circulaire** : Distribution des langages
- **Tableau détaillé** : Statistiques par langage
- **Évolution temporelle** : Historique des scans

### Export des Données

#### Formats Supportés
- **CSV** : Format tableur standard
- **JSON** : Structure complète avec métadonnées

#### Données Incluses
- Métriques globales du projet
- Statistiques par langage
- Informations temporelles
- Métadonnées de l'analyse

## Configuration

### Variables d'Environnement

La configuration se fait principalement via `tauri.conf.json` :

```json
{
  "build": {
    "beforeBuildCommand": "pnpm build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist",
    "withGlobalTauri": false
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.codepulse.dev",
    "category": "DeveloperTool",
    "copyright": "",
    "deb": {
      "depends": []
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "",
      "exceptionDomain": "",
      "signingIdentity": null,
      "entitlements": null
    }
  }
}
```

### Thèmes et Personnalisation

#### Couleurs
Les couleurs sont définies dans `src/styles/globals.css` avec des variables CSS personnalisées :

```css
:root {
  --primary: #3b82f6;
  --background: #ffffff;
  --foreground: #1f2937;
  /* autres couleurs */
}

[data-theme="dark"] {
  --background: #1f2937;
  --foreground: #f9fafb;
  /* couleurs dark mode */
}
```

## Développement Avancé

### Structure du Code

```
src/
├── components/          # Composants UI réutilisables
│   ├── FileSelector.tsx # Sélection de dossier
│   ├── ResultsView.tsx  # Affichage résultats
│   ├── ChartComponents/ # Graphiques Recharts
│   └── ui/             # Composants de base
├── lib/                # Utilitaires et services
│   ├── scanner.ts      # Interface avec Tauri
│   ├── export.ts       # Fonctions d'export
│   └── theme.ts        # Gestion des thèmes
├── hooks/              # Hooks personnalisés
├── types/              # Types TypeScript
└── App.tsx             # Composant principal
```

### Backend Rust

#### Architecture du Scanner
```
src-tauri/src/scanner/
├── mod.rs              # Module principal + logique de scan
├── language.rs         # Détection de langage
├── counter.rs          # Comptage des lignes
└── filter.rs           # Filtres d'exclusion
```

#### Fonctionnement du Scan

1. **Découverte récursive** : `walkdir` parcourt l'arborescence
2. **Filtrage intelligent** : Exclusion des fichiers générés/caches
3. **Détection de langage** : Extension + analyse de contenu
4. **Comptage parallèle** : Traitement multi-threads
5. **Agrégation** : Consolidation des statistiques

#### Commandes Tauri Disponibles

```rust
// Interface FFI pour le frontend
#[tauri::command]
pub async fn scan_directory(path: String) -> Result<ScanResult, String>

// Autres commandes...
#[tauri::command]
pub async fn export_results(format: ExportFormat) -> Result<String, String>
```

### Debugging

#### Logs de Développement
```bash
# Lancer avec logs détaillés
pnpm tauri dev --verbose

# Voir les logs Rust
# Les logs apparaissent dans la console du terminal
```

#### Outils de Debug
- **React DevTools** : Inspection des composants
- **Tauri DevTools** : Debugging du backend Rust
- **Console navigateur** : Logs frontend

## Build & Distribution

### Build de Développement
```bash
cd apps/desktop
pnpm tauri build --debug
```

### Build de Production
```bash
cd apps/desktop
pnpm tauri build --release

# Artefacts générés :
# - macOS : .dmg dans src-tauri/target/release/bundle/dmg/
# - Windows : .msi dans src-tauri/target/release/bundle/msi/
# - Linux : .AppImage et .deb dans src-tauri/target/release/bundle/
```

### Code Signing (Production)

#### macOS
```bash
# Variables d'environnement
export APPLE_CERTIFICATE=<base64-certificat>
export APPLE_CERTIFICATE_PASSWORD=<mot-de-passe>
export APPLE_ID=<apple-id>
export APPLE_PASSWORD=<mot-de-passe-app-spécifique>
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

## Performance

### Optimisations Appliquées

#### Backend Rust
- **Parallélisation** : Scan multi-threads
- **Streaming** : Pas de chargement complet en mémoire
- **Algorithmes optimisés** : Comptage efficace des lignes
- **Filtrage prédictif** : Exclusion rapide des fichiers inutiles

#### Frontend React
- **Virtualisation** : Pour les grandes listes de fichiers
- **Memoization** : Optimisation des re-renders
- **Lazy Loading** : Composants chargés à la demande
- **Bundle Splitting** : Réduction du JavaScript initial

### Benchmarks

| Projet | Fichiers | Temps de scan | Mémoire utilisée |
|--------|----------|---------------|------------------|
| Petit  | ~100     | ~0.5s         | ~50MB           |
| Moyen  | ~1k      | ~2-3s         | ~100MB          |
| Grand  | ~10k     | ~5-10s        | ~200MB          |
| XL     | ~100k    | ~30-60s       | ~500MB          |

## Tests

### Tests Unitaires
```bash
# Tests Rust
cd apps/desktop/src-tauri
cargo test

# Tests React (avec Vitest)
cd apps/desktop
pnpm test
```

### Tests d'Intégration
- Tests de bout en bout avec différents types de projets
- Validation des exports CSV/JSON
- Tests de performance avec projets de référence

## Sécurité

### Privacy by Design
- **Analyse locale uniquement** : Aucun code n'est transmis
- **Pas de réseau** : Application 100% offline après installation
- **Données temporaires** : Métriques supprimées après fermeture
- **Pas de télémétrie** : Aucun tracking utilisateur

### Sécurité Technique
- **Sandbox Tauri** : Exécution isolée du code système
- **Accès fichiers limité** : Read-only sur les dossiers sélectionnés
- **Pas de persistance** : Aucune donnée stockée localement

## Dépannage

### Problèmes Courants

#### "Icons not found"
```bash
python3 scripts/create-dev-icons.py
```

#### Build Rust échoue
```bash
cd apps/desktop/src-tauri
cargo clean
cd ../..
pnpm tauri dev
```

#### Port déjà utilisé (1420)
```bash
lsof -ti:1420 | xargs kill -9
```

#### Mémoire insuffisante
- Fermer d'autres applications
- Redémarrer le système
- Utiliser des dossiers plus petits pour les tests

### Logs et Debug

#### Activation des logs détaillés
```bash
# Dans tauri.conf.json
{
  "tauri": {
    "bundle": {
      "windows": {
        "webviewInstallMode": {
          "silent": false,
          "type": "embed"
        }
      }
    }
  }
}
```

#### Variables de debug
```rust
// Dans le code Rust
println!("Debug: {:?}", variable);
```

---

📖 **Voir aussi** : [Guide de développement](../docs/development.md) • [Architecture](../docs/architecture.md)
