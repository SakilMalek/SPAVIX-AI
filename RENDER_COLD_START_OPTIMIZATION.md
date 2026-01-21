# Render Cold Start Optimization Guide

## Problem Analysis

**Current Cold Start Time:** ~30-60 seconds (typical for Node.js + PostgreSQL)

**Root Causes:**
1. Database pool initialization (15s)
2. Module loading and compilation (10-15s)
3. Environment validation (2-3s)
4. Session store setup (5-10s)
5. Middleware initialization (3-5s)

---

## 🚀 Optimization Strategies (Priority Order)

### PRIORITY 1: Keep Render Instance Warm (Immediate - 0 cost)

**Strategy:** Use a cron job to ping your backend every 10 minutes

**Implementation:**
```bash
# Add to Render dashboard or use external service
curl https://your-backend.onrender.com/api/health
```

**Benefits:**
- Prevents cold starts entirely
- Free tier compatible
- Instant response times

**Services to use:**
- **Render Cron Jobs** (Built-in, free)
- **UptimeRobot** (Free tier, 5-minute intervals)
- **Healthchecks.io** (Free tier)

**Setup Instructions:**
1. Go to Render Dashboard
2. Create new "Cron Job"
3. Set schedule: `*/10 * * * *` (every 10 minutes)
4. Command: `curl https://your-backend.onrender.com/api/health`

---

### PRIORITY 2: Lazy Load Heavy Dependencies

**Current Issue:** All modules loaded at startup

**Fix:** Lazy load expensive imports

**Files to modify:**
- `@/server/index.ts` - Move Vite setup to lazy load
- `@/server/services/gemini.ts` - Lazy load Google AI
- `@/server/services/email.ts` - Lazy load Nodemailer

**Example Implementation:**

```typescript
// BEFORE (loads immediately)
import { setupVite } from "./vite";

// AFTER (loads only when needed)
let viteSetup: any = null;
async function getViteSetup() {
  if (!viteSetup) {
    viteSetup = await import("./vite");
  }
  return viteSetup;
}
```

**Expected Improvement:** 5-10 seconds saved

---

### PRIORITY 3: Optimize Database Pool Configuration

**Current Issue:** Pool initializes with `min: 2` connections

**Fix:** Reduce minimum connections on startup

```typescript
// @/server/db.ts - Line 20
// BEFORE
min: 2,  // Creates 2 connections immediately

// AFTER
min: 0,  // Create connections on-demand
```

**Additional optimizations:**

```typescript
// Reduce connection timeout for faster failure detection
connectionTimeoutMillis: 5000,  // Down from 15000

// Reduce idle timeout to free resources faster
idleTimeoutMillis: 10000,  // Down from 30000

// Reduce pool size if not needed
max: 10,  // Down from 20
```

**Expected Improvement:** 3-5 seconds saved

---

### PRIORITY 4: Defer Non-Critical Initialization

**Current Issue:** All middleware initialized before server starts

**Fix:** Move non-critical setup to background

```typescript
// @/server/index.ts - Defer cleanup jobs

// BEFORE
startRateLimitCleanup();
startSubscriptionRateLimitCleanup();

// AFTER
// Start cleanup jobs after server is listening
setTimeout(() => {
  startRateLimitCleanup();
  startSubscriptionRateLimitCleanup();
}, 5000);
```

**Expected Improvement:** 2-3 seconds saved

---

### PRIORITY 5: Optimize Imports with Tree-Shaking

**Current Issue:** Importing entire modules when only need specific functions

**Fix:** Use named imports instead of default imports

```typescript
// BEFORE (loads entire module)
import * as services from './services';

// AFTER (loads only what's needed)
import { emailService } from './services/email';
import { geminiService } from './services/gemini';
```

**Expected Improvement:** 1-2 seconds saved

---

### PRIORITY 6: Add Health Check Endpoint

**Current Issue:** No lightweight endpoint to keep instance warm

**Implementation:**

```typescript
// Add to @/server/routes/index.ts or create new file

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Lightweight health check (no DB query)
app.get('/api/health/quick', (req, res) => {
  res.status(200).send('OK');
});
```

**Use `/api/health/quick` for cron jobs** - Fastest response

---

### PRIORITY 7: Use Render Native Features

**Strategy:** Leverage Render's built-in optimization

1. **Enable "Auto-Deploy on Push"** - Keeps instance warm during development
2. **Use Render's Cron Jobs** - Built-in, no external service needed
3. **Set "Keep Alive" in Render Dashboard:**
   - Go to Service Settings
   - Enable "Auto-Scroll Logs" (keeps connection active)

---

### PRIORITY 8: Optimize Node.js Runtime

**Add to `package.json`:**

```json
{
  "engines": {
    "node": "20.x"
  }
}
```

**Create `render.yaml` for build optimization:**

