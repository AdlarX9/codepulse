# CodePulse Integration Guide

Complete guide for setting up all CodePulse integrations.

## Minimal Overview

- **GitHub App**: PR checks, webhooks (HMAC). Vars: `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`.
- **Stripe**: Plans, subscriptions, webhooks. Vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`.
- **Slack**: Weekly digest, alerts. Vars: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, `SLACK_REDIRECT_URI`.
- **CI/CD**: CI Agent docker usage + upload to API. Secrets: `CODEPULSE_TOKEN`, `CODEPULSE_ORG_ID`.
- **Email**: Postmark or SES. Vars: `POSTMARK_TOKEN` or AWS SES creds, `EMAIL_FROM_ADDR`.

## Table of Contents

1. [GitHub App Setup](#github-app-setup)
2. [Stripe Configuration](#stripe-configuration)
3. [Slack Integration](#slack-integration)
4. [CI/CD Setup](#cicd-setup)
5. [Email Configuration](#email-configuration)

---

## GitHub App Setup

### 1. Create GitHub App

Go to https://github.com/settings/apps/new

#### Basic Information

- **GitHub App name**: CodePulse Quality
- **Homepage URL**: https://codepulse.dev
- **Webhook URL**: https://api.codepulse.dev/api/github/webhook
- **Webhook secret**: Generate a secure random string

#### Permissions

**Repository permissions:**

- Checks: Read & write
- Contents: Read-only
- Pull requests: Read-only

**Subscribe to events:**

- [x] Check suite
- [x] Pull request
- [x] Installation
- [x] Installation repositories

#### Where can this app be installed?

- Any account

### 2. Generate Private Key

After creating the app:

1. Click "Generate a private key"
2. Download the `.pem` file
3. Convert to single-line format:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' your-app.pem
```

### 3. Set Environment Variables

```bash
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### 4. Install App

Users install via: `https://github.com/apps/codepulse-quality/installations/new`

---

## Stripe Configuration

### 1. Create Stripe Account

1. Sign up at https://dashboard.stripe.com
2. Get your API keys from https://dashboard.stripe.com/apikeys

### 2. Create Products & Prices

```bash
# Create Pro Plan
stripe products create \
  --name "CodePulse Pro" \
  --description "Professional plan for individuals and small teams"

# Create recurring price
stripe prices create \
  --product prod_XXX \
  --unit-amount 2900 \
  --currency usd \
  --recurring[interval]=month

# Repeat for Team and Enterprise
```

### 3. Configure Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api.codepulse.dev/api/billing/webhook`
3. Select events:
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`

### 4. Set Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_pro_...
STRIPE_PRICE_TEAM=price_team_...
STRIPE_PRICE_ENTERPRISE=price_enterprise_...
```

### 5. Test Mode

For development, use test keys:

```bash
STRIPE_SECRET_KEY=sk_test_...
```

Use test cards: https://stripe.com/docs/testing

---

## Slack Integration

### 1. Create Slack App

Go to https://api.slack.com/apps/new

#### Basic Information

- **App Name**: CodePulse
- **Development Slack Workspace**: Your workspace

#### OAuth & Permissions

**Scopes:**

- `chat:write` - Send messages
- `channels:read` - List channels

**Redirect URLs:**

- `https://api.codepulse.dev/api/integrations/slack/callback`

#### Interactivity

Enable if you want interactive notifications (future feature).

### 2. Set Environment Variables

```bash
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_REDIRECT_URI=https://api.codepulse.dev/api/integrations/slack/callback
```

### 3. Install to Workspace

Users connect via:

1. Navigate to org settings
2. Click "Connect Slack"
3. Authorize workspace
4. Select channel for notifications

---

## CI/CD Setup

### GitHub Actions Example

