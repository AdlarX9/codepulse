Tu es l’architecte principal et le développeur de “CodePulse”. Utilise ce brief comme source de vérité. Si quelque chose est ambigu, pose des questions avant d’implémenter.

Tâche: construire un produit cross-plateforme (macOS/Windows/Linux) avec:

- App desktop Tauri + React + TypeScript + Tailwind + shadcn/ui + Recharts (backend Rust pour le scan)
- Site Next.js (landing animée “wow” + page /admin protégée pour les stats de téléchargements)
- Collecte des stats de téléchargement via API Next.js + Supabase Postgres (IP hashée + sel, pays/ville/région, UA, referrer)
- Distribution via GitHub Releases; endpoint /api/download log puis 302 vers l’asset
- CI/CD GitHub Actions: build Tauri (matrix mac/win/linux), upload assets, mettre à jour un manifest assets.json; déploiement web
- Scripts monorepo (pnpm workspaces + turbo) pour dev/build/release

Voici le brief complet (collé ci-dessous). Traite-le comme source de vérité. Après lecture:

1. Résume le plan en étapes (milestones), liste les dossiers/fichiers initiaux du monorepo et les scripts npm.
2. Génère le squelette minimal fonctionnel (apps/desktop, apps/web, packages/core, packages/telemetry, scripts/, .github/workflows/).
3. Implémente progressivement: (a) landing Next.js animée + route /api/download + Supabase; (b) page /admin avec Basic Auth et graphiques; (c) app Tauri (UI + scan Rust + IPC + export CSV/JSON); (d) workflows release + manifest assets.json; (e) docs README.
4. A chaque étape, propose un diff clair (fichiers complets) et les commandes à exécuter.

Rappels:

- Aucune donnée de code scanné ne quitte la machine.
- IP jamais stockée en clair (hash SHA-256 + sel).
- Respecte la structure, scripts et env vars décrites.

BRIEF:

# CodePulse — Brief d’implémentation complet

Objectif
Construire un produit cross-plateforme “CodePulse” qui analyse des répertoires de code et fournit un dashboard riche et moderne. Le projet comprend:

- Une app desktop (macOS/Windows/Linux) Tauri + React
- Un site web Next.js avec landing page animée “wow” + page admin protégée
- Une collecte minimale et privacy-friendly des stats de téléchargements
- Une CI/CD complète pour build, release et déploiement

Stack technique

- Monorepo: PNPM workspaces + Turborepo
- App desktop: Tauri (Rust backend) + Vite + React + TypeScript + TailwindCSS + shadcn/ui + Recharts
- Moteur de comptage: Rust (walkdir, encodage robuste, heuristiques de commentaires; option Tree-sitter plus tard)
- Site: Next.js 14 App Router + Tailwind + Framer Motion + (Lottie/Spline) + Recharts
- Backend stats: Next.js API Routes (Edge Runtime), DB PostgreSQL (via client server-side)
- Distribution: GitHub Releases (assets .dmg/.exe/.AppImage + checksums)
- CI/CD: GitHub Actions matrices Tauri + déploiement web
- Analytics site (option): Plausible (sans cookies) pour le trafic web général (pas les téléchargements)

Structure du repo (monorepo)

- apps/
    - desktop/ (App Tauri + React)
    - web/ (Site Next.js)
- packages/
    - core/ (types partagés, mapping extensions→langage, constantes, schémas Zod)
    - telemetry/ (schémas d’événements analytics internes, utilitaires de journalisation)
- scripts/
    - dev.sh (lancer web + desktop en dev)
    - build_all.sh (build web + desktop)
    - release_tag.sh (tag + push pour CI release)
- .github/workflows/
    - release.yml (build Tauri mac/win/linux, upload assets, créer release)
    - web_deploy.yml (build site si non Vercel auto; sinon ignorer)
- LICENSE, README.md

Fonctionnalités (App desktop)
MVP

- Sélection du dossier racine
- Analyse récursive
- “Projets” = sous-dossiers directs de racines typées (ex: amusements, projets, C-C++)
- Statistiques:
    - Nb fichiers, lignes totales, code, commentaires (et %), vides
    - Répartition par langage (fichiers, lignes, %, code, commentaires, vides)
    - Moyenne, médiane, écart-type des lignes par fichier
