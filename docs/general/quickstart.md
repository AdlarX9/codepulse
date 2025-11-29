# CodePulse SaaS - Guide de Démarrage Rapide

## 🎯 Ce qui a été implémenté

### Backend API (Go)

Une refonte complète pour supporter le multi-tenant SaaS:

- **Multi-tenant**: Organizations, members, roles (owner/admin/member)
- **GitHub App**: Webhooks, PR checks automatiques, status reporting
- **Quality Policies**: Budgets qualité configurables par org/repo
- **Billing Stripe**: Checkout, portal client, webhooks, 4 plans
- **Intégrations**: Slack (digest hebdomadaire), GitHub App
- **CI Agent**: Binary Rust standalone pour pipelines CI/CD
- **Analytics**: Stats agrégées, trends, dashboards

### CI Agent (Rust)

Scanner standalone pour CI/CD:

- Scan local, aucun code source envoyé
- Support 40+ langages
- Classification Core vs Info
- Docker ready
- GitHub Actions/GitLab CI/CircleCI

## 🚀 Installation & Exécution (Essentiel)

### 1) Backend API (Go)

```bash
cd apps/api
go mod tidy
psql -U codepulse -d codepulse_dev -f migrations/001_add_multi_tenant_models.sql
cp ../../.env.example .env.dev  # puis éditer les secrets requis
go run cmd/server/main.go
```

### 2) CI Agent (Rust)

```bash
cd ci-agent
cargo build --release
./target/release/ci-agent --path /path/to/repo --out scan.json

# Docker (optionnel)
docker build -t codepulse-ci-agent .
docker run --rm -v $(pwd):/workspace codepulse-ci-agent \
  --path /workspace \
  --out /workspace/scan.json
```

### 3) Desktop App

```bash
./codepulse.sh desktop
```

## 📚 API et intégrations

Voir `docs/integration-guide.md` pour la configuration (GitHub App, Stripe, Slack, Email) et la liste des endpoints.

## 🔧 Configuration Requise

### Variables d'Environnement Critiques

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=codepulse
DB_PASSWORD=your_password
DB_NAME=codepulse_dev

# GitHub App
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# JWT
JWT_SECRET=your-super-secret-jwt-key
```

## ✅ Vérifications rapides

```bash
# Créer une organisation
curl -X POST http://localhost:8080/api/orgs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Inc"}'

# Générer et envoyer un scan (CI Agent)
./ci-agent --path /path/to/repo --out scan.json
curl -X POST http://localhost:8080/api/ci/snapshots \
  -H "Authorization: Bearer ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d @scan.json
```

## 📞 Support

- Documentation: `docs/`
- Architecture: `docs/architecture.md`
- Integration Guide: `docs/integration-guide.md`
