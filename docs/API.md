# CodePulse API

## 🎯 Vision & Objectif

CodePulse est une API multi-tenant (Go + Gin + PostgreSQL) orientée "privacy-first" pour mesurer des métriques de qualité de code. Aucune ligne de code n’est transmise: seules des métriques agrégées sont reçues depuis l’app Desktop et le CI Agent.

- Mise à disposition d’endpoints REST pour:
    - Gestion utilisateurs, profils et projets
    - Organisations, membres et rôles (owner/admin/member)
    - Politiques de qualité et évaluation
    - Intégrations (GitHub App, Slack, Email, Billing Stripe)
    - Exports (CSV/JSON/XML/PDF-HTML)
    - Statistiques agrégées
    - WebSocket temps réel (broadcast par organisation)

## 🔐 Rôles & Fonctionnalités

- **owner**: droits complets sur l’organisation (paramètres, membres, facturation, politiques, intégrations)
- **admin**: gestion des paramètres, membres, politiques, intégrations (hors opérations critiques réservées owner)
- **member**: accès lecture/écriture aux projets et métriques selon contexte

Les routes d’organisation utilisent un contexte résolu par `X-Codepulse-Org` (ou premier org par défaut de l’utilisateur).

## 🗂 Architecture (back-end)

- `apps/api/cmd/server/main.go`: bootstrap serveur Gin, wiring config, DB/Redis, handlers, middlewares, WebSocket hub, workers
- `apps/api/internal/config/`: chargement des variables d’environnement (`Load()`), `APP_VERSION`, CORS, GitHub, Stripe, Slack, Postmark, DB/Redis
- `apps/api/internal/database/`: connexion GORM Postgres + client Redis
- `apps/api/internal/models/`: modèles GORM (users, profiles, projects, scans, scan_langs, orgs, memberships, subscriptions, repositories, quality_budgets, integrations, audit_logs)
- `apps/api/internal/middleware/`:
    - `AuthMiddleware`: `RequireAuth()`/`OptionalAuth()` (JWT HS256), renseigne `user` et `user_id`
    - `OrgContextMiddleware`: `ResolveOrg()` (header `X-Codepulse-Org`), `RequireAdmin()`/`RequireOwner()`
- `apps/api/internal/handlers/`: logique HTTP (auth, org, policy, project, scan, ci, export, stats, billing, github, integrations, websocket, health, og)
- `apps/api/internal/quality/`: calcul/évaluation des métriques vs budgets de qualité
- `apps/api/internal/github/`: GitHub App (JWT, Check Runs, Webhook HMAC)
- `apps/api/internal/slack/`: client Slack et formatage messages
- `apps/api/internal/email/`: client Postmark + service d’envoi (templates HTML)
- `apps/api/internal/export/`: export CSV & PDF-HTML
- `apps/api/internal/websocket/`: hub/ws clients par organisation
- `apps/api/internal/worker/`: worker digest hebdo (Slack + Email), outils d’encryptage AES-256-GCM pour tokens d’intégration

## ⚙️ Config & Version

- `APP_VERSION`: utilisée par `GET /health`
- `ENCRYPTION_KEY`: clé secrète pour chiffrer les tokens d’intégration (AES-256-GCM)
- Voir `docs/QUICKSTART.md` et `apps/api/internal/config/config.go` pour la liste complète.

## 🔐 Authentification

- JWT HS256 via header `Authorization: Bearer <token>`
- Généré à l’inscription/connexion (`/api/auth/register`, `/api/auth/login`)
- Middlewares:
    - `RequireAuth()` protège la plupart des routes (orgs, me, stats, etc.)
    - `ResolveOrg()` exige `X-Codepulse-Org: <org_id>` ou récupère la 1ère org de l’utilisateur

## 🌐 CORS

- Développement: `*`
- Production: `https://<DOMAIN>`

## 🔌 WebSocket

- Hub par organisation: `GET /api/ws/connect` (headers auth + org requis)
- Stats connexions: `GET /api/ws/stats`
- Messages broadcastés côté serveur via `websocket.Hub.BroadcastToOrg(orgID, type, payload)`

## ⏱ Worker

- Worker de digest hebdomadaire (Slack + Email): `worker.StartDigestWorker()`
- Chiffrement tokens Slack en base (AES-256-GCM via `ENCRYPTION_KEY`)

---

# Référence des Routes

Toutes les routes sont préfixées par `/api` sauf `/health`.

## Santé

- `GET /health`
    - Réponse: `{ status, timestamp, services: { postgres, redis }, version }`

## Authentification

- `POST /api/auth/register`
    - Body: `{ email, password, handle }`
    - Réponse: `{ token, user }`