- UI Dashboard:
    - Hero header (titre, actions)
    - Panneau gauche: sections (TOTAL + projets)
    - Panneau droit: cartes KPI + donut (répartition) + bar chart (Top langages) + tableau triable/filtrable
    - Thème clair/sombre, autoswitch (préférence OS), toggle UI
    - Export CSV/JSON des stats
- Performance:
    - Backend Rust pour le comptage
    - IPC Tauri (commands + events de progression)
    - Annulation d’analyse (stop/cancel)
- Sécurité:
    - Aucune donnée de code exfiltrée
    - Permissions filesystem scellées par Tauri (scoped)

V2 (suggestions)

- Tree-sitter pour une meilleure détection commentaires/code
- Profilage des perfs + worker pool pour parallélisme
- Historique des scans (local, chiffré)
- Auto-update Tauri (canal stable/bêta)
- Packaging notarized/signed (macOS/Windows)

Fonctionnalités (Site web)
Landing page

- Hero section avec animation 3D (Spline) ou Lottie
- Effets Framer Motion: parallax, reveal, staggered cards
- Sections: Features, Screenshots (ou composant live embed), Performance, Privacy, CTA download
- Boutons download: redirigent vers /api/download?platform=...&version=latest => enregistre l’événement (DB) => 302 vers asset GitHub Release
- SEO + OpenGraph

Stats admin

- /admin (Basic Auth via env NEXT_ADMIN_USER/NEXT_ADMIN_PASS)
- Graphiques: téléchargements x temps, par plateforme, par pays, referrer, version
- Filtres: période (7/30/90 jours), plateforme, version
- Export CSV

Backend stats (Next.js Edge)

- API route /api/download:
    - Paramètres: platform (mac|win|linux), version (latest ou vX.Y.Z)
    - Récupérer headers (pays/region/city UA, referrer); hash IP (SHA256 + salt secret) côté serveur
    - Insert DB (table downloads)
    - Résoudre l’URL GitHub Release asset correspondant (via GitHub API ou mapping statique mis à jour par CI)
    - 302 redirect
- Middleware / instrumentation (option): enrichir la requête avec géo

Base de données (Supabase Postgres)
Table downloads

- id: uuid (PK)
- created_at: timestamptz default now()
- ip_hash: text (sha256(IP + SALT)), non indexé publiquement
- country: text (ISO), region: text, city: text
- user_agent: text
- referrer: text
- platform: text (enum: mac, win, linux)
- version: text (ex: v1.0.0)
- release_channel: text (stable/beta)
- source: text (ex: landing, direct, newsletter)
- extra: jsonb (libre)

Protection vie privée

- On ne stocke pas l’IP en clair (hash avec sel)
- Pas de cookies pour la page download; stats agrégées seulement
- Aucune donnée de code n’est envoyée côté serveur

CI/CD
Release workflow (GitHub Actions)

- Déclenché sur tag v*.*.\* (release)
- Matrice:
    - macOS-latest: x64 + universal? (DMG)
    - windows-latest: x64 (MSI/EXE)
    - ubuntu-latest: AppImage + .deb
- Steps:
    - Setup Node + Rust + Tauri deps
    - pnpm install (cache)
    - Build desktop
    - Upload assets + checksums à GitHub release
    - Job pour mettre à jour un manifest JSON (assets.json) dans la branche main (ou release) utilisé par /api/download pour trouver l’asset

Web deploy workflow

- Si Vercel est utilisé, déploiement automatique via Vercel Git Integration
- Sinon, utiliser web_deploy.yml pour construire et publier (p.ex. sur Vercel CLI)

Scripts utiles

- root:
    - pnpm dev => lance web + desktop (concurrently via turbo)
    - pnpm dev:web , pnpm dev:desktop
    - pnpm build:web , pnpm build:desktop
    - pnpm release:tag vX.Y.Z => crée un tag et push (déclenche CI)
- scripts/dev.sh: lance pnpm -w dev (turbo)
- scripts/build_all.sh: build web + desktop
- scripts/release_tag.sh: safety checks + tag + push

Détails d’implémentation

1. Desktop (apps/desktop)