```yaml
name: CodePulse Scan

on:
    pull_request:
    push:
        branches: [main]

jobs:
    scan:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - name: Scan with CodePulse CI Agent
              run: |
                  docker run --rm \
                    -v ${{ github.workspace }}:/workspace \
                    ghcr.io/codepulse/ci-agent:latest \
                    --path /workspace \
                    --head-sha ${{ github.sha }} \
                    --exclude "node_modules/**,dist/**" \
                    --out /tmp/scan.json

            - name: Upload to CodePulse API
              env:
                  CODEPULSE_TOKEN: ${{ secrets.CODEPULSE_TOKEN }}
              run: |
                  curl -X POST https://api.codepulse.dev/api/ci/snapshots \
                    -H "Authorization: Bearer $CODEPULSE_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "$(cat /tmp/scan.json | jq -c '. + {
                      org_id: "${{ secrets.CODEPULSE_ORG_ID }}",
                      repository: "${{ github.repository }}",
                      commit_sha: "${{ github.sha }}",
                      pull_request: ${{ github.event.pull_request.number || null }}
                    }')"
```

### Required Secrets

Add to repository settings → Secrets:

- `CODEPULSE_TOKEN`: Org API token (from org settings)
- `CODEPULSE_ORG_ID`: Your organization UUID

### How PR Checks Work

1. PR opened/updated triggers GitHub webhook
2. CodePulse creates pending check run
3. CI agent scans code and uploads snapshot
4. API evaluates against quality policies
5. Check run updated with pass/fail status

---

## Email Configuration

### Option 1: Postmark (Recommended)

1. Sign up at https://postmarkapp.com
2. Create a server
3. Verify sender signature
4. Get server API token

```bash
POSTMARK_TOKEN=your_postmark_token
EMAIL_FROM_ADDR=noreply@codepulse.dev
```

### Option 2: AWS SES

1. Set up AWS SES in your region
2. Verify domain
3. Request production access (if needed)

```bash
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=your_access_key
AWS_SES_SECRET_ACCESS_KEY=your_secret_key
EMAIL_FROM_ADDR=noreply@codepulse.dev
```

### Email Templates

Located in `apps/api/internal/email/templates/`:

- `weekly-digest.html`
- `policy-violation.html`
- `invitation.html`

---

## Testing Integrations

### GitHub App

```bash
# Trigger test webhook
curl -X POST http://localhost:8080/api/github/webhook \
  -H "X-GitHub-Event: ping" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"zen":"Keep it logically awesome."}'
```

### Stripe

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:8080/api/billing/webhook
stripe trigger customer.subscription.created
```

### Slack

1. Create test workspace
2. Install app to workspace
3. Send test digest:

```bash
curl -X POST http://localhost:8080/api/test/slack-digest \
  -H "Authorization: Bearer your_token" \
  -d '{"org_id":"your-org-id"}'
```

---

## Troubleshooting

### GitHub Webhook Not Received

1. Check webhook URL is publicly accessible
2. Verify webhook secret matches
3. Check recent deliveries in GitHub App settings
4. Ensure HMAC signature verification passes

### Stripe Webhook Fails

1. Verify webhook secret
2. Check Stripe dashboard → Webhooks → Recent deliveries
3. Test with Stripe CLI locally first

### Slack Messages Not Sending

1. Verify OAuth token is saved correctly
2. Check channel permissions
3. Test with Slack API tester: https://api.slack.com/methods/chat.postMessage/test

### CI Agent Upload Fails

1. Verify API token is valid
2. Check org_id is correct
3. Ensure repository is linked to org
4. Review API logs for errors

---

## Security Checklist

- [ ] Rotate webhook secrets regularly
- [ ] Store secrets in environment variables, not code
- [ ] Use HTTPS for all endpoints
- [ ] Implement rate limiting
- [ ] Monitor for suspicious activity
- [ ] Encrypt sensitive data at rest
- [ ] Enable audit logging
- [ ] Use least-privilege access tokens

---

## Next Steps

After setup:

1. Create your first organization via API or web app
2. Connect GitHub App to repositories
3. Set up quality policies
4. Configure CI pipeline
5. Connect Slack for digests
6. Monitor dashboard for insights
