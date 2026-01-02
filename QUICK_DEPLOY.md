# Quick Deployment Steps (5 minutes)

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Deploy Backend to Render (3 minutes)

1. Go to https://render.com
2. Click **New +** → **Web Service**
3. Select your GitHub repo
4. Fill in:
   - **Name**: `spavix-vision-api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Click **Create Web Service**
6. Go to **Environment** tab
7. Add these variables:
   ```
   DATABASE_URL=postgresql://user:password@host/dbname
   GEMINI_API_KEY=your_key
   SESSION_SECRET=your_secret
   NODE_ENV=production
   ```
8. Wait for deployment (3-5 min)
9. **Copy your URL**: `https://spavix-vision-api.onrender.com`

## Step 3: Deploy Frontend to Vercel (2 minutes)

1. Go to https://vercel.com
2. Click **Add New** → **Project**
3. Select your GitHub repo
4. Configure:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
5. Click **Deploy**
6. Go to **Settings** → **Environment Variables**
7. Add:
   ```
   VITE_API_URL=https://spavix-vision-api.onrender.com
   ```
8. Redeploy (click **Deployments** → **Redeploy**)
9. **Your URL**: `https://spavix-vision.vercel.app`

## Step 4: Update CORS (1 minute)

Edit `server/index.ts` (around line 27):

```typescript
import cors from "cors";

// Add after app creation
app.use(
  cors({
    origin: [
      "https://spavix-vision.vercel.app",
      "http://localhost:5000",
    ],
    credentials: true,
  })
);
```

Then push and Render will auto-redeploy.

## Step 5: Test

- Frontend: https://spavix-vision.vercel.app
- Backend: https://spavix-vision-api.onrender.com/api/health

Done! 🎉

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check CORS config in server/index.ts |
| Build fails | Check Render/Vercel logs for errors |
| Slow first request | Free tier has cold starts (30-60s) |
| API not responding | Verify DATABASE_URL and GEMINI_API_KEY |

