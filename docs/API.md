# API Documentation

CodePulse REST API built with Go and Gin framework.

## 🔗 Base URL

- **Development**: `http://localhost:8080`
- **Production**: `https://your-domain.com/api`

## 🔐 Authentication

All protected endpoints require JWT token in header:

```bash
Authorization: Bearer <jwt_token>
```

Get token via login endpoint.

## 📋 Endpoints

### Authentication

#### Register
```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "handle": "username"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {
      "handle": "username",
      "visibility": "private"
    }
  }
}
```

#### Login
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Get Current User
```http
GET /v1/auth/me
Authorization: Bearer <token>
```

### Projects

#### List Projects
```http
GET /v1/me/projects
Authorization: Bearer <token>
```

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "My Project",
      "visibility": "private",
      "created_at": "2023-12-01T10:00:00Z",
      "scans": [...],
      "github_links": [...]
    }
  ]
}
```

#### Get Project
```http
GET /v1/me/projects/{id}
Authorization: Bearer <token>
```

#### Update Project
```http
PATCH /v1/me/projects/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "visibility": "public"
}
```

#### Delete Project
```http
DELETE /v1/me/projects/{id}
Authorization: Bearer <token>
```

### Scans

#### Sync Scan (Desktop App)
```http
POST /v1/sync/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_key_hash": "hash_of_project_path",
  "totals": {
    "total": 1000,
    "code": 800,
    "comment": 150,
    "blank": 50,
    "core_code_lines": 750,
    "info_lines": 50
  },
  "per_language": [
    {
      "language": "JavaScript",
      "files": 25,
      "total": 500,
      "code": 400,
      "comment": 75,
      "blank": 25
    }
  ],
  "device_id": "unique_device_identifier",
  "app_version": "1.0.0",
  "scanned_at": "1701430800"
}
```

#### Get Project Scans
```http
GET /v1/me/projects/{id}/scans?page=1&limit=20
Authorization: Bearer <token>
```

### Health Check

#### System Health
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00Z",
  "services": {
    "postgres": "healthy",
    "redis": "healthy"
  },
  "version": "1.0.0"
}
```

## 🔒 Security

### Rate Limiting

- **API endpoints**: 10 requests/second
- **Login endpoint**: 1 request/second
- **Burst**: 20 requests

### Headers

All responses include security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HTTPS only)

## 📊 Response Format

### Success Response
```json
{
  "data": {...},
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional details",
  "code": "ERROR_CODE"
}
```

## 🔧 HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 📝 Data Models

### User
```json
{
  "id": "uuid",
  "email": "string",
  "created_at": "datetime",
  "profile": {
    "handle": "string",
    "display_name": "string|null",
    "avatar_url": "string|null",
    "bio": "string|null",
    "visibility": "private|public"
  }
}
```

### Project
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "project_key_hash": "string",
  "name": "string|null",
  "visibility": "private|public",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Scan
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "total": "integer",
  "code": "integer",
  "comment": "integer",
  "blank": "integer",
  "comment_ratio": "float",
  "core_code_lines": "integer",
  "info_lines": "integer",
  "device_id": "string|null",
  "version_tag": "string|null",
  "created_at": "datetime",
  "scan_langs": [
    {
      "language": "string",
      "files": "integer",
      "total": "integer",
      "code": "integer",
      "comment": "integer",
      "blank": "integer"
    }
  ]
}
```

## 🧪 Testing

### cURL Examples

```bash
# Register
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","handle":"testuser"}'

# Login
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get projects (with token)
curl -X GET http://localhost:8080/v1/me/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Postman Collection

Import the Postman collection from `/docs/codepulse.postman_collection.json`

## 🔍 Debugging

### Logging

All requests are logged with:
- Request method and path
- Response status
- Response time
- User ID (if authenticated)

### Error Tracking

Errors include:
- Timestamp
- Request ID
- Stack trace (development only)
- User context

## 📚 SDK

### JavaScript/TypeScript

```javascript
class CodePulseAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, path, data = null) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: data ? JSON.stringify(data) : null
    });
    
    return response.json();
  }

  // Methods for each endpoint...
}
```

## 🔄 Versioning

API uses semantic versioning:
- **v1**: Current stable version
- Breaking changes will increment major version
- New features increment minor version
