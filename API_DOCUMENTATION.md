# SPAVIX-Vision API Documentation

## Base URL
```
https://api.spavix.com/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer {jwt_token}
```

---

## Authentication Endpoints

### POST /auth/signup
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "profilePicture": "https://example.com/pic.jpg"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "picture": "https://example.com/pic.jpg"
  }
}
```

**Errors:**
- 400: Validation error
- 409: User already exists

---

### POST /auth/login
Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "picture": "https://example.com/pic.jpg"
  }
}
```

**Errors:**
- 401: Invalid credentials
- 429: Too many login attempts

---

### POST /auth/google
Authenticate with Google OAuth.

**Request:**
```json
{
  "state": "32-character-random-string",
  "email": "user@gmail.com",
  "name": "User Name",
  "picture": "https://lh3.googleusercontent.com/..."
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "User Name",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

**Errors:**
- 401: Invalid OAuth state (CSRF attack)
- 400: Missing required fields

---

### GET /auth/me
Get current authenticated user.

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://example.com/pic.jpg"
}
```

**Errors:**
- 401: Unauthorized

---

## Generation Endpoints

### POST /generations
Create a new room transformation.

**Request:**
```json
{
  "imageUrl": "data:image/png;base64,...",
  "roomType": "bedroom",
  "style": "modern",
  "materials": {
    "wallColor": "white",
    "floorType": "wood",
    "curtainType": "linen",
    "lightingMood": "warm",
    "accentWall": "navy"
  },
  "projectId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "generationId": "uuid",
  "beforeImage": "data:image/png;base64,...",
  "afterImage": "data:image/png;base64,...",
  "version": 1
}
```

**Errors:**
- 400: Missing required fields
- 401: Unauthorized
- 429: Generation limit exceeded (10/hour)
- 500: Generation failed

---

### GET /generations
List user's transformations.

**Query Parameters:**
- `limit` (1-100, default: 20)
- `offset` (default: 0)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "before_image_url": "data:image/png;base64,...",
    "after_image_url": "data:image/png;base64,...",
    "style": "modern",
    "room_type": "bedroom",
    "created_at": "2026-01-03T11:00:00Z"
  }
]
```

**Errors:**
- 401: Unauthorized

---

### GET /generations/:id
Get specific transformation.

**Response (200):**
```json
{
  "id": "uuid",
  "before_image_url": "data:image/png;base64,...",
  "after_image_url": "data:image/png;base64,...",
  "style": "modern",
  "room_type": "bedroom",
  "created_at": "2026-01-03T11:00:00Z"
}
```

**Errors:**
- 401: Unauthorized
- 404: Generation not found

---

### GET /generations/:id/history
Get transformation version history.

**Response (200):**
```json
{
  "generationId": "uuid",
  "totalVersions": 3,
  "history": [
    {
      "id": "uuid",
      "version_number": 1,
      "style": "modern",
      "room_type": "bedroom",
      "materials": {...},
      "before_image_url": "data:image/png;base64,...",
      "after_image_url": "data:image/png;base64,...",
      "status": "completed",
      "created_at": "2026-01-03T11:00:00Z"
    }
  ]
}
```

**Errors:**
- 401: Unauthorized
- 404: No history found

---

### GET /generations/:id/history/:version
Get specific transformation version.

**Response (200):**
```json
{
  "id": "uuid",
  "generation_id": "uuid",
  "version_number": 2,
  "style": "minimalist",
  "room_type": "bedroom",
  "materials": {...},
  "before_image_url": "data:image/png;base64,...",
  "after_image_url": "data:image/png;base64,...",
  "status": "completed",
  "created_at": "2026-01-03T11:00:00Z"
}
```

**Errors:**
- 401: Unauthorized
- 404: Version not found

---

### POST /generations/:id/history
Create new transformation version (edit).

**Request:**
```json
{
  "imageUrl": "data:image/png;base64,...",
  "roomType": "bedroom",
  "style": "minimalist",
  "materials": {...}
}
```

**Response (200):**
```json
{
  "success": true,
  "generationId": "uuid",
  "version": 2,
  "beforeImage": "data:image/png;base64,...",
  "afterImage": "data:image/png;base64,..."
}
```

**Errors:**
- 400: Missing required fields
- 401: Unauthorized
- 404: Generation not found

---

### PUT /generations/:id/project
Link transformation to project.

**Request:**
```json
{
  "projectId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "generation": {...}
}
```

**Errors:**
- 401: Unauthorized
- 404: Generation or project not found

---

### DELETE /generations/:id/project
Unlink transformation from project.

**Response (200):**
```json
{
  "success": true,
  "generation": {...}
}
```

**Errors:**
- 400: Generation not linked to project
- 401: Unauthorized
- 404: Generation not found

---

## Project Endpoints

### POST /projects
Create a new project.

**Request:**
```json
{
  "name": "Living Room Redesign",
  "description": "Modern living room transformation"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Living Room Redesign",
  "description": "Modern living room transformation",
  "created_at": "2026-01-03T11:00:00Z",
  "updated_at": "2026-01-03T11:00:00Z"
}
```

**Errors:**
- 400: Validation error
- 401: Unauthorized

---

### GET /projects
List user's projects.

**Query Parameters:**
- `limit` (1-100, default: 20)
- `offset` (default: 0)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Living Room Redesign",
    "description": "Modern living room transformation",
    "created_at": "2026-01-03T11:00:00Z",
    "updated_at": "2026-01-03T11:00:00Z"
  }
]
```

