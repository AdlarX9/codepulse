# Architecture du Backend Rust (Tauri)

## Vue d'ensemble

Le backend Rust de CodePulse est organisé en modules distincts alignés sur les différents dashboards de l'application. Cette architecture modulaire garantit une séparation claire des responsabilités et facilite la maintenance.

## Structure des Modules

```
src/
├── models/           # Structures de données et persistance
│   ├── mod.rs
│   ├── general_settings.rs
│   ├── scan_settings.rs
│   ├── languages.rs
│   └── projects.rs
│
├── scanner/          # Analyse de code (Overview Dashboard)
│   ├── mod.rs
│   ├── counter.rs    # Comptage de lignes
│   ├── filter.rs     # Filtrage de fichiers
│   └── history.rs    # Historique de scans
│
├── productivity/     # Métriques de productivité (Productivity Dashboard)
│   └── mod.rs
│
├── quality/          # Métriques de qualité (Quality Dashboard)
│   ├── mod.rs
│   ├── quality_metrics.rs    # Métriques de qualité du code
│   └── github_metrics.rs     # Métriques GitHub (PRs, throughput)
│
├── contributors/     # Analyse des contributeurs (Contributors Dashboard)
│   └── mod.rs
│
├── git/              # Opérations Git de bas niveau
│   ├── mod.rs
│   ├── repo.rs       # Informations sur le dépôt
│   ├── commits.rs    # Gestion des commits
│   └── diff.rs       # Calcul des diffs
│
├── utils/            # Utilitaires transversaux
│   ├── mod.rs
│   └── app/
│       ├── mod.rs
│       ├── storage.rs    # Stockage JSON générique
│       └── updater.rs    # Vérification des mises à jour
│
└── main.rs           # Point d'entrée Tauri, expose l'API au frontend
```

## Responsabilités des Modules

### `models/`
Contient toutes les structures de données et leur logique de persistance :
- **general_settings.rs** : Paramètres généraux de l'application (device_id, update_channel)
- **scan_settings.rs** : Configuration des scans (langages exclus, répertoires exclus, etc.)
- **languages.rs** : Détection de langages, catégorisation, liste des langages supportés
- **projects.rs** : Gestion des projets locaux et de leurs bindings

### `scanner/`
Module principal d'analyse de code, correspond au **OverviewDashboard** :
- **counter.rs** : Compte les lignes de code, commentaires, blancs par langage
- **filter.rs** : Applique les filtres de scan (exclusions, inclusions)
- **history.rs** : Scan historique des commits pour analyser l'évolution du code
- Expose : `scan_directory()`, `scan_repo_history()`

### `productivity/`
Module pour le **ProductivityDashboard** :
- Actuellement wrapper léger autour de `scanner::history::scan_repo_history`
- Pourra être étendu avec d'autres métriques de productivité
- Expose : `scan_history()`

### `quality/`
Module pour le **QualityDashboard**, organisé en deux sous-modules :

#### `quality_metrics.rs`
- Calcule les métriques de qualité du code (commentaires %, complexité, etc.)
- Supporte l'analyse par branche
- Compare les branches (deltas de qualité)
- Détecte automatiquement la couverture de tests (lcov, Jest, Cobertura)
- Expose : `compute_quality_metrics()`, `compute_quality_metrics_for_branch()`, `compute_branch_quality_deltas()`

#### `github_metrics.rs`
- Récupère les métriques GitHub via l'API REST
- Calcule throughput, lead time, cycle time par semaine
- Gère les pull requests et leurs commits
- Expose : `compute_metrics_for_repo()` (utilisé via main.rs)

### `contributors/`
Module pour le **ContributorsDashboard** :
- Actuellement placeholder car l'analyse est faite côté TypeScript
- Pourra être développé pour faire l'analyse en backend Rust si nécessaire

### `git/`
Module de bas niveau pour les opérations Git :
- **repo.rs** : Ouverture de dépôt, informations générales, branches, fetch
- **commits.rs** : Liste des commits, récupération par SHA, commits depuis un SHA
- **diff.rs** : Calcul des statistiques de diff, changements de fichiers par commit
- Utilisé par scanner, productivity et quality

