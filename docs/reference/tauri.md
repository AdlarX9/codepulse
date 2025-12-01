# CodePulse Desktop – Tauri Backend (Deep Reference)

Ce document présente une analyse approfondie de `desktop/src-tauri`: architecture, modules, commandes Tauri exposées, flux principaux (scan, Git, qualité, analytics GitHub), persistance, sécurité, performances, limites et pistes d’amélioration.

---

## Sommaire

1. Vue d’ensemble et architecture
2. Cartographie des modules et responsabilités
3. Commandes Tauri exposées (API de pont UI ↔ Rust)
4. Flux clés et algorithmes
    - Scanner local (répertoire courant)
    - Scanner historique Git (commits)
    - Qualité et deltas de qualité par branche
    - Métriques GitHub (PRs / throughput / lead & cycle time)
    - Mise à jour (update checker)
5. Persistance et fichiers locaux
6. Configuration Tauri (tauri.conf.json) et dépendances (Cargo)
7. Sécurité, permissions et surface d’attaque
8. Performances, robustesse et fiabilité
9. Limites connues et points d’attention
10. Pistes d’amélioration (priorisées)

---

## 1) Vue d’ensemble et architecture

L’app Desktop repose sur Tauri (Rust) pour :

- Fournir des commandes natives (scan, Git, qualité, stockage local, etc.)
- Servir une UI front (Vite/React) côté `desktop/` (devPath: `http://localhost:1420` en dev)
- Packager une app desktop multi-OS, avec un set de permissions (allowlist)

Schéma ASCII haut niveau:

```
+-----------------------+          +---------------------------+
| React/Vite Frontend   |  invoke  |  Tauri Commands (Rust)    |
| (desktop/, port 1420) +--------->+  main.rs (invoke_handler) |
|                       |  events  |  emits (window.emit)      |
+-----------+-----------+<---------+---------------------------+
            |                                   |
            |                                   |
            v                                   v
   Local FS / Git                         Modules Rust
   (~/.config/codepulse)                  - scanner/* (scan & history)
                                           - git/* (repo, commits, diff)
                                           - quality/* (metrics & deltas)
                                           - github/* (PR metrics)
                                           - models/* (settings, langs, ...)
                                           - app/* (auth, storage, updater)
```

Points d’entrée:

- `src/main.rs` rassemble les commandes Tauri et démarre les tâches de fond (update checker)
- `tauri.conf.json` définit le build, les fenêtres et l’allowlist de permissions
- `Cargo.toml` liste les dépendances clés: `tauri`, `git2`, `reqwest`, `rayon`, `tokio`, `walkdir`, etc.

---

## 2) Cartographie des modules et responsabilités

- `src/main.rs`
    - Déclare les modules et enregistre toutes les commandes `#[tauri::command]`
    - Gère un `AppState` pour l’annulation (`cancel_flag`) des scans
    - Lance un checker de mise à jour en tâche de fond (voir `app/updater.rs`)

- `src/app/auth.rs`
    - Persistance du token auth dans `~/.config/codepulse/auth.json`
    - API: `load_auth`, `save_auth` + commandes Tauri `get_auth_token`, `set_auth_token`, `clear_auth_token`

- `src/app/storage.rs`
    - Stockage générique JSON clé-valeur sous `~/.config/codepulse/<key>.json`
    - Utilisé pour `local_projects.json` (liste de projets locaux côté UI)

- `src/app/updater.rs`
    - Vérifie les releases GitHub (stable ou beta) via `reqwest`
    - Enregistre l’horodatage du dernier check dans `user_settings`
    - Boucle asynchrone périodique (1h) lancée au démarrage

- `src/models/scan_settings.rs`
    - Définition des paramètres de scan (exclusions dirs/extensions/langages/patterns, follow_symlinks, allowed_languages)
    - Persistance JSON `~/.config/codepulse/scan_settings.json`
    - Valeurs par défaut raisonnables (exclut `.git`, `node_modules`, `dist`, etc.)

- `src/models/user_settings.rs`
    - Identité locale (device_id, local_salt), canal de mise à jour, dernier check
    - Génération auto si vide, persistance `~/.config/codepulse/user_settings.json`

- `src/models/projects.rs`
    - Liaison project_id ↔ chemin local (bindings), persistance `projects.json`
    - `compute_project_key_hash(base_path)` hache `base_path::local_salt` (sha256) — utile pour clé stable locale

- `src/models/languages.rs`
    - Mapping extension → langage et catégorie `core/info`
    - API utilitaires: `detect_language`, `get_supported_languages`, `get_common_excluded_languages`, `aggregate_by_category`

