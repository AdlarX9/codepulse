# 📡 CodePulse API Endpoints (Refonte)

## 🔐 Authentication

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {token}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer {token}
```

---

## 👤 User Profile

### Get Profile

```http
GET /api/me/profile
Authorization: Bearer {token}
```

### Update Profile

```http
PATCH /api/me/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "handle": "myusername",
  "display_name": "My Name",
  "bio": "Developer and creator",
  "avatar_url": "https://...",
  "visibility": "public"
}
```

### Check Handle Availability

```http
GET /api/me/profile/check-handle?handle=myusername
Authorization: Bearer {token}
```

### Delete Account

```http
DELETE /api/me/account
Authorization: Bearer {token}
```

---

## 📁 Projects

### List Projects

```http
GET /api/me/projects
Authorization: Bearer {token}
```

### Create Project

```http
POST /api/me/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "visibility": "private",
  "settings": {
    "excluded_dirs": ["node_modules", ".git"],
    "excluded_extensions": [".log"],
    "follow_symlinks": false
  }
}
```

### Get Project

```http
GET /api/me/projects/{project_id}
Authorization: Bearer {token}
```

### Get Project Details (with stats)

```http
GET /api/me/projects/{project_id}/details
Authorization: Bearer {token}
```

### Update Project

```http
PATCH /api/me/projects/{project_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "visibility": "public"
}
```

### Delete Project

```http
DELETE /api/me/projects/{project_id}
Authorization: Bearer {token}
```

---

## 🔗 Git Integration (NEW)

### Link Git Repository to Project

```http
PATCH /api/me/projects/{project_id}/git
Authorization: Bearer {token}
Content-Type: application/json

{
  "git_repo_url": "https://github.com/user/repo.git",
  "git_provider": "github"
}
```

### Unlink Git Repository

```http
DELETE /api/me/projects/{project_id}/git
Authorization: Bearer {token}
```

### Get Commit Scans

```http
GET /api/me/projects/{project_id}/commits?limit=50
Authorization: Bearer {token}
```

### Sync New Commit

```http
POST /api/me/projects/{project_id}/commits/sync
Authorization: Bearer {token}
Content-Type: application/json

{
  "commit_sha": "abc123def456",
  "branch": "main",
  "commit_message": "Add new feature",
  "commit_author": "John Doe",
  "commit_date": "2025-10-20T12:00:00Z",
  "files_changed": 5,
  "lines_added": 120,
  "lines_deleted": 30,
  "languages": {
    "JavaScript": {
      "files": 3,
      "total": 500,
      "code": 400,
      "comment": 50,
      "blank": 50,
      "lines_added": 80,
      "lines_deleted": 20
    }
  },
  "median_lines": 125.5,
  "gap_lines": 45.2
}
```

### Get Collaborators

```http
GET /api/me/projects/{project_id}/collaborators
Authorization: Bearer {token}
```

---

## 🎮 Gamification (NEW)

### Get User Streaks

```http
GET /api/me/streaks
Authorization: Bearer {token}

Response:
{
  "current_streak": 7,
  "longest_streak": 14,
  "last_activity_date": "2025-10-20T10:00:00Z",
  "total_commit_scans": 42
}
```

### Get User Badges

```http
GET /api/me/badges
Authorization: Bearer {token}

Response:
{
  "badges": ["first_commit", "7_day_streak", "100_commits"],
  "count": 3
}
```

### Get Challenges

```http
GET /api/me/challenges?status=active
Authorization: Bearer {token}

# status: active, completed, failed, expired, all
```

### Create Challenge

```http
POST /api/me/challenges
Authorization: Bearer {token}
Content-Type: application/json

{
  "project_id": "uuid-optional",
  "type": "weekly_commits",
  "title": "Commit 5 times this week",
  "description": "Stay consistent with your coding",
  "target": {
    "commits": 5
  },
  "duration_days": 7
}
```

### Update Challenge Progress

```http
PATCH /api/me/challenges/{challenge_id}/progress
Authorization: Bearer {token}
Content-Type: application/json

{
  "progress": {
    "commits": 3
  }
}
```

### Complete Challenge

```http
POST /api/me/challenges/{challenge_id}/complete
Authorization: Bearer {token}
```

---

## 📊 Scans (Legacy - kept for backward compatibility)

### Create Snapshot (Manual Scan)

```http
POST /api/me/projects/{project_id}/snapshot
Authorization: Bearer {token}
Content-Type: application/json

{
  "device_id": "my-device",
  "version_tag": "v1.0.0",
  "totals": {
    "total": 10000,
    "code": 7000,
    "comment": 1500,
    "blank": 1500
  },
  "per_language": [
    {
      "language": "JavaScript",
      "files": 50,
      "total": 5000,
      "code": 3500,
      "comment": 750,
      "blank": 750
    }
  ]
}
```

### Sync Scan (Desktop app)

```http
POST /api/sync/scan
Authorization: Bearer {token}
```

---

## 📈 Statistics

### Get Project Stats

```http
GET /api/stats/projects/{project_id}?window=30d
Authorization: Bearer {token}

# window: 7d, 30d, 90d
```

---

## 🖼️ Open Graph

### Generate Project OG Image

```http
GET /api/og/project/{project_id}?handle=username

# Public endpoint for social media previews
```

---

## 🔄 GitHub Integration

### Webhook Handler

```http
POST /api/github/webhook
X-Hub-Signature-256: {signature}
X-GitHub-Event: {event_type}
```

### Installation Callback

```http
GET /api/github/install/callback?installation_id={id}&setup_action={action}
```

---

## 🌐 Public Routes

### Get Public Project

```http
GET /api/u/{handle}/{project_id}

# Public project view
```

---

## 📤 Export

### Export Project Data

```http
GET /api/export?project_id={id}&format=json
Authorization: Bearer {token}

# format: json, csv (handled by frontend in refonte)
```

---

## 🏥 Health

### Health Check

```http
GET /health

Response:
{
  "status": "ok",
  "version": "2.0.0",
  "database": "connected"
}
```

---

## 📝 Notes

### Removed Endpoints (Enterprise features)

- ❌ `/api/orgs/*` - Organizations
- ❌ `/api/billing/*` - Stripe billing
- ❌ `/api/integrations/*` - Slack/Email
- ❌ `/api/ci/*` - CI agent
- ❌ `/api/ws/*` - WebSocket
- ❌ `/api/stats/repos/*` - Repository stats

### New in Refonte v2

- ✅ Git integration endpoints
- ✅ Gamification (streaks, badges, challenges)
- ✅ Commit-based scans (CommitScan model)
- ✅ Collaborator tracking
- ✅ Premium user support (field added)

### Migration Path

1. Legacy `Scan` model kept for backward compatibility
2. New projects should use `CommitScan` via Git sync
3. Manual scans still supported for non-Git projects