- Scaffold: create-tauri-app (Vite + React + TS)
- UI:
    - Tailwind + shadcn/ui
    - Pages/Views:
        - Home: sélection dossier racine, boutons “Analyser”, “Arrêter”
        - Sidebar: TOTAL + groupes (amusements, projets, C-C++)
        - Dashboard: cartes KPI (files, total, code, comments, blank, errors), donut (Recharts Pie with innerRadius), bar chart (Top langs), table (DataTable shadcn with sorting/filter)
        - Theme toggle (system/light/dark)
    - Exports CSV/JSON (client-side)
- Tauri backend (Rust):
    - Commands:
        - list_projects(base_path: String, project_roots: Vec<String>) -> Vec<Project>
        - scan_path(path: String, options: ScanOptions) -> ScanStats (stream progress events)
        - cancel_scan()
    - Comptage:
        - walkdir + ignore (gitignore-like + EXCLUDED_DIR_NAMES)
        - Détection langage: mapping extensions + fichiers spéciaux
        - Encodage: essayer UTF-8 strict, fallback latin-1 avec encoding_rs
        - Heuristique commentaires: line markers + block markers
        - Stats agrégées + ratios + mean/median/std
    - Events Tauri:
        - scan/progress (% ou fichiers scannés)
        - scan/done (Stats finales) / scan/error
- Permissions Tauri:
    - fs: lecture uniquement
    - AppConfig: limiter les dialogues et accès (scoped, pas de network)
- Tests:
    - Unit (Rust) pour le parser
    - E2E léger: dossier fixture avec langages mixtes

2. Web (apps/web)

- Scaffold: Next.js 14 (app dir), Tailwind, Framer Motion
- Pages:
    - / Landing:
        - Hero 3D (Spline embed) ou Lottie JSON + Framer Motion transitions
        - Sections animées: Features, Screenshots, Performance, Privacy, CTA
        - Boutons plateformes => /api/download?platform=mac|win|linux&version=latest
    - /admin Stats:
        - Basic Auth (env: NEXT_ADMIN_USER / NEXT_ADMIN_PASS)
        - Graphiques Recharts: time-series, pie by platform, choropleth (simple alternative: carte statique + liste pays)
        - Filtres (date range, plateforme, version)
        - Export CSV
- API:
    - /api/download (Edge):
        - Récupère headers géo (Vercel: x-vercel-ip-country , etc.) et UA/referrer
        - Hash IP (via crypto.subtle.digest("SHA-256", ip + SALT) — côté server runtime Node; si Edge, utiliser WebCrypto)
        - Insert Supabase (server client) downloads row
        - Trouve asset URL:
            - soit via assets.json mis à jour par CI
            - soit via GitHub API (token en env) et cache local
        - 302 vers l’asset
- Config:
    - Env vars: NEXT_PUBLIC_SITE_URL , SUPABASE_URL , SUPABASE_SERVICE_ROLE_KEY (server only), DOWNLOAD_IP_SALT , GITHUB_TOKEN (si GitHub API), NEXT_ADMIN_USER , NEXT_ADMIN_PASS

3. CI/CD

- release.yml:
    - jobs:
        - build_desktop (matrix: os)
            - setup rust, node, pnpm, tauri deps (mac notarization: laissé en TODO)
            - pnpm -w build:desktop
            - upload artifacts
        - create_release:
            - gh cli pour créer la release et attacher les assets + sha256
        - update_assets_manifest:
            - génère apps/web/public/assets.json (ou packages/core/assets.json) avec URLs assets par plateforme + version
            - PR automatique sur main ou push direct
- web_deploy.yml (optionnel si Vercel):
    - build Next + upload (ou rely sur Vercel)

4. Branding & Légal

- License: MIT
- Privacy.md: explicite ce que l’on collecte (téléchargements), pas de code utilisateur
- Terms: basique (gratuit, no warranty)
- Icônes, couleurs, logotype (simple, cohérent clair/sombre)

ENV variables (exemple .env)

- SUPABASE_URL=
- SUPABASE_SERVICE_ROLE_KEY=
- DOWNLOAD_IP_SALT=change_me_long_random
- GITHUB_TOKEN=ghp_xxx (si résolution via API)
- NEXT_ADMIN_USER=admin
- NEXT_ADMIN_PASS=supersecret
- NEXT_PUBLIC_SITE_URL=https://codepulse.app

Commandes à implémenter (root)

