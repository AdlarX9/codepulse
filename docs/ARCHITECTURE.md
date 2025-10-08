# 🏗️ Architecture - CodePulse

Architecture technique détaillée de CodePulse.

## Vue d'Ensemble

CodePulse est une application d'analyse de code **privacy-first** construite comme un monorepo moderne avec une séparation claire entre l'application desktop (Tauri/Rust) et l'application web (Next.js/React).

```
┌─────────────────────────────────────────────────────────────────┐
│                        CodePulse Monorepo                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Desktop App │  │   Web App   │  │  Packages   │              │
│  │  Tauri/Rust │  │ Next.js/TS  │  │   Shared    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Scanner   │  │     API     │  │   Scripts   │              │
│  │    Rust     │  │   Next.js   │  │   Build     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ PostgreSQL  │  │    Redis    │  │    Nginx    │              │
│  │  Analytics  │  │   Cache     │  │   Proxy     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture par Couche

### 1. Couche Présentation (Frontend)

#### Application Desktop
- **Framework** : Tauri 1.x (Rust + WebView)
- **UI** : React 18 + TypeScript + Vite
- **Styling** : Tailwind CSS
- **Charts** : Recharts
- **OS Support** : macOS, Windows, Linux

**Structure :**
```
apps/desktop/
├── src/                 # Frontend React
│   ├── components/      # Composants UI
│   ├── lib/            # Utilitaires
│   └── App.tsx         # Application principale
├── src-tauri/          # Backend Tauri
│   ├── src/            # Code Rust
│   └── icons/          # Icônes d'application
└── dist/               # Build de production
```

#### Application Web
- **Framework** : Next.js 14 (App Router)
- **Runtime** : Edge Runtime (API Routes)
- **UI** : React 18 + TypeScript
- **Styling** : Tailwind CSS + CSS Modules
- **Database** : Supabase (PostgreSQL)

**Structure :**
```
apps/web/
├── src/app/            # Pages et API (App Router)
│   ├── api/           # API Routes Next.js
│   ├── admin/         # Dashboard admin
│   └── page.tsx       # Landing page
├── src/components/     # Composants partagés
└── public/            # Assets statiques
```

### 2. Couche Métier (Backend)

#### Scanner Rust (Desktop)
Moteur d'analyse ultra-performant écrit en Rust avec parallélisation.

**Fonctionnalités :**
- **Analyse syntaxique** : Détection précise du langage
- **Comptage avancé** : Lignes de code, commentaires, lignes vides
- **Parallélisation** : Traitement multi-threads avec Rayon
- **Filtrage** : Exclusion des fichiers générés et caches
- **Performance** : 10k fichiers en ~2-3 secondes

**Architecture interne :**
```
src-tauri/src/scanner/
├── mod.rs              # Module principal
├── language.rs         # Détection de langage
├── counter.rs          # Comptage des lignes
└── filter.rs           # Filtres d'exclusion
```

**Algorithme de scan :**
1. **Découverte récursive** avec `walkdir`
2. **Filtrage** des fichiers (taille, extension, patterns)
3. **Détection de langage** par extension + contenu
4. **Analyse parallèle** par chunks de fichiers
5. **Agrégation** des statistiques par langage

#### API Web (Next.js)
API REST construite avec Next.js API Routes.

**Endpoints principaux :**
- `GET /api/download` : Tracking téléchargements
- `GET /api/export` : Export données projets
- `GET /api/admin/stats` : Analytics dashboard
- `POST /api/github/webhook` : Intégration GitHub

**Technologies :**
- **Runtime** : Edge Runtime (optimisé, serverless)
- **Database** : Supabase avec Row Level Security
- **Validation** : Zod schemas
- **Sécurité** : Rate limiting, CORS, HTTPS uniquement

### 3. Couche Données

#### Base de Données (Supabase/PostgreSQL)
Stockage des analytics de téléchargement uniquement.

**Tables principales :**
```sql
downloads {
  id UUID PRIMARY KEY
  ip_hash TEXT        -- SHA-256 anonymisé
  country TEXT        -- Code pays
  region TEXT         -- Région géographique
  city TEXT          -- Ville
  user_agent TEXT     -- Client navigateur
  referrer TEXT       -- URL référente
  platform TEXT       -- mac/win/linux
  version TEXT        -- Version téléchargée
  created_at TIMESTAMPTZ
}
```

**Sécurité :**
- **RLS activé** : Accès restreint par policies
- **Anonymisation** : IPs hashées avec salt
- **Rétention** : Données supprimées après 1 an

#### Cache (Redis)
Utilisé pour les sessions admin et métriques temporaires.

### 4. Couche Infrastructure

#### Scripts d'Automatisation
Collection de scripts pour le développement et déploiement.

```
scripts/
├── build-tauri.sh      # Build desktop
├── build_all.sh        # Build complet
├── create-dev-icons.sh # Génération icônes dev
├── dev.sh             # Setup développement
└── launch-*.sh        # Lanceurs rapides
```

#### CI/CD (GitHub Actions)
Automatisation complète du développement au déploiement.

**Workflows :**
- **Release** : Build et release sur tags
- **Web Deploy** : Déploiement automatique web
- **Tests** : Vérifications sur chaque PR

## Flux de Données

### Analyse de Code (Desktop)
```
Fichier utilisateur → Scanner Rust → Analyse → UI React → Export
     ↓                     ↓           ↓        ↓         ↓
