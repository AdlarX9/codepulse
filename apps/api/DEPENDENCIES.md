# API Dependencies

## Required Go Modules

After implementing the new features, you need to install the following Go dependencies:

```bash
cd apps/api

# Slug generation for organization URLs
go get github.com/gosimple/slug

# Stripe payment integration
go get github.com/stripe/stripe-go/v76
go get github.com/stripe/stripe-go/v76/checkout/session
go get github.com/stripe/stripe-go/v76/customer
go get github.com/stripe/stripe-go/v76/billingportal/session
go get github.com/stripe/stripe-go/v76/webhook

# JWT for GitHub App authentication
go get github.com/golang-jwt/jwt/v5

# Update all dependencies
go mod tidy
```

## Verification

After installing dependencies, verify the build:

```bash
go build ./cmd/server
```

## Running Migrations

For production, run the SQL migrations:

```bash
psql -U codepulse -d codepulse_production -f migrations/001_add_multi_tenant_models.sql
```

For development, AutoMigrate will handle schema changes automatically.