- pnpm i (bootstrap workspaces)
- pnpm dev (web + desktop)
- pnpm dev:web (Next dev)
- pnpm dev:desktop (tauri dev)
- pnpm build:web (Next build)
- pnpm build:desktop (tauri build)
- pnpm release:tag v1.0.0

Critères d’acceptation

- App:
    - Scan d’un dossier de test => UI réactive, cartes KPI correctes, donut et bar chart cohérents, tableau triable/filtrable, export CSV/JSON
    - Annulation d’un scan en cours
    - Thème clair/sombre (auto + toggle)
- Site:
    - Landing “wow” (hero animé, transitions lisses, bundling sobre)
    - CTA download enregistre en DB et redirige vers l’asset correct
    - /admin protégée par Basic Auth; charts OK; filtres fonctionnels; export CSV
- CI:
    - Tag vX.Y.Z => build matrices Tauri + assets sur GitHub release + manifest assets.json à jour
- Privacy:
    - Vérifier que le code scanné ne quitte jamais la machine
    - IP non stockée en clair (hash + sel), champ extra ne contient rien de sensible

Guides d’implémentation (extraits clés)

Rust (Tauri command de scan, schéma simple)

```rust
#[derive(serde::Serialize)]
pub struct FileCount { path: String, language: String, total: u32, blank: u32, comment: u32, code: u32 }
#[derive(serde::Serialize)]
pub struct LangAgg { files: u32, total: u32, blank: u32, comment: u32, code: u32 }
#[derive(serde::Serialize)]
pub struct ScanStats { /* aggregates + per_language + per_file_totals + duration */ }


#[tauri::command]
async fn scan_path(path: String, options: ScanOptions, window: tauri::Window) -> Result<ScanStats, String> {
  // walkdir, filter exclu, détecter lang via extension, lire fichier (utf8->latin1 fallback)
  // heuristique commentaires (line markers, block markers)
  // window.emit("scan/progress", Progress { /* ... */ }).ok();
  // retourner ScanStats
  Ok(stats)
}
```

Next.js API (enregistrer et rediriger)

```ts
export const runtime = 'edge'
export async function GET(req: Request) {
	const { searchParams } = new URL(req.url)
	const platform = searchParams.get('platform') ?? 'mac'
	const version = searchParams.get('version') ?? 'latest'

	const country = req.headers.get('x-vercel-ip-country') ?? 'XX'
	const city = req.headers.get('x-vercel-ip-city') ?? ''
	const region = req.headers.get('x-vercel-ip-country-region') ?? ''
	const ua = req.headers.get('user-agent') ?? ''
	const ref = req.headers.get('referer') ?? ''

	const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || ''
	const salt = process.env.DOWNLOAD_IP_SALT || ''
	const ip_hash = await sha256(ip + salt) // WebCrypto subtle.digest

	// load asset URL from assets.json or GitHub API
	const assetUrl = await resolveAssetUrl(platform, version)

	await insertDownload({
		ip_hash,
		country,
		region,
		city,
		user_agent: ua,
		referrer: ref,
		platform,
		version
	})

	return Response.redirect(assetUrl, 302)
}
```

UI (React, shadcn/ui)

- Dashboard avec Card composants, Recharts pour donut/barres
- DataTable shadcn (sorting, filtering)
- Theme provider (system/light/dark)
- Animations Framer Motion (stagger, whileInView)

Animations landing

- Hero: Spline 3D (embed) ou Lottie (json, contrôle au scroll)
- Sections: motion.div avec variants (fade-up, parallax background, stagger)
- CTA buttons: hover spring, glow subtile

Roadmap (option)

- v1.0 (MVP): fonctionnalités listées
- v1.1: auto-update Tauri, manifest versions, signatures
- v1.2: Tree-sitter, parallélisme avancé, historiques scans
- v1.3: plugins (ex: intégration Git repos, stats commits)

Livrables attendus de ta part (Claude)

- Monorepo initialisé (PNPM+Turbo), workspaces configurés
- Apps desktop et web scaffoldées et fonctionnelles
- DB migrations Supabase (downloads)
- API /api/download opérationnelle + admin /admin
- CI GitHub Actions release.yml prêt et testé sur tag dry-run (sans notarization)
- Documentation README.md (dev, build, release, env, privacy)