**Errors:**
- 401: Unauthorized

---

### GET /projects/:id
Get specific project.

**Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Living Room Redesign",
  "description": "Modern living room transformation",
  "created_at": "2026-01-03T11:00:00Z",
  "updated_at": "2026-01-03T11:00:00Z"
}
```

**Errors:**
- 401: Unauthorized
- 404: Project not found

---

### PUT /projects/:id
Update project.

**Request:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Updated Project Name",
  "description": "Updated description",
  "created_at": "2026-01-03T11:00:00Z",
  "updated_at": "2026-01-03T11:00:00Z"
}
```

**Errors:**
- 400: Validation error
- 401: Unauthorized
- 404: Project not found

---

### DELETE /projects/:id
Delete project.

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- 401: Unauthorized
- 404: Project not found

---

## Data & Privacy Endpoints

### GET /data/export
Export all user data (GDPR).

**Response (200):**
```json
{
  "exportDate": "2026-01-03T11:00:00Z",
  "user": {...},
  "statistics": {...},
  "generations": [...],
  "projects": [...]
}
```

**Errors:**
- 401: Unauthorized

---

### DELETE /data/delete
Delete user account and all data.

**Request:**
```json
{
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account and all data deleted"
}
```

**Errors:**
- 400: Password required
- 401: Invalid password or unauthorized

---

### POST /data/consent
Record user consent.

**Request:**
```json
{
  "privacyConsent": true,
  "termsConsent": true,
  "marketingConsent": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Consent recorded"
}
```

**Errors:**
- 400: Privacy and terms consent required
- 401: Unauthorized

---

### POST /data/withdraw-consent
Withdraw consent.

**Request:**
```json
{
  "consentType": "marketing"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "marketing consent withdrawn"
}
```

**Errors:**
- 400: Invalid consent type
- 401: Unauthorized

---

## Error Response Format

All errors follow this standardized format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": "2026-01-03T11:00:00Z",
  "details": {
    "field": "additional error details"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Missing or invalid authentication
- `INVALID_TOKEN` - JWT token is invalid or expired
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `DUPLICATE_RESOURCE` - Resource already exists
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Rate Limits

- **General API:** 100 requests/15 minutes per IP
- **Login:** 5 attempts/15 minutes per IP
- **Signup:** 3 attempts/hour per IP
- **Generations:** 10 per hour per user
- **Pagination:** Max 100 items per request

---

## Pagination

All list endpoints support pagination:

```
GET /api/generations?limit=20&offset=0
```

- `limit`: Number of items (1-100, default: 20)
- `offset`: Number of items to skip (default: 0)

---

## Timestamps

All timestamps are in ISO 8601 format (UTC):
```
2026-01-03T11:00:00Z
```

---

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Version

Current API Version: **v1**

For future versions, use `/api/v2/...`