```yaml
services:
  - type: web
    name: spavix-backend
    env: node
    plan: free
    buildCommand: npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_OPTIONS
        value: "--max-old-space-size=512"
```

**Expected Improvement:** 2-3 seconds saved

---

## 📋 Implementation Checklist

### Phase 1: Immediate (5 minutes)
- [ ] Set up Render Cron Job to ping `/api/health/quick` every 10 minutes
- [ ] Add health check endpoints

### Phase 2: Quick Wins (30 minutes)
- [ ] Optimize database pool configuration
- [ ] Defer non-critical initialization
- [ ] Add `render.yaml` configuration

### Phase 3: Deeper Optimization (1-2 hours)
- [ ] Lazy load heavy dependencies
- [ ] Optimize imports with tree-shaking
- [ ] Profile startup time with `node --prof`

---

## 🔧 Implementation Code

### Step 1: Add Health Check Endpoints

Create `@/server/routes/health.ts`:

```typescript
import { Router, Request, Response } from 'express';

export const healthRoutes = Router();

// Quick health check (no DB)
healthRoutes.get('/quick', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Full health check (with DB)
healthRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { getPool } = await import('../db.js');
    const pool = getPool();
    
    // Test database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Step 2: Optimize Database Pool

Edit `@/server/db.ts` (line 17-25):

```typescript
const poolConfig: any = {
  connectionString,
  max: 10,                    // Reduced from 20
  min: 0,                     // Reduced from 2 (create on-demand)
  idleTimeoutMillis: 10000,   // Reduced from 30000
  connectionTimeoutMillis: 5000, // Reduced from 15000
  statement_timeout: 300000,
  application_name: 'spavix-api',
};
```

### Step 3: Defer Cleanup Jobs

Edit `@/server/index.ts` (line 204-206):

```typescript
// Defer cleanup jobs to run after server starts
setTimeout(() => {
  startRateLimitCleanup();
  startSubscriptionRateLimitCleanup();
  logger.info('Cleanup jobs started');
}, 5000);
```

### Step 4: Create render.yaml

Create `@/render.yaml`:

```yaml
services:
  - type: web
    name: spavix-backend
    env: node
    plan: free
    buildCommand: npm run build
    startCommand: npm start
    healthCheckPath: /api/health/quick
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_OPTIONS
        value: "--max-old-space-size=512"
    autoDeploy: true
```

### Step 5: Set Up Render Cron Job

In Render Dashboard:
1. Click "Create +" → "Cron Job"
2. Name: "Keep Backend Warm"
3. Schedule: `*/10 * * * *` (every 10 minutes)
4. Command: `curl https://your-backend.onrender.com/api/health/quick`
5. Notifications: Enable to track failures

---

## 📊 Expected Results

| Optimization | Time Saved | Difficulty |
|---|---|---|
| Keep-alive cron job | 30-60s (eliminates cold starts) | ⭐ Easy |
| Health check endpoint | 2-3s (faster pings) | ⭐ Easy |
| DB pool optimization | 3-5s | ⭐ Easy |
| Defer cleanup jobs | 2-3s | ⭐ Easy |
| Lazy load dependencies | 5-10s | ⭐⭐ Medium |
| Tree-shaking imports | 1-2s | ⭐⭐ Medium |
| render.yaml config | 2-3s | ⭐ Easy |
| **Total Potential Improvement** | **45-90s** | |

---

## 🎯 Recommended Approach

**For immediate improvement (TODAY):**
1. Add health check endpoint (5 min)
2. Set up Render Cron Job (5 min)
3. Optimize DB pool config (5 min)

**Result:** Eliminate cold starts entirely + 5-8s faster startup

**For long-term improvement (THIS WEEK):**
1. Defer cleanup jobs
2. Lazy load heavy dependencies
3. Add render.yaml configuration

**Result:** 10-15s faster cold start (if cron job fails)

---

## 🔍 Monitoring Cold Starts

**Add logging to track startup time:**

```typescript
// @/server/index.ts - Add at top
const startTime = Date.now();

// @/server/index.ts - Add in listen callback
const duration = Date.now() - startTime;
logger.info(`Server started in ${duration}ms`);
```

**Monitor in Render Logs:**
```
Search: "Server started in"
```

---

## ⚠️ Important Notes

1. **Free tier limitation:** Render spins down free instances after 15 minutes of inactivity
2. **Cron job is essential:** Without it, you'll still get cold starts
3. **Database connection:** Most of the cold start time is DB connection
4. **Test locally:** Run `npm run build && npm start` to simulate production startup

---

## 🚨 Troubleshooting

**If cron job fails:**
- Check Render logs for errors
- Verify `/api/health/quick` endpoint is accessible
- Ensure CORS allows requests from cron service

**If startup is still slow:**
- Check database connection time: `psql -h <host> -U <user> -d <db> -c "SELECT 1"`
- Profile with: `node --prof server/index.ts`
- Check for missing indexes in PostgreSQL

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
