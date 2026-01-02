# Deployment Guide: Vercel + Render

This guide covers deploying the SPAVIX-Vision project to **Vercel (frontend)** and **Render (backend)**.

## Project Architecture

```
SPAVIX-Vision/
├── client/              → Frontend (React + Vite) → Deploy to Vercel
├── server/              → Backend (Express + Node) → Deploy to Render
├── shared/              → Shared types
└── script/build.ts      → Build script
```

---

## Part 1: Prepare Your Repository

### 1.1 Push Code to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/SPAVIX-Vision.git
git branch -M main
git push -u origin main
```

### 1.2 Create `.env.example` (for reference)

Create `c:\SPAVIX-Vision\.env.example`:

```
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Session
SESSION_SECRET=your_session_secret

# Frontend API URL (for Vercel)
VITE_API_URL=https://your-render-backend.onrender.com
```

---

## Part 2: Deploy Backend to Render

### 2.1 Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### 2.2 Create Web Service on Render

1. Click **New +** → **Web Service**
2. Select your GitHub repository
3. Configure:
   - **Name**: `spavix-vision-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Paid for better uptime)

### 2.3 Set Environment Variables on Render

In the Render dashboard:

1. Go to your Web Service
2. Click **Environment** (left sidebar)
3. Add these variables:

```
DATABASE_URL=postgresql://user:password@host/dbname
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_session_secret
NODE_ENV=production
PORT=3000
```

**Important**: Get `DATABASE_URL` from your PostgreSQL provider (Neon, Railway, etc.)

### 2.4 Deploy

1. Click **Deploy** button
2. Wait for build to complete (3-5 minutes)
3. Copy the URL: `https://spavix-vision-api.onrender.com`

**Note**: Free tier has cold starts (30-60 seconds first request)

---

## Part 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### 3.2 Import Project on Vercel

1. Click **Add New** → **Project**
2. Select your GitHub repository
3. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (leave blank)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

### 3.3 Set Environment Variables on Vercel

In the Vercel dashboard:

1. Go to your Project Settings
2. Click **Environment Variables**
3. Add:

```
VITE_API_URL=https://spavix-vision-api.onrender.com
```

**Important**: Replace with your actual Render backend URL

### 3.4 Deploy

1. Click **Deploy** button
2. Wait for build to complete (2-3 minutes)
3. Your frontend URL: `https://spavix-vision.vercel.app`

---

## Part 4: Configure CORS on Backend

Update `server/index.ts` to allow Vercel frontend:

```typescript
import cors from "cors";

app.use(
  cors({
    origin: [
      "https://spavix-vision.vercel.app",
      "http://localhost:5000", // for local dev
    ],
    credentials: true,
  })
);
```

Then redeploy on Render.

---

## Part 5: Database Setup

### 5.1 Create PostgreSQL Database

**Option A: Neon (Recommended)**
1. Go to https://neon.tech
2. Sign up
3. Create a project
4. Copy connection string: `postgresql://user:password@host/dbname`

**Option B: Railway**
1. Go to https://railway.app
2. Create PostgreSQL service
3. Copy connection string

### 5.2 Run Migrations

On your local machine:

```bash
# Set DATABASE_URL
$env:DATABASE_URL="postgresql://user:password@host/dbname"

# Push schema to database
npm run db:push
```

---

## Part 6: Verify Deployment

### 6.1 Test Backend

```bash
curl https://spavix-vision-api.onrender.com/api/health
```

Should return: `{ "status": "ok" }`

### 6.2 Test Frontend

Visit: https://spavix-vision.vercel.app

Should load without errors.

### 6.3 Test API Connection

In browser console:

```javascript
fetch('https://spavix-vision-api.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

Should return: `{ "status": "ok" }`

---

## Part 7: Troubleshooting

### CORS Errors

**Problem**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
1. Update CORS in `server/index.ts`
2. Redeploy on Render
3. Clear browser cache

### Cold Start Delays

**Problem**: First request takes 30-60 seconds

**Solution**: Upgrade to Render Paid plan ($7/month) for instant starts

### Build Failures

**Check logs**:
- Vercel: Project Settings → Deployments → View logs
- Render: Dashboard → Logs tab

**Common issues**:
- Missing environment variables
- TypeScript errors
- Missing dependencies

### Database Connection Issues

**Problem**: `ECONNREFUSED` or `ENOTFOUND`

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Verify IP whitelist (if applicable)

---

## Part 8: Environment Variables Summary

### Render Backend (.env)
```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
SESSION_SECRET=...
NODE_ENV=production
PORT=3000
```

### Vercel Frontend (.env)
```
VITE_API_URL=https://spavix-vision-api.onrender.com
```

---

## Part 9: Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `.env.example` created
- [ ] Render account created
- [ ] Backend deployed to Render
- [ ] Environment variables set on Render
- [ ] Vercel account created
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set on Vercel
- [ ] CORS configured in backend
- [ ] Database created and migrated
- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] API connection works

---

## Part 10: Monitoring & Maintenance

### Monitor Errors
- **Vercel**: Monitoring → Web Analytics
- **Render**: Logs tab

### Update Deployments
- Push to GitHub → Auto-deploys to Vercel & Render
- No manual deployment needed

### Database Backups
- Neon: Automatic daily backups
- Railway: Manual backups available

---

## Support

For issues:
1. Check Vercel/Render logs
2. Verify environment variables
3. Test locally: `npm run dev`
4. Check GitHub issues

