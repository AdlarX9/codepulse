# 🎯 Plan de Refonte Complète - CodePulse

**Date**: 20 octobre 2025  
**Objectif**: Transformer CodePulse d'un SaaS entreprise vers un outil personnel de motivation et progression pour développeurs

---

## 📊 Phase 1: Diagnostic de l'existant

### Backend (Go API)

#### ✅ À conserver

- `User`, `Profile`, `Session`, `DeviceLoginSession` - Auth de base
- `Project` - Entité principale (à adapter)
- `Scan`, `ScanLang` - Base de l'analyse (à refondre)
- `GitHubLink` - Lien projet-repo (à étendre)
- `Download` - Stats téléchargements

#### ❌ À supprimer complètement

- `Organization` - Plus d'organisations
- `Membership` - Plus de gestion multi-tenant
- `Subscription` - Plus de billing
- `Repository` - Remplacé par Git natif dans Project
- `QualityBudget` - Trop entreprise
- `Integration` - Slack/Email entreprise
- `AuditLog` - Overkill pour usage personnel
- **Handlers à supprimer**:
    - `billing.go` - Stripe/subscriptions
    - `org.go` - Gestion organisations
    - `policy.go` - Quality budgets
    - `integrations.go` - Slack/webhooks
    - `websocket.go` - Real-time enterprise
    - `ci.go` - CI agent (remplacé par Git hooks)
    - `stats.go` (parties org) - Refondre pour projets
- **Modules à supprimer**:
    - `/internal/worker/digest.go` - Digests email organisations
    - `/internal/email/` - Service email entreprise
    - `/internal/slack/` - Intégration Slack
    - `/internal/websocket/` - WebSocket temps réel
    - `/ci-agent/` - Agent CI complet

#### 🔄 À refondre

- `Project` → Ajouter: `git_repo_url`, `git_provider`, `last_commit_sha`, `collaborators[]`, `streak_data`
- `Scan` → Devenir `CommitScan` lié à un commit Git spécifique
- `export.go` → Déplacer côté frontend
- `scan.go` → Refondre pour analyse Git-based
- `github.go` → Simplifier et intégrer dans projet

### Frontend Desktop (Tauri/React)

#### ✅ À conserver (base)

- Architecture Tauri
- Scan local via Rust
- Auth/login
- Système de settings locaux

#### 🔄 À refondre complètement

- **UI/UX**: Passer à style Notion (minimaliste, fluide)
- **Dashboard**: Remplacer par 4 nouveaux dashboards
- **Projects list**: Simplifier, retirer toute notion d'org
- **Scan flow**: Git-based automatique au lieu de manuel

#### ➕ À créer

