# CodePulse Desktop Frontend

## Purpose and Role

The desktop app is a privacy-first local scanner and control panel for CodePulse:

- Scans code locally and computes metrics (no source content leaves the machine).
- Queues aggregated snapshots for sync to the backend when enabled.
- Manages organizations, members, policies, billing, and integrations.
- Provides project-level actions and settings for the local scanner.

Only aggregated metrics are sent to the API. See `docs/api.md` for backend contracts.

## Architecture Overview

- Runtime: Tauri (Rust) + React + TypeScript.
- UI bundle: `apps/desktop/src/`.
- Tauri (Rust) backend: `apps/desktop/src-tauri/`.
- API clients:
    - `apps/desktop/src/lib/api.ts`: user and project endpoints, auth helpers, `API_BASE` and `WEB_BASE`.
    - `apps/desktop/src/lib/api-org.ts`: org-scoped endpoints with `X-Codepulse-Org` header.
- State: React hooks, minimal local state per component, settings persisted via Tauri commands.
- Routing/Screens: handled in `apps/desktop/src/App.tsx` and pages under `src/pages/`.

### Key UI Components and Pages

- `src/App.tsx`: App shell, auth flow, main navigation.
- `src/components/ProjectDetails.tsx`: project scan/preview actions.
- `src/components/Settings.tsx`: user settings and sync preferences.
- `src/pages/OrganizationPage.tsx`: organization settings hub with tabs:
    - `TeamTab.tsx`: members, roles.
    - `RepositoriesTab.tsx`: GitHub App connection and repository management.
    - `PoliciesTab.tsx`: quality policies with plan-based limits.
    - `BillingTab.tsx`: subscription overview and upgrade/portal flows.
    - `IntegrationsTab.tsx`: Slack and GitHub integration UI.

## API Communication

- All API calls use Bearer JWT in `Authorization` when available.
- Org-scoped routes include `X-Codepulse-Org` header (see `api-org.ts`).
- Frontend base URLs:
    - `API_BASE`: `(import.meta as any).env.VITE_API_BASE_URL || http://localhost:8080/api` in `api.ts`.
    - `WEB_BASE`: `(import.meta as any).env.VITE_WEB_BASE_URL || http://localhost:3000` in `api.ts`.
- Scan snapshots from the React side post to `POST ${API_BASE}/sync/scan`.

## Sync Worker (Tauri, Rust)

- Queueing: `src-tauri/src/sync.rs` writes JSON snapshots to a queue folder under the OS config dir (`~/.config/codepulse/queue`).
- Background worker: `start_sync_worker()` periodically sends each queued snapshot to `POST {api_base_url}/api/sync/scan`.
- Authorization: If a token exists (via `auth.rs`), it is attached as `Authorization: Bearer`.
- Retries: Network/server errors are retried with exponential backoff, 4xx errors are treated as permanent.

### Configurable API Base URL (Sync)

- New setting in Rust: `UserSettings.api_base_url` (default `http://localhost:8080`).
- Used in `src-tauri/src/main.rs` to start the sync worker with the configured base URL.
- Editable from UI: `Settings` → Sync section → "API Base URL (Sync)". Restart the app to apply.

## Authentication & Tauri Commands

- Tokens are stored via Tauri commands defined in `src-tauri/src/auth.rs`:
    - `get_auth_token`, `set_auth_token`, `clear_auth_token`.
- Other commands:
    - `get_settings`, `update_settings` (persisted to `~/.config/codepulse/settings.json`).
    - `scan_directory`, `scan_and_maybe_enqueue`, `cancel_scan` (scanner control).
    - `get_project_binding`, `set_project_binding`, `clear_project_binding`, `compute_project_key_hash`.

## Business Logic & Paywalls

- Slack integration (Pro+): gated in `src/components/organization/IntegrationsTab.tsx`.
    - On Free plan, "Connect to Slack" is disabled and an Upgrade button opens Stripe Checkout via `orgApi.createCheckoutSession()`.
- GitHub App connection: implemented in `src/components/organization/RepositoriesTab.tsx`.
    - Free plan shows Upgrade CTA; paid plans open the GitHub App install URL.
- Policies limits: enforced in `src/components/organization/PoliciesTab.tsx` (e.g., plan-based caps).

## Integrations

- GitHub App:
    - UI entry points: `RepositoriesTab.tsx` (Connect/Install) and `IntegrationsTab.tsx` (overview).
    - Install URL: `https://github.com/apps/codepulse-quality/installations/new`.
    - After install, API receives webhooks and performs PR checks.
- Slack:
    - Connect/Disconnect via `orgApi.connectSlack()`/`orgApi.disconnectSlack()`.
    - Requires Pro+ plan. Upgrade handled by Stripe checkout session and `openExternal()`.

## Navigation & UX Notes

- `OrganizationPage.tsx` organizes settings via tabs. The active org is shown in the header with plan badge.
- Repository management lives under the Repositories tab and references the plan to enable/disable actions.
- Error handling in integrations is defensive: API response shapes are validated before use.

## Development Notes

- Environment variables for web requests live in `.env` (see `apps/desktop/.env.example`).
- Desktop app commands/scripts in `scripts/` can launch dev servers.
- Keep parity between TS `UserSettings` (`src/types.ts`) and Rust `UserSettings` (`src-tauri/src/settings.rs`).
- Org-scoped requests must include `X-Codepulse-Org` (done centrally in `api-org.ts`).

## Future Improvements

- Enforce owner/admin UI gating for integration and billing actions.
- Show connected repositories list once backend endpoints are confirmed.
- Add telemetry-free local logs viewer for sync queue outcomes.