Sélection dossier → WalkDir +   → Langage +  → Charts + → CSV/
                  Rayon       Comptage    Stats     JSON
```

### Téléchargement (Web)
```
Utilisateur → Download API → Tracking → Redirection → Analytics
    ↓            ↓            ↓           ↓           ↓
Click lien → Validation +  Headers → Hash IP +  → Asset URL + → Supabase
           Géolocalisation  Anonyme   Salt         Stockage
```

### Dashboard Admin (Web)
```
Admin → Auth → Stats API → Database → Analytics → Charts
  ↓      ↓       ↓         ↓         ↓         ↓
Login → Basic  Supabase  PostgreSQL  JSON    Recharts
      HTTP     Queries   RLS        Export
```

## Sécurité

### Privacy by Design
- **Analyse locale** : Aucun code n'est envoyé sur internet
- **Pas de télémetry** : Zéro tracking utilisateur
- **Données minimisées** : Seules métriques géographiques anonymes
- **Open Source** : Code auditable par la communauté

### Sécurité Technique
- **HTTPS obligatoire** : Certificats TLS 1.3
- **Headers sécurisés** : CSP, HSTS, etc.
- **Input validation** : Zod schemas sur toutes les entrées
- **SQL injection** : Paramètres préparés uniquement
- **XSS protection** : Échappement automatique

## Performance

### Optimisations Backend
- **Rust scanner** : ~50x plus rapide que JavaScript équivalent
- **Parallélisation** : Traitement multi-coeurs
- **Streaming** : Pas de chargement complet en mémoire
- **Caching** : Métriques pré-calculées

### Optimisations Frontend
- **Code splitting** : Next.js automatique
- **Image optimization** : WebP et formats modernes
- **Bundle analysis** : Outils intégrés de mesure
- **Lazy loading** : Composants chargés à la demande

## Déploiement

### Environnements
- **Développement** : `localhost` avec hot reload
- **Production** : Déploiement serverless optimisé

### Stratégie de Déploiement
- **Desktop** : Releases GitHub avec signatures
- **Web** : Vercel/Netlify avec edge functions
- **Database** : Supabase géré

## Tests

### Stratégie de Test
- **Unitaires** : Rust tests pour le scanner
- **Intégration** : Tests API avec Supabase
- **E2E** : Tests utilisateurs sur apps
- **Performance** : Benchmarks scanner Rust

### Outils de Test
- **Rust** : Tests intégrés avec `cargo test`
- **TypeScript** : Vérification de types stricte
- **Build** : Tests de compilation complète

## Monitoring

### Métriques Collectées
- **Downloads** : Par plateforme, pays, version
- **Performance** : Temps de scan, taille des projets
- **Erreurs** : Logs structurés et alerting

### Outils de Monitoring
- **Logs** : Console structurée (development)
- **Analytics** : Dashboard admin intégré
- **Alerting** : GitHub Issues pour erreurs critiques

---

📖 **Voir aussi** : [Guide de développement](development.md) • [API Reference](api-reference.md)

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
