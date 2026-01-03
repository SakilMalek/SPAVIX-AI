# Phase 3: Database Query Optimization and Indexing

## Overview
Phase 3 Part 2 implements database query optimization and strategic indexing to improve application performance and reduce query execution time.

## Current Database Schema

### Tables
1. **users** - User accounts and profiles
2. **generations** - Image generation results
3. **projects** - User projects
4. **shares** - Shared generations and projects
5. **session** - Express session store (PostgreSQL)

## Optimization Strategy

### 1. Index Analysis

#### High-Priority Indexes (Already Implemented)
- `idx_generations_project_id` - Foreign key optimization
- `idx_generations_user_id` - User query optimization
- `idx_projects_user_id` - User project queries
- `idx_shares_generation_id` - Share lookup
- `idx_shares_project_id` - Project share lookup

#### Additional Recommended Indexes
```sql
-- User lookups by email (authentication)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Session lookups
CREATE INDEX IF NOT EXISTS idx_session_sid ON session(sid);

-- Timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_created ON projects(user_id, created_at DESC);
```

### 2. Query Optimization

#### Authentication Queries
```typescript
// OPTIMIZED: Uses indexed email column
SELECT id, email, password_hash, name, picture FROM users WHERE email = $1;
```

#### User Generation Queries
```typescript
// OPTIMIZED: Uses composite index on (user_id, created_at)
SELECT * FROM generations 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;
```

#### Project Queries
```typescript
// OPTIMIZED: Uses composite index on (user_id, created_at)
SELECT * FROM projects 
WHERE user_id = $1 
ORDER BY created_at DESC;
```

### 3. Connection Pool Optimization (Phase 2)

Already implemented:
- **Max connections**: 20 (increased from 10)
- **Min connections**: 2 (maintain warm pool)
- **Idle timeout**: 30s (faster cleanup)
- **Connection timeout**: 5s (faster failure detection)
- **Statement timeout**: 30s (query timeout)

### 4. Query Performance Monitoring

#### Slow Query Detection
- Threshold: 1000ms
- Logged as WARN level
- Includes query text, parameters, and duration

#### Database Query Logging
- All queries logged with execution time
- Error tracking for failed queries
- Row count tracking for result sets

### 5. N+1 Query Prevention

#### Current Implementation
- Batch queries where possible
- Avoid nested loops with database calls
- Use JOIN operations instead of multiple queries

#### Example Optimization
```typescript
// BEFORE: N+1 queries
const projects = await Database.getProjects(userId);
for (const project of projects) {
  const generations = await Database.getGenerationsByProjectId(project.id);
  project.generations = generations;
}

// AFTER: Single query with JOIN
SELECT p.*, g.* FROM projects p
LEFT JOIN generations g ON p.id = g.project_id
WHERE p.user_id = $1
ORDER BY p.created_at DESC;
```

### 6. Caching Strategy (Future Enhancement)

Recommended caching layers:
- **Query Result Cache**: Cache frequently accessed data (user profiles, projects)
- **Session Cache**: Redis for session store (faster than PostgreSQL)
- **API Response Cache**: Cache GET endpoints with short TTL

### 7. Database Maintenance

#### Regular Tasks
- Analyze query plans: `EXPLAIN ANALYZE`
- Check index usage: `pg_stat_user_indexes`
- Monitor table bloat: `pg_stat_user_tables`
- Vacuum and analyze: `VACUUM ANALYZE`

#### Monitoring Queries
```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Performance Improvements

### Expected Benefits
1. **Faster Authentication**: Email index reduces login time
2. **Improved Pagination**: Composite indexes speed up list queries
3. **Better Concurrency**: Optimized connection pool handles more concurrent requests
4. **Reduced Query Time**: Strategic indexes reduce full table scans
5. **Better Monitoring**: Query logging identifies bottlenecks

### Metrics to Track
- Query execution time (target: < 100ms for most queries)
- Slow query count (target: < 1% of queries)
- Connection pool utilization (target: < 80%)
- Database CPU usage (target: < 60%)

## Implementation Status

✅ **Completed:**
- Connection pool optimization (Phase 2)
- Query logging with slow query detection (Phase 3)
- Strategic index creation in schema migration
- Database error handling and retry logic

🔄 **In Progress:**
- Performance monitoring and analysis
- Query optimization recommendations
- Index effectiveness verification

📋 **Future Enhancements:**
- Redis session store for faster session access
- Query result caching layer
- Automated index analysis and recommendations
- Database query plan analysis and optimization

## Files Modified/Created

- ✅ Modified: `server/db.ts` - Added query logging
- ✅ Modified: `server/routes/auth.ts` - Added authentication logging
- ✅ Created: `server/utils/logger.ts` - Logging utility
- ✅ Created: `server/middleware/requestLogger.ts` - HTTP request logging
- ✅ Created: `server/middleware/queryLogger.ts` - Database query logging

## Testing

To verify database optimization:

```bash
# Start server
npm run dev

# Monitor slow queries in console output
# Look for logs with "Slow database query detected"

# Check query execution times
# All queries should complete in < 1000ms
```

## Next Steps

1. Monitor query performance in production
2. Analyze slow query logs
3. Add additional indexes if needed
4. Consider caching layer for frequently accessed data
5. Implement Redis session store (optional)