### `utils/`
Utilitaires transversaux :
- **app/storage.rs** : Lecture/écriture de fichiers JSON dans le répertoire de config
- **app/updater.rs** : Vérification automatique des mises à jour depuis GitHub Releases

### `main.rs`
Point d'entrée de l'application Tauri :
- Déclare tous les `#[tauri::command]` exposés au frontend TypeScript
- Configure l'invoke_handler avec toutes les fonctions disponibles
- Lance les tâches de fond (update checker)
- **Principe** : N'expose que les fonctions nécessaires au frontend, masque la complexité interne

## Principes d'Architecture

### 1. Séparation des Responsabilités
- **Backend (Rust)** : Analyse des données, calculs, accès au système de fichiers/Git
- **Frontend (TypeScript)** : Affichage, interactions utilisateur, graphiques
- Pas de mélange des rôles : chaque couche a sa responsabilité bien définie

### 2. Modularité
- Chaque dashboard a son module dédié
- Les modules partagés (git, utils, models) sont réutilisables
- Facilite l'ajout de nouvelles fonctionnalités sans impacter le code existant

### 3. API Minimale
- `main.rs` expose uniquement les fonctions nécessaires au frontend
- Les fonctions internes restent privées aux modules
- Garantit une surface d'API propre et maintenable

### 4. Performance
- Utilisation de `rayon` pour le parallélisme (scan de fichiers)
- Opérations Git optimisées via `git2`
- Cache et réutilisation des données quand possible

### 5. Typage Fort
- Toutes les structures sont typées avec `serde::Serialize`
- Garantit la cohérence entre Rust et TypeScript
- Détection des erreurs à la compilation

## Flux de Données

### Scan de Répertoire
```
User Action (TypeScript)
  ↓
invoke("scan_directory", { path, settings })
  ↓
main.rs::scan_directory()
  ↓
scanner::scan_path()
  ↓
  ├→ filter::count_files()  (parallélisé avec rayon)
  ├→ counter::count_lines()
  ├→ languages::detect_language()
  ↓
ScanResult (Rust)
  ↓
JSON serialization
  ↓
TypeScript Frontend (affichage)
```

### Quality Metrics
```
User Action (TypeScript)
  ↓
invoke("compute_quality_metrics", { path, settings })
  ↓
main.rs::compute_quality_metrics()
  ↓
quality::quality_metrics::compute_quality_metrics()
  ↓
  ├→ scanner::count_files()
  ├→ scanner::count_lines()
  ├→ Détection automatique de coverage
  ↓
QualityMetrics (Rust)
  ↓
JSON serialization
  ↓
TypeScript Frontend (affichage)
```

## Migration et Évolution

### Changements Récents
1. **Renommage** : `user_settings` → `general_settings`
2. **Restructuration** : Module `app` déplacé dans `utils/app`
3. **Consolidation** : Module `github` intégré dans `quality/github_metrics`
4. **Nettoyage** : Suppression du code mort (fonctions Git inutilisées, module auth)

### Prochaines Étapes Possibles
- Migrer l'analyse des contributeurs du frontend vers `contributors/`
- Ajouter des métriques de complexité cyclomatique dans `quality/`
- Implémenter un cache pour les scans fréquents
- Ajouter des benchmarks de performance

## Conventions de Code

### Nommage
- Modules : snake_case (`quality_metrics`)
- Fonctions : snake_case (`compute_quality_metrics`)
- Structures : PascalCase (`QualityMetrics`)
- Constantes : SCREAMING_SNAKE_CASE (`LOCAL_PROJECTS_STORAGE_KEY`)

### Organisation des Fichiers
- Un fichier `mod.rs` par module pour exposer l'API publique
- Sous-modules dans des fichiers séparés
- Réexportation des types principaux dans `mod.rs`

### Documentation
- Commentaires `///` pour les fonctions publiques
- Documentation des structures avec exemples si complexe
- README dans chaque module majeur si nécessaire

## Dépendances Principales

- **tauri** : Framework pour applications desktop
- **git2** : Bindings Rust pour libgit2
- **rayon** : Parallélisme data-parallel
- **serde** : Sérialisation/désérialisation
- **walkdir** : Parcours récursif de répertoires
- **reqwest** : Client HTTP pour API GitHub
- **chrono** : Gestion des dates et heures

---

*Document mis à jour le 2024 - CodePulse v1.0.0*
