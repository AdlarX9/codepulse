# Architecture Guide

CodePulse system architecture and design decisions.

## 🏗 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Desktop App   │    │    Web App      │    │   Nginx Proxy   │
│                 │    │                 │    │                 │
│  Tauri + React  │    │    Next.js      │    │  SSL + Routing  │
│     (Rust)      │    │  (TypeScript)   │    │   (Rate Limit)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Go API        │
                    │                 │
                    │  Gin Framework  │
                    │  JWT + CORS     │
                    └─────────────────┘
                             │
                ┌─────────────────────────────┐
                │                             │
     ┌─────────────────┐           ┌─────────────────┐
     │   PostgreSQL    │           │     Redis       │
     │                 │           │                 │
     │   Primary DB    │           │ Cache + Session │
     │   ACID + JSONB  │           │   Pub/Sub       │
     └─────────────────┘           └─────────────────┘
```

## 🔧 Technology Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL 15 (primary)
- **Cache**: Redis 7 (sessions, cache)
- **Auth**: JWT tokens
- **ORM**: GORM (with raw SQL for complex queries)

### Frontend
- **Web**: Next.js 14 (React, TypeScript)
- **Desktop**: Tauri + React + TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context + Hooks

### Infrastructure  
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (SSL termination)
- **Deployment**: Self-hosted VPS
- **Monitoring**: Built-in health checks

## 📁 Project Structure

```
code-pulse/
├── 🐳 Infrastructure
│   ├── compose.yaml              # Production stack
│   ├── compose.dev.yaml          # Development stack
│   ├── nginx/                    # Reverse proxy config
│   └── certs/                    # SSL certificates
│
├── 🚀 Applications
│   ├── apps/api/                 # Go REST API
│   │   ├── cmd/server/           # Main application
│   │   ├── internal/
│   │   │   ├── config/           # Configuration
│   │   │   ├── database/         # DB connection
│   │   │   ├── handlers/         # HTTP handlers
│   │   │   ├── middleware/       # Auth, CORS, etc.
│   │   │   └── models/           # Data models
│   │   └── migrations/           # SQL migrations
│   │
│   ├── apps/web/                 # Next.js web app
│   │   ├── src/app/              # App router
│   │   ├── src/components/       # React components
│   │   └── src/lib/              # Utilities
│   │
│   └── apps/desktop/             # Tauri desktop app
│       ├── src/                  # React frontend
│       └── src-tauri/            # Rust backend
│
└── 📚 Documentation & Scripts
    ├── docs/                     # Documentation
    ├── setup_dev.sh             # Dev environment
    ├── setup_prod.sh            # Production setup
    └── codepulse.sh             # Management script
```

## 🔄 Data Flow

### Scan Process
```
1. Desktop App scans code directory
2. Calculates statistics (no code sent)
3. Sends aggregated data to API
4. API validates and stores in PostgreSQL
5. Web dashboard displays analytics
```

### Authentication
```
1. User registers/logs in via web/desktop
2. API generates JWT token
3. Token stored in browser/desktop app
4. All requests include Authorization header
5. Middleware validates token on each request
```

## 🗄 Database Design

### Core Tables

**users** - User accounts
```sql
id          UUID PRIMARY KEY
email       VARCHAR UNIQUE NOT NULL
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

**profiles** - User profiles  
```sql
user_id      UUID PRIMARY KEY → users(id)
handle       VARCHAR UNIQUE NOT NULL
display_name VARCHAR
visibility   ENUM('private', 'public')
```

**projects** - Code projects
```sql
id               UUID PRIMARY KEY
user_id          UUID → users(id)
project_key_hash VARCHAR NOT NULL
name             VARCHAR
visibility       ENUM('private', 'public')
```

**scans** - Code analysis results
```sql
id             UUID PRIMARY KEY
project_id     UUID → projects(id)
total          INTEGER NOT NULL
code           INTEGER NOT NULL
comment        INTEGER NOT NULL
blank          INTEGER NOT NULL
comment_ratio  FLOAT NOT NULL
created_at     TIMESTAMP
```

