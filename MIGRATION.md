# 🔄 Migration Guide

**CodePulse v2.0 - Complete Architecture Refactor**

This document outlines the migration from the previous Supabase/Vercel architecture to the new self-hosted solution.

## 🎯 What Changed

### Before (v1.x)
- **API**: Next.js API routes
- **Database**: Supabase (managed PostgreSQL)
- **Hosting**: Vercel
- **Auth**: Supabase Auth
- **Dependencies**: External services

### After (v2.0)
- **API**: Go with Gin framework
- **Database**: Self-hosted PostgreSQL + Redis
- **Hosting**: Docker on VPS
- **Auth**: JWT tokens
- **Dependencies**: Fully self-contained

## 🚀 Migration Process

### 1. Data Export (from Supabase)

**Export your existing data:**
```sql
-- Users
COPY users TO '/tmp/users.csv' DELIMITER ',' CSV HEADER;

-- Projects  
COPY projects TO '/tmp/projects.csv' DELIMITER ',' CSV HEADER;

-- Scans
COPY scans TO '/tmp/scans.csv' DELIMITER ',' CSV HEADER;

-- Language stats
COPY scan_langs TO '/tmp/scan_langs.csv' DELIMITER ',' CSV HEADER;
```

### 2. New Installation

**Set up the new environment:**
```bash
# Clone the refactored version
git clone <repository>
cd code-pulse

# Setup development environment
./setup_dev.sh

# Or production environment
sudo ./setup_prod.sh
```

### 3. Data Import

**Import your data:**
```bash
# Access database
./codepulse.sh shell db

# Import data (adjust paths accordingly)
\COPY users FROM '/tmp/users.csv' DELIMITER ',' CSV HEADER;
\COPY projects FROM '/tmp/projects.csv' DELIMITER ',' CSV HEADER;
\COPY scans FROM '/tmp/scans.csv' DELIMITER ',' CSV HEADER;
\COPY scan_langs FROM '/tmp/scan_langs.csv' DELIMITER ',' CSV HEADER;
```

### 4. Desktop App Update

**Update desktop applications:**
- Download new version from releases
- Existing projects will continue to work
- Re-authentication required (new JWT system)

## 🔧 Configuration Changes

### Environment Variables

**Old (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**New (.env):**
```bash
# Database
DB_HOST=postgres
DB_PASSWORD=secure_password
DB_NAME=codepulse

# Security
JWT_SECRET=your_jwt_secret
REDIS_PASSWORD=redis_password

# Domain
DOMAIN=your-domain.com
```

### API Endpoints

**Mapping old to new endpoints:**

| Old (Next.js) | New (Go API) | Notes |
|---|---|---|
| `/api/sync/scan` | `/v1/sync/scan` | Same payload format |
| `/api/me/projects` | `/v1/me/projects` | Same response format |
| `/api/auth/*` | `/v1/auth/*` | New JWT-based auth |

## 🔄 Breaking Changes

### Authentication
- **Old**: Supabase Auth with magic links
- **New**: Email/password with JWT tokens
- **Action**: Users need to register again

### API Structure
- **Old**: Next.js API routes
- **New**: RESTful Go API with versioning
- **Action**: Update any custom integrations

### Database Schema
- **Old**: Supabase schema with RLS
- **New**: Standard PostgreSQL with application-level security
- **Action**: Data migration required

## 🔒 Security Improvements

### Enhanced Security Features
- **JWT Authentication**: More control over tokens
- **Rate Limiting**: Built-in protection
- **HTTPS Everywhere**: Mandatory SSL/TLS
- **Security Headers**: HSTS, CSP, XSS protection
- **Fail2ban Ready**: Automatic IP blocking

### Privacy Enhancements
- **Self-Hosted**: Complete data control
- **No Third-Party**: Eliminates external dependencies
- **Local Processing**: Data never leaves your infrastructure

## 📊 Performance Improvements

### Backend Performance
- **Go API**: 5-10x faster than Node.js
- **Connection Pooling**: Optimized database connections
- **Redis Caching**: Reduced database load
- **Nginx**: Optimized reverse proxy

### Frontend Optimizations
- **Static Generation**: Improved loading times
- **Asset Optimization**: Smaller bundle sizes
- **CDN Ready**: Future enhancement support

## 🛠 Troubleshooting

### Common Migration Issues

**Database Connection Errors:**
```bash
# Check database status
./codepulse.sh status dev

# Restart database
docker-compose restart postgres
```

**Authentication Issues:**
```bash
# Verify JWT secret is set
grep JWT_SECRET .env

# Check API logs
./codepulse.sh logs dev | grep auth
```

**Data Import Problems:**
```bash
# Check data format
head -5 /tmp/users.csv

# Validate schema
./codepulse.sh shell db
\d users
```

### Performance Issues

**Slow API Responses:**
```bash
# Check resource usage
docker stats

# Monitor database
./codepulse.sh shell db
SELECT * FROM pg_stat_activity;
```

**High Memory Usage:**
```bash
# Adjust PostgreSQL settings
# Edit compose.yaml - postgres service
# Add: command: postgres -c shared_buffers=256MB
```

## 🔮 Future Migration Path

### Automated Migration Tool (Planned)
```bash
# Future migration utility
./migrate-from-supabase.sh \
  --supabase-url="..." \
  --supabase-key="..." \
  --output-format="sql"
```

### Rollback Strategy

**If migration fails:**
1. Keep old environment running
2. Export data from new system
3. Restore to previous state
4. Report issues for resolution

## 📞 Migration Support

### Getting Help
- **Documentation**: Check `/docs` folder
- **Issues**: Create GitHub issue with migration tag
- **Logs**: Always include system logs
- **Environment**: Specify dev/prod setup

### Pre-Migration Checklist
- [ ] Backup existing data
- [ ] Test new environment
- [ ] Document custom configurations
- [ ] Plan downtime window
- [ ] Inform users of changes
- [ ] Prepare rollback plan

### Post-Migration Checklist
- [ ] Verify all data migrated
- [ ] Test core functionality
- [ ] Update desktop apps
- [ ] Monitor system performance
- [ ] Update documentation
- [ ] Train team on new system

## 🎉 Benefits After Migration

### Operational Benefits
- **Full Control**: Complete ownership of data and infrastructure
- **Cost Reduction**: No monthly SaaS fees
- **Performance**: Significantly faster response times
- **Reliability**: No external service dependencies

### Technical Benefits
- **Scalability**: Easy horizontal scaling
- **Customization**: Full codebase control
- **Security**: Enhanced privacy and security measures
- **Monitoring**: Built-in observability tools

### Business Benefits
- **Independence**: No vendor lock-in
- **Compliance**: Easier regulatory compliance
- **Customization**: Tailored to specific needs
- **Longevity**: Sustainable long-term solution

---

**Need help with migration?** Check the troubleshooting section or create an issue with detailed logs.