- `POST /api/auth/login`
    - Body: `{ email, password }`
    - Réponse: `{ token, user }`
- `POST /api/auth/logout`
    - Réponse: `{ message }`
- `GET /api/auth/me` (auth)
    - Réponse: `{ user }`
- `DELETE /api/auth/account` (auth)
    - Body: `{ password }`
    - Réponse: `{ message }`

Profil (via `me`):

- `GET /api/me/profile` (auth)
    - Réponse: `{ profile }`
- `PATCH /api/me/profile` (auth)
    - Body partiel: `{ display_name?, avatar_url?, bio?, links?, visibility? ('private'|'public'), email?, password?, current_password? }`
    - Réponse: `{ profile, user: { id, email } }`

## Projets (scope utilisateur)

- `GET /api/me/projects` (auth)
    - Réponse: `{ projects: Project[] }`
- `POST /api/me/projects` (auth)
    - Body: `{ name?, description?, path?, visibility? ('private'|'public'), settings? }`
    - Réponse: `{ project }`
- `GET /api/me/projects/:id` (auth) → `{ project }`
- `PATCH /api/me/projects/:id` (auth) → met à jour `name`, `visibility`, `settings` → `{ project }`
- `DELETE /api/me/projects/:id` (auth) → `{ message }`
- `GET /api/me/projects/:id/details` (auth)
    - Query: `page?=1`, `limit?=20`
    - Réponse: `{ project, scans, stats: { total_scans, has_scans, language_stats, latest_scan }, pagination }`

Public:

- `GET /api/u/:handle/:project_id` → projet public + 10 derniers scans

## Scans (app Desktop)

- `POST /api/sync/scan` (auth)
    - Body: `{ project_key_hash, totals: { total, code, comment, blank, core_code_lines?, info_lines? }, per_language: [...], device_id, app_version?, scanned_at (epoch_s) }`
    - Réponse: `{ success, message, scan_id }`

## CI Snapshots (CI Agent)

- `POST /api/ci/snapshots` (Bearer JWT)
    - Body: `{ org_id, repository, commit_sha, pull_request?, totals: { total, code, comment, blank, core_code_lines?, info_lines? }, per_language: [...], scanned_at }`
    - Validation: le token JWT doit représenter un utilisateur membre de `org_id`
    - Réponse: `{ scan_id, repository_id, message }`
- `GET /api/ci/snapshots/:id` (auth) → Scan + `ScanLangs` + `Repository`

## Organisations

- `POST /api/orgs` (auth)
    - Body: `{ name, slug? }`
    - Réponse: `Organization`
    - Effets: crée membership owner + subscription free
- `GET /api/orgs/me` (auth) → liste des orgs de l’utilisateur avec rôle et subscription courante
- `GET /api/orgs/:id` (auth) → `{ organization, role }`
- `PATCH /api/orgs/:id` (auth + org + admin) → `{ name?, slug? }` → `Organization`

Membres:

- `GET /api/orgs/:id/members` (auth) → `Membership[]` (+ `User.Profile`)
- `POST /api/orgs/:id/invite` (auth + org + admin)
    - Body: `{ email, role ('admin'|'member') }`
    - Réponse: `Membership`
    - Effets: envoie un email d’invitation (best-effort)
- `PATCH /api/orgs/:id/members/:user_id` (auth + org + admin)
    - Body: `{ role ('owner'|'admin'|'member') }`
    - Réponse: `Membership`
- `DELETE /api/orgs/:id/members/:user_id` (auth + org + admin)
    - Réponse: `{ message }`

## Politiques de Qualité (Quality Budgets)

- `GET /api/orgs/:id/policies` (auth + org)
- `POST /api/orgs/:id/policies` (auth + org + admin)
    - Body: `{ scope ('org'|'repo'|'project'), ref_id?, name, thresholds: { comment_ratio_min?, bloat_max?, doc_coverage_min?, core_to_info_ratio_min? }, mode? ('soft'|'hard'), enabled? }`
- `GET /api/orgs/:id/policies/:policy_id`
- `PATCH /api/orgs/:id/policies/:policy_id` (auth + org + admin)
- `DELETE /api/orgs/:id/policies/:policy_id` (auth + org + admin)

## Statistiques

- `GET /api/orgs/:id/stats` (auth + org)
    - Query: `window?=7d|30d|90d (def=30d)`
    - Réponse: `{ avg_comment_ratio, avg_bloat_ratio, avg_doc_coverage, total_lines, total_code, total_comment, total_core, total_info, repository_count, scan_count, trend[] }`
- `GET /api/stats/repos/:id` (auth + org)
    - Query: `window?`
    - Réponse: stats repo + breakdown par langage (`languages`)
- `GET /api/stats/projects/:id` (auth) → stats projet + breakdown langages

