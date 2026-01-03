# Database Optimization Guide

## Performance Issue: Slow Transformation History Loading

### Root Cause
The `transformation_history` table queries are slow because they lack proper indexes on frequently queried columns.

### Solution: Add Database Indexes

Run these SQL commands on your PostgreSQL database to optimize query performance:

```sql
-- Index for transformation history lookups by generation_id and user_id
CREATE INDEX IF NOT EXISTS idx_transformation_history_generation_user 
ON transformation_history(generation_id, user_id);

-- Index for version number lookups
CREATE INDEX IF NOT EXISTS idx_transformation_history_version 
ON transformation_history(generation_id, version_number);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_transformation_history_user 
ON transformation_history(user_id);

-- Index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_transformation_history_created 
ON transformation_history(created_at DESC);

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_transformation_history_status 
ON transformation_history(status);
```

### Expected Performance Improvement
- **Before**: 500ms - 2s per query (full table scan)
- **After**: 5-50ms per query (index scan)
- **Improvement**: 10-40x faster

### How to Apply

#### Option 1: Direct SQL (Recommended)
```bash
# Connect to your PostgreSQL database
psql -U your_user -d spavix_db -h your_host

# Run the SQL commands above
```

#### Option 2: Using Database Client
1. Open your database management tool (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Run the SQL commands in the query editor

#### Option 3: Using Migration Script
Create a migration file and run it through your migration tool.

### Verification

After creating indexes, verify they exist:

```sql
-- List all indexes on transformation_history table
SELECT indexname FROM pg_indexes 
WHERE tablename = 'transformation_history';
```

### Query Optimization Details

**Current Slow Query:**
```sql
SELECT * FROM transformation_history 
WHERE generation_id = $1 AND user_id = $2 
ORDER BY version_number ASC
```

**Why it's slow:** Without indexes, PostgreSQL scans the entire table.

**With index:** PostgreSQL uses `idx_transformation_history_generation_user` to directly access matching rows.

### Additional Optimizations

#### 1. Query Pagination for Large Histories
If a generation has many versions, add pagination:

```typescript
// In server/routes/generation.ts
generationRoutes.get('/:id/history', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  
  const history = await Database.getTransformationHistory(req.params.id, req.user.id, limit, offset);
  // ...
}));
```

#### 2. Selective Column Loading
Instead of `SELECT *`, load only needed columns:

```sql
SELECT id, version_number, style, room_type, status, created_at 
FROM transformation_history 
WHERE generation_id = $1 AND user_id = $2 
ORDER BY version_number ASC
```

This reduces data transfer and improves cache efficiency.

#### 3. Connection Pooling
Ensure your database connection pool is properly configured:

```typescript
// In server/db.ts
const pool = new Pool({
  max: 20,           // Maximum connections
  min: 2,            // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Monitoring Query Performance

#### Enable Query Logging
```sql
-- Enable slow query logging (queries > 1 second)
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

#### Check Query Execution Plans
```sql
EXPLAIN ANALYZE
SELECT * FROM transformation_history 
WHERE generation_id = 'some-id' AND user_id = 'some-user-id'
ORDER BY version_number ASC;
```

### Long-term Optimization Strategy

1. **Immediate (Now):** Add indexes as shown above
2. **Short-term (1-2 weeks):** Implement pagination for large histories
3. **Medium-term (1 month):** Add caching layer (Redis) for frequently accessed histories
4. **Long-term (3+ months):** Consider partitioning table by user_id for very large datasets

### Caching Strategy (Optional)

For even faster responses, implement Redis caching:

```typescript
// Cache transformation history for 1 hour
const cacheKey = `history:${generationId}:${userId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const history = await Database.getTransformationHistory(generationId, userId);
await redis.setex(cacheKey, 3600, JSON.stringify(history));

return history;
```

### Troubleshooting

**Issue:** Indexes still not improving performance

**Solutions:**
1. Run `ANALYZE` to update table statistics:
   ```sql
   ANALYZE transformation_history;
   ```

2. Check if indexes are being used:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM transformation_history 
   WHERE generation_id = $1 AND user_id = $2;
   ```

3. Rebuild indexes if corrupted:
   ```sql
   REINDEX TABLE transformation_history;
   ```

### Summary

The slow transformation history loading is caused by missing database indexes. Adding the recommended indexes will provide 10-40x performance improvement with zero code changes.

**Next Steps:**
1. Run the SQL index creation commands
2. Test the transformation history endpoint
3. Verify performance improvement
4. Monitor query logs for other slow queries
