# 🚀 Performance Optimizations

## Frontend Optimizations

### 1. React Performance

#### Debouncing

```typescript
import { useDebounce } from '@/hooks/useDebounce'

// Debounce search input to prevent excessive API calls
const debouncedSearch = useDebounce(searchTerm, 500)
```

#### Virtualization

```typescript
import { useVirtualList } from '@/hooks/useVirtualList'

// Virtualize long lists (1000+ items)
const { visibleItems, totalHeight, offsetY, handleScroll } = useVirtualList(items.length, {
	itemHeight: 50,
	containerHeight: 600
})
```

#### Local Storage Persistence

```typescript
import { useLocalStorage } from '@/hooks/useLocalStorage'

// Persist UI state across sessions
const [settings, setSettings] = useLocalStorage('user-settings', defaultSettings)
```

### 2. Code Splitting

**Lazy Loading Components**:

```typescript
import { lazy, Suspense } from 'react'

const DashboardLayout = lazy(() => import('./components/dashboards/DashboardLayout'))
const GamificationSidebar = lazy(() => import('./components/gamification/GamificationSidebar'))

// Usage
<Suspense fallback={<LoadingSpinner />}>
  <DashboardLayout />
</Suspense>
```

### 3. Memoization

**React.memo for expensive components**:

```typescript
export default React.memo(ExpensiveComponent, (prev, next) => {
	return prev.data === next.data
})
```

**useMemo for expensive calculations**:

```typescript
const sortedData = useMemo(() => {
	return data.sort((a, b) => b.value - a.value)
}, [data])
```

### 4. Image Optimization

- Use WebP format when possible
- Lazy load images below the fold
- Use appropriate image sizes (no oversized images)

---

## Backend Optimizations

### 1. Database Indexes

**Critical indexes** (already in migrations):

```sql
-- Commit scans
CREATE INDEX idx_commit_scans_project ON commit_scans(project_id);
CREATE INDEX idx_commit_scans_sha ON commit_scans(commit_sha);
CREATE INDEX idx_commit_scans_date ON commit_scans(commit_date);

-- Collaborators
CREATE INDEX idx_collaborators_project ON collaborators(project_id);
CREATE INDEX idx_collaborators_user ON collaborators(user_id);

-- Challenges
CREATE INDEX idx_challenges_user ON challenges(user_id);
CREATE INDEX idx_challenges_status ON challenges(status);
```

### 2. Query Optimization

**Use LIMIT for large datasets**:

```go
db.DB.Where("user_id = ?", userID).
    Order("created_at DESC").
    Limit(50).
    Find(&commits)
```

**Preload related data**:

```go
db.DB.Preload("CommitScans").
    Preload("Collaborators").
    Find(&project)
```

### 3. Caching Strategy

**In-memory cache for frequent queries**:

```go
// Cache user streaks (15 min TTL)
type StreakCache struct {
    mu    sync.RWMutex
    data  map[string]*Streak
    ttl   map[string]time.Time
}
```

---

## Git Operations Optimization

### 1. Incremental Sync

Only fetch new commits since last known SHA:

```typescript
const newCommits = await getCommitsSince(projectPath, lastKnownSha)
```

### 2. Background Processing

Run Git sync in background worker:

```typescript
const worker = new GitSyncWorker(15) // 15 min interval
worker.start()
```

### 3. Parallel Processing

Process multiple projects concurrently:

```typescript
await Promise.all(projects.map(p => syncProject(p.id)))
```

---

## Tauri/Rust Optimizations

### 1. Async Commands

All heavy operations are async:

```rust
#[tauri::command]
async fn git_get_commits(path: String, limit: usize) -> Result<Vec<GitCommitInfo>, String>
```

### 2. Rayon for Parallel Processing

Scanner uses rayon for parallel file processing:

```rust
use rayon::prelude::*;

files.par_iter().for_each(|file| {
    // Process file in parallel
})
```

### 3. Memory Management

- Use streaming for large files
- Drop unused data early
- Avoid cloning large structures

---

## Monitoring & Profiling

### 1. Frontend

**React DevTools Profiler**:

- Identify slow renders
- Measure component performance
- Track unnecessary re-renders

**Browser Performance API**:

```typescript
const start = performance.now()
// ... operation
const duration = performance.now() - start
console.log(`Operation took ${duration}ms`)
```

### 2. Backend

**Database query logging**:

```go
db.DB.Debug() // Log all queries
```

**Gin middleware for request timing**:

```go
router.Use(gin.Logger())
```

---

## Bundle Size Optimization

### Current Bundle Sizes (estimated)

- Main bundle: ~500KB (gzipped)
- Vendor bundle: ~200KB (gzipped)
- Total initial load: ~700KB

### Optimization Targets

- [ ] Reduce main bundle to <400KB
- [ ] Implement code splitting for dashboards
- [ ] Tree-shake unused exports
- [ ] Use dynamic imports for heavy libraries

---

## Recommended Production Settings

### Frontend (Vite)

```typescript
export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					'react-vendor': ['react', 'react-dom'],
					'chart-vendor': ['recharts'],
					'ui-vendor': ['lucide-react']
				}
			}
		},
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true
			}
		}
	}
})
```

### Backend (Go)

```bash
# Build with optimizations
go build -ldflags="-s -w" -o codepulse-api

# Enable CPU profiling in production
go tool pprof http://localhost:8080/debug/pprof/profile
```

### Rust (Tauri)

```toml
[profile.release]
opt-level = "z"      # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
strip = true        # Strip symbols
```

---

## Performance Benchmarks

### Target Metrics

- **Initial load**: < 2s
- **Dashboard switch**: < 100ms
- **API response**: < 200ms (p95)
- **Git operations**: < 500ms for 100 commits
- **Scan 10K files**: < 5s

### Monitoring

- Implement performance monitoring in production
- Track Core Web Vitals (LCP, FID, CLS)
- Monitor backend response times
- Alert on performance regressions