- Module Git integration (clone, fetch, analyze commits)
- Local storage pour scans (pas d'API sauf premium)
- Système de streaks visuels
- Système de défis hebdomadaires
- Notifications/alerting local
- Export multi-format (HTML/PDF/XML/MD/LaTeX)

### Frontend Web (Next.js)

#### 🤔 Décision à prendre

- **Option A**: Supprimer complètement (focus desktop-only)
- **Option B**: Transformer en landing page + viewer publique de projets
- **Recommandation**: Option B - Page marketing + profils publics

---

## 🗺️ Phase 2: Nouvelle Architecture

### Modèle de Données (Backend)

```go
// Core Models (conservés/adaptés)
type User struct {
    ID, Email, Password, CreatedAt, UpdatedAt
    Profile *Profile
    Projects []Project
    PremiumUntil *time.Time  // NEW: Premium subscription end date
    Streaks StreakData       // NEW: User-level streak tracking
}

type Profile struct {
    UserID, Handle, DisplayName, AvatarURL, Bio, Links
    Visibility // public/private
    // Removed: org-related fields
}

type Project struct {
    ID, UserID, Name, Description, Visibility
    Settings *JSONMap  // Scan settings

    // NEW: Git integration
    GitRepoURL *string
    GitProvider *string  // github, gitlab, local
    LastCommitSHA *string
    LastSyncedAt *time.Time

    // NEW: Collaboration
    Collaborators []Collaborator  // Simple: owner + contributors

    // NEW: Gamification
    StreakData StreakData

    // Relations
    CommitScans []CommitScan  // Renamed from Scans
    GitHubLink *GitHubLink
}

// NEW: Collaborator (simple, pas d'org)
type Collaborator struct {
    ProjectID string
    UserID *string       // Null si contributeur Git non-user
    GitUsername string   // From Git commits
    Role string          // owner, contributor
    CommitsCount int
    LinesAdded int
    LinesDeleted int
}

// Refonte: Scan → CommitScan
type CommitScan struct {
    ID, ProjectID
    CommitSHA string      // NEW: Git commit hash
    CommitMessage *string // NEW
    CommitAuthor *string  // NEW
    CommitDate time.Time  // NEW
    Branch *string        // NEW

    // Stats (computed from CommitScanLangs)
    MedianLines, GapLines float64

    // NEW: Git metrics
    FilesChanged int
    LinesAdded int
    LinesDeleted int

    CreatedAt time.Time

    // Relations
    Project *Project
    CommitScanLangs []CommitScanLang
}

type CommitScanLang struct {
    CommitScanID, Language
    Files, Total, Comment, Blank
    MedianLines, GapLines float64

    // NEW: Diff metrics per language
    LinesAdded int
    LinesDeleted int
}

// NEW: Streak tracking
type StreakData struct {
    CurrentStreak int        // Days consecutive
    LongestStreak int
    LastActivityDate time.Time
    TotalCommits int
    TotalScans int
    Badges []string         // Achievement badges
}

// NEW: Challenges
type Challenge struct {
    ID, UserID, ProjectID
    Type string             // weekly_commits, reduce_code_debt, throughput
    Target interface{}      // JSON: varies by type
    Progress interface{}    // JSON: current progress
    Status string          // active, completed, failed
    StartsAt, EndsAt time.Time
    CompletedAt *time.Time
}

// Conservé (adapté)
type GitHubLink struct {
    ID, UserID, ProjectID
    RepoFullName, InstallationID
    RepoData, LatestRelease, LastCommit, StarsCount
    // Simplifié: plus de lien org
}
```

### Architecture Frontend Desktop

```
apps/desktop/
├── src/
│   ├── components/
│   │   ├── Layout.tsx              # Notion-like layout
│   │   ├── Sidebar.tsx             # Navigation épurée
│   │   ├── ProjectCard.tsx         # Card projet avec streak
│   │   ├── StreakWidget.tsx        # 🔥 Streak visuel
│   │   ├── ChallengeCard.tsx       # Carte défi
│   │   ├── NotificationCenter.tsx  # Centre notifications
│   │   │
│   │   ├── dashboards/
│   │   │   ├── GlobalStateDashboard.tsx      # Dashboard 1
│   │   │   ├── EvolutionDashboard.tsx        # Dashboard 2
│   │   │   ├── QualityProductivityDashboard.tsx  # Dashboard 3
│   │   │   └── ContributorsDashboard.tsx     # Dashboard 4
│   │   │
│   │   ├── git/
│   │   │   ├── GitSetup.tsx        # Config repo Git
│   │   │   ├── CommitHistory.tsx   # Liste commits scannés
│   │   │   └── DiffViewer.tsx      # Vue diff commit
│   │   │
│   │   └── export/
│   │       ├── ExportModal.tsx     # Export multi-format
│   │       └── templates/          # Templates export
│   │
│   ├── lib/
│   │   ├── git.ts                  # Git operations wrapper
│   │   ├── localStore.ts           # Local storage scans
│   │   ├── gamification.ts         # Streaks, challenges logic
│   │   ├── notifications.ts        # Alerting system
│   │   └── export/                 # Export engines
│   │
│   ├── hooks/
│   │   ├── useGitSync.ts           # Auto-sync Git
│   │   ├── useStreak.ts            # Streak management
│   │   └── useChallenges.ts        # Challenges management
│   │
│   └── types/
│       ├── git.ts                  # Git-related types
│       ├── gamification.ts         # Streaks, badges, challenges
│       └── scan.ts                 # Updated scan types
│
└── src-tauri/
    └── src/
        ├── git/                    # Rust Git operations
        │   ├── mod.rs
        │   ├── clone.rs
        │   ├── fetch.rs
        │   ├── commits.rs
        │   └── diff.rs
        ├── scanner/                # Enhanced scanner
        │   ├── commit_scan.rs      # Scan specific commit
        │   └── diff_scan.rs        # Analyze commit diff
        └── storage/                # Local storage
            └── scans.rs            # Save/load scans locally
```

---

## 🚀 Phase 3: Plan d'Action Détaillé

### Étape 1: Nettoyage Backend (2-3h)

1. **Supprimer modèles obsolètes** (`models.go`)
    - Organization, Membership, Subscription
    - Repository, QualityBudget, Integration, AuditLog
2. **Supprimer handlers** (`internal/handlers/`)
    - billing.go, org.go, policy.go, integrations.go
    - websocket.go, ci.go
3. **Supprimer modules**
    - /internal/worker/, /internal/email/, /internal/slack/
    - /internal/websocket/
    - /ci-agent/ (dossier complet)
4. **Nettoyer migrations**
    - Supprimer tables obsolètes
    - Créer migration de nettoyage

5. **Nettoyer routes** (`cmd/server/main.go`)
    - Retirer routes org, billing, integrations, websocket

### Étape 2: Refonte Modèles Backend (3-4h)

1. **Adapter User**
    - Ajouter `PremiumUntil *time.Time`
    - Ajouter `Streaks JSONMap`
2. **Refondre Project**
    - Ajouter champs Git (repo_url, provider, last_commit_sha)
    - Ajouter streak_data JSONMap
3. **Créer nouveaux modèles**
    - Collaborator
    - Challenge
    - Refactoriser Scan → CommitScan avec champs Git
4. **Créer migration**
    - Migration `002_refonte_git_gamification.up.sql`

### Étape 3: Refonte Handlers Backend (4-5h)

1. **project.go**: Ajouter endpoints Git setup
2. **scan.go**: Transformer en commit-based
3. **auth.go**: Nettoyer, garder essentiel
4. **Créer git.go**: Endpoints Git operations
5. **Créer gamification.go**: Streaks, challenges, badges
6. **export.go**: Supprimer (déplacé frontend)
7. **stats.go**: Refondre pour projet-centric

### Étape 4: Backend Git Integration (5-6h)

1. **Créer `/internal/git/` module**
    - analyze_commit.go: Analyser un commit spécifique
    - compute_metrics.go: Throughput, lead time, cycle time
    - contributor_stats.go: Stats par contributeur
2. **Intégrer dans scan flow**
    - Détecter nouveaux commits
    - Scanner automatiquement
    - Calculer métriques Git

### Étape 5: Frontend Desktop - Rust/Tauri (6-8h)

1. **Module Git Rust** (`src-tauri/src/git/`)
    - git2-rs integration
    - Clone, fetch, log operations
    - Commit diff analysis
2. **Scanner commit-specific**
    - Analyser fichiers modifiés dans commit
    - Calculer diff metrics
3. **Local storage**
    - SQLite local pour scans
    - Gestion cache
    - Sync conditionnel vers API (si premium)

### Étape 6: Frontend Desktop - UI Refonte (10-12h)

1. **Design system Notion-like**
    - Tailwind config adapté
    - Composants base (Button, Card, Input épurés)
2. **Layout principal**
    - Sidebar navigation simplifiée
    - Header avec streak widget
    - Notification center
3. **Projects list**
    - Cards avec preview, streak, dernier commit
    - Filtres simples
4. **4 Dashboards**
    - GlobalStateDashboard (actuel adapté)
    - EvolutionDashboard (graphes temporels commits/lignes)
    - QualityProductivityDashboard (métriques DORA)
    - ContributorsDashboard (classement contributeurs)

### Étape 7: Gamification Frontend (4-5h)

1. **Streak tracking**
    - Widget visuel 🔥
    - Historique streak
    - Badges achievements
2. **Challenges system**
    - Liste défis actifs
    - Progression visuelle
    - Génération auto défis hebdomadaires
3. **Notifications/Alerting**
    - Système notification local
    - Types: progression, inactivité, qualité, défis
    - Configurable par user

### Étape 8: Export Frontend (3-4h)

1. **Export engine**
    - HTML: Template customizable
    - PDF: jsPDF ou Puppeteer
    - XML: Structured data
    - Markdown: Clean format
    - LaTeX: Scientific papers
2. **UI Export**
    - Modal export
    - Aperçu avant export
    - Options customisation

### Étape 9: Git Auto-Sync (2-3h)

1. **Hook projet opening**
    - Fetch nouveaux commits
    - Compare last_commit_sha
    - Déclencher scan automatique
2. **Background watcher** (optionnel)
    - Surveiller .git/ changes
    - Auto-rescan sur push

### Étape 10: Frontend Web Refonte (4-6h) - Optionnel

1. **Landing page marketing**
    - Hero section
    - Features showcase
    - Download CTA
2. **Profils publics**
    - Vue projets publics user
    - Streaks et badges publics
    - Pas d'édition (read-only)

### Étape 11: Tests & Polish (6-8h)

1. **Tests backend**
    - Nouveaux endpoints
    - Git integration
    - Gamification logic
2. **Tests frontend**
    - Composants critiques
    - Git operations
    - Local storage
3. **UX polish**
    - Animations fluides
    - Loading states
    - Error handling
4. **Performance**
    - Optimiser scans Git
    - Cache intelligent
    - Lazy loading dashboards

---

## 📋 Phase 4: Checklist de Migration

### Backend

- [ ] Supprimer modèles obsolètes (Organization, Membership, etc.)
- [ ] Supprimer handlers obsolètes (billing, org, policy, etc.)
- [ ] Supprimer modules obsolètes (worker, email, slack, websocket)
- [ ] Supprimer CI agent complet
- [ ] Créer migration nettoyage DB
- [ ] Adapter User (premium, streaks)
- [ ] Refondre Project (Git fields, collaborators)
- [ ] Créer CommitScan, Collaborator, Challenge
- [ ] Créer migration refonte
- [ ] Refondre handlers (project, scan, stats)
- [ ] Créer git.go handler
- [ ] Créer gamification.go handler
- [ ] Créer module /internal/git/
- [ ] Implémenter analyse commits
- [ ] Implémenter métriques DORA
- [ ] Implémenter stats contributeurs
- [ ] Nettoyer routes main.go

### Frontend Desktop - Rust

- [ ] Créer module git/ (git2-rs)
- [ ] Implémenter clone/fetch
- [ ] Implémenter log/commits
- [ ] Implémenter diff analysis
- [ ] Créer scanner commit-specific
- [ ] Créer local storage SQLite
- [ ] Implémenter sync conditionnel API

### Frontend Desktop - React

- [ ] Refonte design system (Notion-like)
- [ ] Nouveau layout principal
- [ ] Sidebar simplifiée
- [ ] Streak widget
- [ ] Notification center
- [ ] Projects list refonte
- [ ] Dashboard 1: État global
- [ ] Dashboard 2: Évolution
- [ ] Dashboard 3: Qualité/Productivité
- [ ] Dashboard 4: Contributeurs
- [ ] Git setup flow
- [ ] Commit history viewer
- [ ] Streak tracking UI
- [ ] Challenges system UI
- [ ] Alerting/notifications
- [ ] Export HTML
- [ ] Export PDF
- [ ] Export XML
- [ ] Export Markdown
- [ ] Export LaTeX
- [ ] Auto-sync Git hook

### Frontend Web (Optionnel)

- [ ] Landing page
- [ ] Download section
- [ ] Profils publics viewer

### Tests & Polish

- [ ] Tests backend
- [ ] Tests frontend
- [ ] UX polish
- [ ] Performance optimizations
- [ ] Documentation

---

## 🎯 Ordre d'Exécution Optimal

**Sprint 1 (Backend nettoyage)**: Étapes 1-2  
**Sprint 2 (Backend refonte)**: Étapes 3-4  
**Sprint 3 (Frontend base Rust)**: Étape 5  
**Sprint 4 (Frontend UI refonte)**: Étape 6  
**Sprint 5 (Gamification)**: Étape 7  
**Sprint 6 (Export + Sync)**: Étapes 8-9  
**Sprint 7 (Polish)**: Étape 11  
**Sprint 8 (Web - optionnel)**: Étape 10

---

## 🔥 Points d'Attention

1. **Breaking changes**: Migration DB majeure, users doivent ré-scanner
2. **Git dependencies**: Nécessite libgit2 installé localement
3. **Local storage**: Gérer migration anciennes données vers local
4. **Premium sync**: API cloud optionnelle pour backup
5. **Performance**: Scanner gros repos peut être lent → optimiser
6. **Multi-platform**: Tester Git ops sur Windows/Mac/Linux

---

## 📈 KPIs de Succès

- Temps premier scan projet: < 30s
- Temps setup Git: < 1min
- UX fluide: animations 60fps
- Zéro config: marche immédiatement
- Streak engagement: > 70% users daily activity
- Export qualité: tous formats fonctionnels

---

## 🚦 État Actuel

**Phase**: Planification complète ✅  
**Prochaine étape**: Sprint 1 - Nettoyage backend

**Prêt à démarrer**: Oui 🚀