- `src/scanner/mod.rs`
    - `scan_path(...)` traverse un répertoire avec `walkdir`, filtre via `filter.rs`, puis compte lignes via `counter.rs` (en parallèle `rayon`)
    - Émet des événements de progression `scan:progress` toutes les 10 files
    - Produit un `ScanResult` (agrégats globaux + par langage + stats de distribution)

- `src/scanner/filter.rs`
    - Filtrage par pattern simple (wildcards `*`, `?`), extensions, langues autorisées/exclues
    - `count_files(entry, settings)` décide de descendre/traverser un dossier et d’inclure un fichier

- `src/scanner/counter.rs`
    - Compte lignes/blancs/commentaires/code par langage à base de marqueurs (ligne et bloc)
    - Couverture large (JS/TS/Go/Rust/C/C++/Java/Kotlin/Python/Ruby/PHP/HTML/CSS/XML/SQL…)

- `src/scanner/history.rs`
    - Scan historique à partir de commits Git (`git2`) sans checkout disque: parcours d’arbres (TreeWalk) et blobs
    - Détection langue via nom de fichier, décodage lossy (`encoding_rs` fallback Win-1252), comptage parallèle
    - Émet `scan_history:progress`

- `src/git/*`
    - `repo.rs`: détection repo, branche courante, remote URL, HEAD, fetch, statut non commit
    - `commits.rs`: liste commits, depuis un SHA, récup’ commit unique, fichiers d’un commit, stats auteurs
    - `diff.rs`: stats diff, changements par fichier, patch texte, compare deux commits, agrégat par extension

- `src/quality/mod.rs`
    - Métriques qualité d’un répertoire: totals, ratios, distribution, stats (mean/median/stddev)
    - Métriques d’une branche Git (lecture via git2 + diff tree parent), et deltas vs base
    - Heuristiques coverage (lcov, coverage-summary.json, cobertura) et doc coverage grossière

- `src/github/*`
    - `mod.rs`: parse d’un slug `user/repo` à partir d’URLs SSH/HTTPS
    - `metrics.rs`: calcul hebdomadaire (N semaines) de throughput PRs, lead time et cycle time (via REST GitHub)

---

## 3) Commandes Tauri exposées

Les commandes sont enregistrées dans `main.rs` via `tauri::generate_handler![ ... ]`.

- Scan & historique
    - `scan_directory(path: &str, scan_settings: ScanSettings, window: Window, state: State<AppState>) -> ScanResult`
    - `cancel_scan(state) -> ()`
    - `scan_repo_history_cmd(path: &str, scan_settings: ScanSettings, limit: usize, window: Window, state) -> Vec<CommitScan>`
- Qualité
    - `compute_quality_metrics(path: String, settings: ScanSettings) -> QualityMetrics`
    - `compute_quality_metrics_for_branch(path, branch, settings) -> QualityMetrics`
    - `compute_branch_quality_deltas(path, base_branch, branches[], settings) -> Vec<BranchQualityDelta>`
- GitHub analytics
    - `compute_github_metrics_for_path(path, weeks, github_token?) -> GitHubMetrics`
- Stockage de préférences
    - `get_user_settings() -> UserSettings`, `update_user_settings(UserSettings) -> ()`
    - `get_scan_settings() -> ScanSettings`, `update_scan_settings(ScanSettings) -> ()`
- Auth locale
    - `get_auth_token() -> Option<String>`, `set_auth_token(Option<String>) -> ()`, `clear_auth_token() -> ()`
- Liaison projet (local ↔ id)
    - `get_project_binding(project_id) -> Option<String>`
    - `set_project_binding(project_id, base_path) -> ()`
    - `clear_project_binding(project_id) -> ()`
    - `compute_project_key_hash(base_path) -> String`
- “Local projects” (liste côté UI)
    - `load_projects() -> Vec<JsonValue>`
    - `save_projects(projects: Vec<JsonValue>) -> ()`
    - `get_project(id) -> Option<JsonValue>`
    - `upsert_project(project: JsonValue) -> ()`
    - `delete_project(id) -> ()`
- Git helper
    - `git_is_repository(path) -> bool`
    - `git_get_repo_info(path) -> GitRepoInfo`
    - `git_get_branches(path) -> Vec<String>`
    - `git_get_commits(path, branch?, limit) -> Vec<GitCommitInfo>`
    - `git_get_commits_since(path, since_sha, branch?) -> Vec<GitCommitInfo>`
    - `git_get_commit_by_sha(path, sha) -> GitCommitInfo`
    - `git_get_commit_diff_stats(path, commit_sha) -> GitDiffStats`
    - `git_get_commit_file_changes(path, commit_sha) -> Vec<GitFileChange>`
    - `git_fetch_from_remote(path, remote_name) -> ()`
    - `git_has_uncommitted_changes(path) -> bool`