## Export

- `GET /api/export` (auth)
    - Query: `project_id`, `format=csv|json|xml|pdf`, `from=YYYY-MM-DD?`, `to=YYYY-MM-DD?`, `include_languages=true?`
    - Réponses:
        - CSV: `text/csv`
        - JSON: `application/json`
        - XML: `application/xml`
        - PDF: `text/html` (HTML prêt à exporter en PDF côté front)

## Open Graph

- `GET /api/og/project/:id?handle=username` → image SVG OG dynamique (projets publics)

## GitHub

- `POST /api/github/webhook` (public, HMAC `X-Hub-Signature-256`)
    - Événements: `installation`, `installation_repositories`, `pull_request`
    - PR: crée un Check Run (pending si pas de scan, completed avec conclusion `success|neutral|failure` après évaluation)
- `GET /api/github/install/callback` → redirige vers l’app avec `installation_id`

## Intégrations (Slack)

- `GET /api/integrations` (auth + org) → liste intégrations (masque tokens)
- `POST /api/integrations/slack/connect` (auth + org + admin) → renvoie l’URL OAuth Slack
- `GET /api/integrations/slack/callback` (public) → enregistre l’intégration (token chiffré), channel par défaut `general`
- `DELETE /api/integrations/slack/disconnect` (auth + org + admin)
- `PATCH /api/integrations/slack/channel` (auth + org + admin)
    - Body: `{ channel }` → met à jour `config.channel`

## Facturation (Stripe)

- `POST /api/billing/checkout` (auth + org + admin)
    - Body: `{ plan ('pro'|'team'|'enterprise'), seats, success_url, cancel_url }`
    - Effets: crée une session Stripe Checkout avec le price ID (env: `STRIPE_PRICE_*`)
- `POST /api/billing/portal` (auth + org + admin)
    - Body: `{ return_url }` → renvoie l’URL du portail Stripe
- `GET /api/billing/subscription` (auth + org) → subscription courante
- `POST /api/billing/webhook` (public)
    - Signature Stripe vérifiée
    - Événements: `customer.subscription.*`, `invoice.payment_*`
    - Audit log créé sur paiement réussi, past_due + email à l’owner si échec (best-effort)

## WebSocket

- `GET /api/ws/connect` (auth + org)
    - Upgrade WebSocket, rattache le client au hub de l’org
- `GET /api/ws/stats` (auth + org) → `{ total_connections, org_connections? }`

---

# Schémas & Modèles (extraits utiles)

- `Scan`: `{ id, project_id, repository_id?, commit_sha?, pull_request?, total, code, comment, blank, comment_ratio, core_code_lines, info_lines, created_at }`
- `ScanLang`: `{ scan_id, language, files, total, code, comment, blank }`
- `Organization`: `{ id, name, slug, ... }`
- `Membership`: `{ id, org_id, user_id, role }`
- `Subscription`: `{ id, org_id, plan ('free'|'pro'|'team'|'enterprise'), seats, status }`
- `Repository`: `{ id, org_id, provider, external_id, full_name, visibility }`
- `QualityBudget`: `{ id, org_id, scope ('org'|'repo'|'project'), ref_id?, name, thresholds, mode ('soft'|'hard'), enabled }`

---

# Usage TypeScript (exemples rapides)

- **Auth header**: `Authorization: Bearer ${token}`
- **Org header** (routes org): `X-Codepulse-Org: ${orgId}`

```bash
# Créer une org
curl -X POST http://localhost:8080/api/orgs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Inc"}'

# Lancer un export JSON
curl -G http://localhost:8080/api/export \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "project_id=$PROJECT_ID" \
  --data-urlencode "format=json"

# CI snapshot
curl -X POST http://localhost:8080/api/ci/snapshots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id":"...",
    "repository":"owner/repo",
    "commit_sha":"abc123",
    "totals":{"total":15000,"code":12000,"comment":1800,"blank":120,"core_code_lines":10000,"info_lines":2000},
    "per_language":[{"language":"TypeScript","files":45,"total":8000,"code":7000,"comment":800,"blank":200}],
    "scanned_at":"1705512000"
  }'
```

---

# Erreurs & Conventions

- Erreurs simples: `{ error: string }`
- Codes HTTP cohérents (400/401/403/404/409/500, etc.)

---

# Notes d’implémentation

- Aucun TODO/FIXME résiduel côté API.
- `APP_VERSION` exposée: `GET /health`.
- Tokens d’intégration chiffrés (AES-256-GCM via `ENCRYPTION_KEY`).
- Price IDs Stripe fournis par env `STRIPE_PRICE_*`.
- CI snapshots exigent un JWT valide + membership sur l’org.
