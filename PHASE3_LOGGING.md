# Phase 3: Comprehensive Logging Infrastructure

## Overview
Phase 3 implements structured logging across the application to improve debugging, monitoring, and security auditing.

## Components Implemented

### 1. Core Logger (`server/utils/logger.ts`)
Structured logging utility with:
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Structured Context**: Request ID, User ID, Endpoint, Duration, etc.
- **JSON Output**: All logs formatted as JSON for easy parsing
- **Specialized Methods**:
  - `logRequest()` - HTTP request logging
  - `logResponse()` - HTTP response with status and duration
  - `logDatabase()` - Database operation logging
  - `logAuth()` - Authentication event logging
  - `logSecurity()` - Security event logging with severity levels

### 2. Request Logger Middleware (`server/middleware/requestLogger.ts`)
Logs all HTTP requests and responses:
- **Request ID**: Unique UUID for request tracing
- **Timing**: Measures request duration
- **Context**: IP address, user agent, user ID
- **Response Tracking**: Logs status code and response time
- **Header Injection**: Adds `X-Request-ID` header to responses

### 3. Query Logger (`server/middleware/queryLogger.ts`)
Database query logging:
- **Query Execution**: Logs all database queries
- **Performance Metrics**: Duration, row count
- **Slow Query Detection**: Warns on queries > 1000ms
- **Error Tracking**: Logs failed queries with error details

## Log Format

All logs are structured JSON:

```json
{
  "timestamp": "2026-01-02T16:54:16.633Z",
  "level": "INFO",
  "message": "GET /api/auth/me 401 5ms",
  "context": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "method": "GET",
    "endpoint": "/api/auth/me",
    "statusCode": 401,
    "duration": 5,
    "userId": "user-123"
  }
}
```

## Usage Examples

### In Route Handlers
```typescript
import { logger } from '../utils/logger.js';

// Log authentication event
logger.logAuth('User login successful', userId);

// Log security event
logger.logSecurity('Failed login attempt', 'medium', { userId, ip });

// Log custom message
logger.info('Processing payment', { orderId, amount });
```

### In Database Operations
```typescript
import { logQuery, logSlowQuery } from '../middleware/queryLogger.js';

const startTime = Date.now();
const result = await pool.query(sql, params);
const duration = Date.now() - startTime;

logQuery({ query: sql, params, duration, rowCount: result.rowCount });
logSlowQuery({ query: sql, params, duration, rowCount: result.rowCount });
```

### In Middleware
```typescript
// Request logger automatically logs all requests/responses
app.use(requestLogger);

// Set context for subsequent logs
logger.setContext({ userId: req.user.id, requestId: req.id });
```

## Log Levels

| Level | Use Case | Output |
|-------|----------|--------|
| DEBUG | Detailed diagnostic information | console.debug() |
| INFO | General informational messages | console.log() |
| WARN | Warning conditions (slow queries, failed attempts) | console.warn() |
| ERROR | Error conditions (exceptions, failures) | console.error() |

## Benefits

1. **Debugging**: Structured logs make it easy to trace issues
2. **Monitoring**: JSON format enables log aggregation and analysis
3. **Security Auditing**: Track authentication, authorization, and suspicious activity
4. **Performance**: Identify slow queries and bottlenecks
5. **Request Tracing**: Unique request IDs enable end-to-end tracing

## Integration Points

- **HTTP Requests**: Automatically logged via `requestLogger` middleware
- **Database Queries**: Can be wrapped with `logQuery()` in db.ts
- **Authentication**: Use `logAuth()` for login/logout events
- **Security Events**: Use `logSecurity()` for suspicious activity
- **Errors**: Automatically logged by error handler middleware

## Configuration

### Log Level Control
Set via environment variable (future enhancement):
```bash
LOG_LEVEL=DEBUG  # Show all logs
LOG_LEVEL=INFO   # Show info and above
LOG_LEVEL=WARN   # Show warnings and errors only
```

### Performance Monitoring
Slow query threshold: 1000ms (configurable)
- Queries exceeding this are logged as WARN level
- Helps identify performance bottlenecks

## Files Created/Modified

- ✅ Created: `server/utils/logger.ts` - Core logging utility
- ✅ Created: `server/middleware/requestLogger.ts` - HTTP request/response logging
- ✅ Created: `server/middleware/queryLogger.ts` - Database query logging
- ✅ Modified: `server/index.ts` - Integrated request logger middleware

## Testing

To verify logging is working:

```bash
# Start server
npm run dev

# Make a request
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer test"

# Check console output for structured JSON logs
```

Expected log output shows JSON-formatted logs with timestamps, levels, and context.

## Next Steps

1. Integrate query logging in `db.ts`
2. Add logging to authentication routes
3. Add security event logging for suspicious activity
4. Monitor slow queries in production
5. Create log analysis dashboards (optional)