- Updater
    - `check_for_updates() -> UpdateCheck`

Événements émis vers l’UI:

- `scan:progress { files_scanned, current_file }` (toutes les 10 files)
- `scan_history:progress { index, total, sha }`
- (commenté pour l’instant) `update-available` dans `updater.rs`

---

## 4) Flux clés et algorithmes

### 4.1 Scanner local (répertoire)

- Traversée `WalkDir`, filtrage double:
    - `filter_entry` (dossier) par `count_files(entry, settings)` pour contrôler la descente
    - re-filtrage côté fichier pour exclure filenames/patterns/extensions/langues
- Comptage en parallèle (`rayon`) de chaque fichier via `counter::count_lines(content, language)`
- Progression: événement toutes les 10 files
- Agrégation par langage + stats globales (comment_ratio, code_ratio, mean/median/stddev des tailles de fichiers)
- Annulation: `cancel_flag` (AtomicBool) interrogé périodiquement

Points importants:

- Détection des langages basée sur extension/fichiers spéciaux (`languages.rs`)
- Marqueurs de commentaires par langage (ligne et bloc)
- Lecture des fichiers en texte (perte pour binaires → filtrage par ext/langage évite la plupart)

### 4.2 Scan historique Git (par commits)

- Récupération d’une liste de commits (ou fournie) via `git2`
- Pour chaque commit:
    - `TreeWalk` pour collecter chemins éligibles (descente contrôlée par `should_descend_dir` avec patterns/dirs exclus)
    - Extraction séquentielle des blobs (pour éviter Send/Sync sur types `git2`)
    - Comptage en parallèle des blobs (owned bytes), détection langage par nom de fichier, décodage lossy si besoin
    - Agrégation en `ScanResult`, émission d’un évènement de progression

Avantages:

- Pas besoin de checkout complet sur disque
- Rapide pour grandes histoires si `limit` raisonnable

### 4.3 Qualité et deltas de qualité

- `compute_quality_metrics(path, settings)` applique la même logique d’inclusion que le scanner
- Calcule totals/ratios/statistiques + heuristiques coverage (lcov, coverage-summary.json, cobertura) et doc coverage (ratio de fichiers Markdown)
- `compute_quality_metrics_for_branch(path, branch, settings)`: lit l’arbre de la branche et compte côté blobs
- `compute_branch_quality_deltas(path, base, branches[], settings)`: produit `'delta_*'` pour comparer à une base

### 4.4 Métriques GitHub (PRs)

- Buckets hebdomadaires ISO (lundi→dimanche)
- Throughput = PRs mergées/sem.
- Lead time = merge_time − create_time
- Cycle time = merge_time − first_commit_time (commits API par PR)
- Auth optionnelle via `Authorization: Bearer <token>` si fourni

Notes:

- API REST GitHub paginée, naïve (peut heurter les limites de rate/abuse)
- Calculs robustes aux erreurs individuelles (best-effort)

### 4.5 Update checker

- Au démarrage: boucle asynchrone (tick 1h) + commande manuelle `check_for_updates()`
- Lit releases GitHub, compare semver simple, met à jour `last_update_check`, informe côté console (event UI TODO)

---

## 5) Persistance et fichiers locaux

Répertoire: `~/.config/codepulse/`

- `user_settings.json` — device_id, local_salt, update_channel, last_update_check
- `scan_settings.json` — préférences d’exclusion/inclusion pour le scan
- `auth.json` — token d’auth local (optionnel)
- `projects.json` — liaisons project_id → base_path
- `<key>.json` — stockage générique via `storage.rs` (ex: `local_projects.json`)

Clés/id:

- `device_id` & `local_salt` générés si absents
- `compute_project_key_hash(base_path)` = sha256(`base_path::local_salt`) pour identifiant stable local

---

## 6) Configuration Tauri & dépendances

- `tauri.conf.json`
    - `build.beforeDevCommand = "pnpm dev"`, `devPath = http://localhost:1420` (Vite)
    - Fenêtre principale 1400×900, `transparent: true` (macOS private API non activée → warning)
    - Allowlist (extraits): `shell.open/execute` (scopes navigateurs, wkhtmltopdf), `fs.read/write/create`, `dialog.*`, `path.all`, `os.all`

- `Cargo.toml`
    - Principales deps: `tauri 1.6`, `git2`, `reqwest`, `tokio`, `rayon`, `walkdir`, `encoding_rs`, `regex`, `serde`, `serde_json`, `dirs`

---

## 7) Sécurité, permissions et surface d’attaque

