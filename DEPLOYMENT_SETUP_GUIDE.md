# Complete Deployment Setup Guide

## Overview

This guide walks you through deploying SPAVIX-Vision to production using:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (Node.js + Express)
- **Database**: PostgreSQL (Neon, Railway, or similar)

**Estimated Time**: 15-20 minutes

---

## Prerequisites

Before starting, ensure you have:

1. **GitHub Account** - Repository with your code
2. **Vercel Account** - https://vercel.com (sign up with GitHub)
3. **Render Account** - https://render.com (sign up with GitHub)
4. **PostgreSQL Database** - Neon (https://neon.tech) or Railway (https://railway.app)
5. **Gemini API Key** - From Google AI Studio
6. **Environment Variables Ready**:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `SESSION_SECRET` (any random string)

---

## Step 1: Prepare Your Code (5 minutes)

### 1.1 Install Dependencies Locally

```bash
npm install
```

This installs the new `cors` package added for Vercel deployment.

### 1.2 Verify Build Works Locally

```bash
npm run build
```

Should complete without errors. Output goes to `dist/` directory.

### 1.3 Push to GitHub

```bash
git add .
git commit -m "Add deployment configuration"
git push origin main
```

---

## Step 2: Set Up PostgreSQL Database (3 minutes)

### Option A: Neon (Recommended)

1. Go to https://neon.tech
2. Sign up with GitHub
3. Create a new project
4. Copy the connection string:
   ```
   postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```
5. Save this for later (you'll need it for Render)

### Option B: Railway

1. Go to https://railway.app
2. Create new project → PostgreSQL
3. Copy the connection string from the PostgreSQL service
4. Save this for later

### 1.3 Run Migrations Locally

```bash
# Set the database URL
$env:DATABASE_URL="your_connection_string_here"

# Push schema to database
npm run db:push
```

Verify tables were created in your database console.

---

## Step 3: Deploy Backend to Render (5 minutes)

### 3.1 Create Render Account

1. Go to https://render.com
2. Click **Sign up** → **Continue with GitHub**
3. Authorize Render to access your repositories

### 3.2 Create Web Service

1. Click **New +** button (top right)
2. Select **Web Service**
3. Select your GitHub repository
4. Fill in the form:
   - **Name**: `spavix-vision-api`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Paid for better uptime)

5. Click **Create Web Service**

### 3.3 Add Environment Variables

1. In the Render dashboard, go to your service
2. Click **Environment** (left sidebar)
3. Add these variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `GEMINI_API_KEY` | Your Gemini API key |
| `SESSION_SECRET` | Any random string (e.g., `abc123xyz789`) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

4. Click **Save**

### 3.4 Wait for Deployment

1. Render will automatically start building
2. Watch the **Logs** tab for progress
3. Wait for "Build successful" message (3-5 minutes)
4. **Copy your backend URL**: `https://spavix-vision-api.onrender.com`

---

## Step 4: Deploy Frontend to Vercel (5 minutes)

### 4.1 Create Vercel Account

1. Go to https://vercel.com
2. Click **Sign up** → **Continue with GitHub**
3. Authorize Vercel to access your repositories

### 4.2 Import Project

1. Click **Add New** → **Project**
2. Select your GitHub repository
3. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`
   - **Root Directory**: Leave blank (./

4. Click **Deploy**

### 4.3 Add Environment Variables

1. Wait for initial deployment to complete
2. Go to **Settings** → **Environment Variables**
3. Add this variable:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://spavix-vision-api.onrender.com` |

4. Click **Save**

### 4.4 Redeploy

1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**
4. Wait for build to complete (2-3 minutes)
5. **Copy your frontend URL**: `https://spavix-vision.vercel.app`

---

## Step 5: Verify Deployment (3 minutes)

### 5.1 Test Backend

```bash
curl https://spavix-vision-api.onrender.com/api/health
```

Should return:
```json
{"status":"ok"}
```

### 5.2 Test Frontend

1. Open https://spavix-vision.vercel.app in your browser
2. Should load without errors
3. Open browser DevTools (F12)
4. Check **Console** tab for any errors

### 5.3 Test API Connection

In browser console:

```javascript
fetch('https://spavix-vision-api.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ API Connected:', d))
  .catch(e => console.error('❌ API Error:', e))
```

Should log: `✅ API Connected: {status: "ok"}`

---

## Step 6: Update CORS Configuration (Optional but Recommended)

If you get CORS errors, update `server/index.ts`:

The CORS configuration is already added. If you need to add more origins:

```typescript
const allowedOrigins = [
  "https://spavix-vision.vercel.app",
  "http://localhost:5000",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);
```

Then push to GitHub and Render will auto-redeploy.

---

## Troubleshooting

### CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
1. Verify `VITE_API_URL` is set in Vercel
2. Verify CORS config in `server/index.ts`
3. Redeploy both services
4. Clear browser cache (Ctrl+Shift+Delete)

### Build Failures

**Check logs**:
- **Vercel**: Deployments → Click failed build → View logs
- **Render**: Logs tab in service dashboard

**Common causes**:
- Missing environment variables
- TypeScript errors (run `npm run check` locally)
- Missing dependencies

### Slow First Request

**Normal behavior**: Free tier has 30-60 second cold starts

**Solution**: Upgrade to Render Paid plan ($7/month) for instant starts

### Database Connection Error

**Error**: `ECONNREFUSED` or `ENOTFOUND`

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Verify IP whitelist (Neon: Settings → Network → Add IP)

---

## Environment Variables Reference

### Render Backend (.env)
```
DATABASE_URL=postgresql://user:password@host/dbname
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_session_secret
NODE_ENV=production
PORT=3000
```

### Vercel Frontend (.env)
```
VITE_API_URL=https://spavix-vision-api.onrender.com
```

---

## Monitoring & Maintenance

### Monitor Errors
- **Render**: Dashboard → Logs tab
- **Vercel**: Dashboard → Analytics tab

### Update Code
1. Push to GitHub
2. Both services auto-deploy (no manual action needed)

### Database Backups
- **Neon**: Automatic daily backups
- **Railway**: Manual backups available

---

## Success Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set on both services
- [ ] Backend health check passes
- [ ] Frontend loads without errors
- [ ] API connection works
- [ ] No CORS errors
- [ ] Database connected
- [ ] Ready for users!

---

## Next Steps

1. **Share your URLs**:
   - Frontend: `https://spavix-vision.vercel.app`
   - Backend: `https://spavix-vision-api.onrender.com`

2. **Monitor logs** for any issues

3. **Test all features** in production

4. **Set up error tracking** (optional):
   - Sentry, LogRocket, or similar

5. **Configure custom domain** (optional):
   - Vercel: Settings → Domains
   - Render: Settings → Custom Domain

---

## Support

For issues:
1. Check Render/Vercel logs
2. Verify environment variables
3. Test locally: `npm run dev`
4. Check GitHub issues/discussions

