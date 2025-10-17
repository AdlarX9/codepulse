# CodePulse Plans & Quotas

## Plan Tiers

### Free

- **Price**: $0/month
- **Seats**: 1
- **Projects**: Up to 3
- **Scans history**: 90 days
- **Repositories**: 3
- **Policies**: 1 org-level policy
- **PR Checks**: ❌
- **Slack/Email Digest**: ❌
- **Support**: Community

### Pro

- **Price**: $29/user/month
- **Seats**: 1-5
- **Projects**: Unlimited
- **Scans history**: 365 days
- **Repositories**: Unlimited
- **Policies**: 5 (org/repo level)
- **PR Checks**: ✅ Soft mode (warnings)
- **Slack/Email Digest**: ✅ Weekly
- **Support**: Email

### Team

- **Price**: $99/month (up to 10 users) + $10/additional user
- **Seats**: 10+ (scalable)
- **Projects**: Unlimited
- **Scans history**: Unlimited
- **Repositories**: Unlimited
- **Policies**: Unlimited
- **PR Checks**: ✅ Hard mode (blocking)
- **Slack/Email Digest**: ✅ Configurable frequency
- **Support**: Priority email + Slack channel

### Enterprise

- **Price**: Custom
- **Seats**: Unlimited
- **Projects**: Unlimited
- **Scans history**: Unlimited
- **Repositories**: Unlimited
- **Policies**: Unlimited
- **PR Checks**: ✅ Hard mode + custom rules
- **Slack/Email Digest**: ✅ Custom
- **SSO/SAML**: ✅
- **On-premise option**: ✅
- **SLA**: 99.9%
- **Support**: Dedicated account manager

## Quota Enforcement

### Data Retention

Enforced at query level:

```go
// Example: Free plan - 90 days retention
query := db.Where("created_at >= ?", time.Now().AddDate(0, 0, -90))
```

### Policy Limits

- Free: 1 org-level policy
- Pro: 5 policies (org/repo scopes)
- Team/Enterprise: Unlimited

### PR Checks

- Free: No PR checks
- Pro: Soft mode only (warnings, non-blocking)
- Team+: Hard mode available (blocking PRs)

### API Rate Limits

- Free: 100 requests/hour
- Pro: 1,000 requests/hour
- Team: 10,000 requests/hour
- Enterprise: Custom

## Feature Flags

Implemented in code:

```go
func CanUsePRChecks(subscription *models.Subscription) bool {
    return subscription.Plan != "free"
}

func CanUseHardMode(subscription *models.Subscription) bool {
    return subscription.Plan == "team" || subscription.Plan == "enterprise"
}

func GetRetentionDays(subscription *models.Subscription) int {
    switch subscription.Plan {
    case "free":
        return 90
    case "pro":
        return 365
    default:
        return 0 // unlimited
    }
}
```

## Billing Workflow

1. User creates organization (starts with Free plan)
2. User upgrades via Stripe Checkout
3. Webhook updates `subscriptions` table
4. Features unlocked immediately
5. Seat count enforced at invitation time

## Upgrade Prompts

Show upgrade prompts when:

- User tries to create 4th project (Free limit)
- User tries to enable PR checks on Free
- User tries to create more than 1 policy on Free
- User views data older than retention limit

## Add-ons (Future)

### AI Docs Assistant

- Price: $49/month per org
- Features:
    - AI-powered documentation suggestions
    - PR comment generation
    - Local inference (privacy preserved)