- FS allowlist: `scope: ["$APPDATA/**", "$HOME/**"]` est large. Pratique en dev, mais à restreindre en production
- Shell allowlist: liste d’exécutables navigateurs + wkhtmltopdf — pas utilisés par le code lu, mais autorisés
- `path.all`/`os.all`: très permissif. Réduire si possible
- Tokens (auth) stockés en clair en local — OK pour Desktop local-first, mais chiffrage disque possible (OS keystore)

---

## 8) Performances, robustesse et fiabilité

- Parallélisme `rayon` pour le scan: accélère sur grands arbres, mais lecture `read_to_string` simpliste (mémoire/encodage)
- Historique Git: design efficient (blobs in-memory), évite I/O disque, mais CPU-bound comptage peut être coûteux sur gros repos/limites élevées
- Annulation: `AtomicBool` checké fréquemment
- Émissions events: toutes les 10 files — compromis raisonnable
- Update checker: tick 1h + check manuel; répète des appels si l’UI appelle souvent la commande (backoff limité)

---

## 9) Limites connues et points d’attention

- Détection de commentaires simplifiée: faux positifs/negatifs sur langages/specs complexes (e.g., Python triple quotes docstring vs chaînes)
- Encodage fichiers: lecture texte naïve (sauf blobs Git avec fallback Windows-1252), pas d’auto-détection (UTF-8 supposé)
- Filtres patterns: wildcard artisanal (OK) mais pas de glob avancé ni .gitignore
- FS scope Tauri large (sécurité)
- Update checker: messages "Update check failed" visibles si GitHub indisponible/ratelimit — pas d’ETag/If-None-Match
- Fenêtre transparente macOS sans `macOSPrivateApi`: warning console récurrent
- Absence de quotas mémoire/taille fichier: gros fichiers textes peuvent impacter mémoire
- Peu de tests unitaires sur modules non-Git/Counter; robustesse partielle

---

## 10) Pistes d’amélioration (priorisées)

- Sécurité & Permissions
    - Restreindre allowlist FS (scopes dynamiques selon dossiers choisis par l’utilisateur)
    - Supprimer `path.all`/`os.all` si non strictement nécessaires; documenter raisons si conservés
    - Réduire shell scope si fonctionnalités absentes (wkhtmltopdf/navigateurs)

- Robustesse scan/qualité
    - Support `.gitignore` et globs avancés (e.g., `ignore` crate) pour aligner sur attentes dev
    - Auto-détection encodage (e.g., `chardetng`) avec fallback binaire pour éviter panic/mémoire
    - Streaming/limitation taille max fichier (ne pas charger >N Mo en mémoire)
    - Affiner `counter.rs` :
        - Python: distinguer triple quotes dans code vs docstrings
        - HTML/CSS: éviter sur-comptage commentaires imbriqués/inline

- Performance
    - Lire fichiers via mmap ou buffered I/O pour gros volumes
    - Pool rayon réglable (limiter threads en arrière-plan)
    - Batch events de progression sous charge

- Qualité & Git
    - Côté `quality/mod.rs`: factoriser davantage la logique commune avec scanner (déjà en partie, continuer à mutualiser)
    - Ajouter métriques par extension et par répertoire (heatmap simple)
    - Deltas multi-branches: exposer stats diff par langage/extension

- Historique Git
    - Option de sampling (1 commit sur N) pour gros historiques
    - Détection des renames pour stats par fichier plus fiables (`detect_renames(true)`, coût/benef à mesurer)

- UX & API Tauri
    - Exposer événements `update-available` à l’UI (au lieu de println)
    - Regrouper les commandes de persistance sous un namespace logique (clé d’invocation) et valider schémas JsonValue

- Update checker
    - ETag/If-None-Match pour GitHub, backoff exponentiel, cache en local
    - Option pour muter les checks automatiques (via `UserSettings`)

- Tests & CI
    - Tests unitaires pour `filter.rs`, `counter.rs`, `languages.rs` (golden files)
    - Tests d’intégration sur petit repo Git de fixture

- macOS
    - Si transparence souhaitée: activer `tauri.macOSPrivateApi` ou retirer `transparent: true`

---

## Annexes

### A) Fichiers et structures clés

- `src/main.rs`: enregistrement des commandes & setup
- `src/app/{auth,storage,updater}.rs`: auth locale, KV JSON, update checker
- `src/models/{scan_settings,user_settings,projects,languages}.rs`
- `src/scanner/{mod,filter,counter,history}.rs`
- `src/git/{repo,commits,diff,mod}.rs`
- `src/quality/mod.rs`
- `src/github/{mod,metrics}.rs`
- `Cargo.toml`, `tauri.conf.json`

### B) Événements UI (récap)

- `scan:progress` { files_scanned, current_file }
- `scan_history:progress` { index, total, sha }
- (futur) `update-available` { available, version, url, notes }

---

Dernière mise à jour: 2024-11