**scan_langs** - Language breakdown
```sql
scan_id   UUID → scans(id)
language  VARCHAR NOT NULL
files     INTEGER NOT NULL
code      INTEGER NOT NULL
PRIMARY KEY (scan_id, language)
```

### Relationships
- One user → many projects
- One project → many scans
- One scan → many language stats

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_scans_project_id ON scans(project_id);
CREATE INDEX idx_scans_created_at ON scans(created_at);
CREATE INDEX idx_scan_langs_language ON scan_langs(language);
```

## 🔐 Security Architecture

### Authentication Flow
1. **Registration**: Email + password → JWT token
2. **Login**: Credentials → JWT token  
3. **Request**: JWT in Authorization header
4. **Validation**: Middleware checks token signature

### Authorization Levels
- **Public**: Health checks, public profiles
- **Authenticated**: Own projects and scans
- **Admin**: System management (future)

### Data Protection
- **Passwords**: Bcrypt hashing
- **JWT**: HS256 with secret key
- **HTTPS**: TLS 1.2+ in production
- **CORS**: Restricted origins
- **Rate Limiting**: Per-IP limits

### Privacy Measures
- **No Code Storage**: Only aggregated statistics
- **User Consent**: Opt-in data collection
- **Data Minimization**: Store only necessary data
- **Right to Delete**: User can delete all data

## 🚀 Performance Optimizations

### Database
- **Connection Pooling**: Max 100 connections
- **Query Optimization**: Proper indexes
- **JSONB**: Efficient JSON storage
- **Prepared Statements**: SQL injection prevention

### Caching Strategy
- **Redis**: Session storage, API responses
- **Browser**: Static assets, API responses
- **CDN**: Future enhancement for global reach

### API Performance
- **Gin Framework**: High-performance HTTP router
- **Compression**: Gzip responses
- **Keep-Alive**: Connection reuse
- **Pagination**: Limit large result sets

## 🔄 Development Workflow

### Hot Reload Setup
- **API**: Air tool monitors Go files
- **Web**: Next.js dev server with fast refresh
- **Database**: Docker with persistent volumes
- **Nginx**: Development proxy configuration

### Build Process
- **Go API**: Multi-stage Docker build
- **Next.js**: Static optimization
- **Desktop**: Tauri cross-compilation
- **Images**: Layer optimization

## 📊 Monitoring & Observability

### Health Checks
```json
GET /health
{
  "status": "healthy",
  "services": {
    "postgres": "healthy",
    "redis": "healthy"
  },
  "version": "1.0.0"
}
```

### Logging Strategy
- **Structured Logs**: JSON format
- **Log Levels**: Error, Warning, Info, Debug
- **Request Tracing**: Unique request IDs
- **Performance Metrics**: Response times

### Error Handling
- **Graceful Degradation**: Continue without Redis
- **Circuit Breakers**: Prevent cascade failures
- **Retry Logic**: Transient failure recovery
- **User-Friendly Errors**: Clear error messages

## 🔮 Future Enhancements

### Scalability
- **Horizontal Scaling**: Multiple API instances
- **Database Sharding**: User-based partitioning
- **CDN Integration**: Global content delivery
- **Microservices**: Service decomposition

### Features
- **Real-time Updates**: WebSocket connections
- **Team Collaboration**: Multi-user projects  
- **Advanced Analytics**: Trend analysis
- **Mobile Apps**: iOS/Android clients

### Observability
- **Metrics Collection**: Prometheus integration
- **Distributed Tracing**: Request flow tracking
- **Alerting**: Automated incident response
- **Dashboard**: Grafana visualizations

## 🛠 Development Guidelines

### Code Organization
- **Clean Architecture**: Separation of concerns
- **Dependency Injection**: Testable components
- **Interface Segregation**: Minimal interfaces
- **Error Wrapping**: Context preservation

### Testing Strategy
- **Unit Tests**: Pure functions
- **Integration Tests**: API endpoints
- **E2E Tests**: User workflows
- **Performance Tests**: Load testing

### Git Workflow
- **Feature Branches**: Isolated development
- **Code Reviews**: Peer validation
- **Automated Testing**: CI/CD pipeline
- **Semantic Versioning**: Clear releases
