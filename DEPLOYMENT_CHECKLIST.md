# Deployment Checklist

Complete this checklist to deploy SPAVIX-Vision to Vercel + Render.

## Pre-Deployment (Local Setup)

- [ ] All code committed to GitHub
- [ ] `.env.example` created with all required variables
- [ ] `cors` package added to `package.json`
- [ ] CORS configuration added to `server/index.ts`
- [ ] No hardcoded API URLs in frontend code
- [ ] All environment variables use `process.env` or `import.meta.env`

## Database Setup

- [ ] PostgreSQL database created (Neon, Railway, or similar)
- [ ] Database URL obtained: `postgresql://user:password@host/dbname`
- [ ] Local migrations run: `npm run db:push`
- [ ] Database tables verified in database console

## Render Backend Deployment

### Account & Project Setup
- [ ] Render account created (https://render.com)
- [ ] GitHub repository connected to Render
- [ ] Web Service created with name: `spavix-vision-api`

### Configuration
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Environment variables set:
  - [ ] `DATABASE_URL` = your PostgreSQL connection string
  - [ ] `GEMINI_API_KEY` = your Gemini API key
  - [ ] `SESSION_SECRET` = a secure random string
  - [ ] `NODE_ENV` = `production`
  - [ ] `PORT` = `3000`

### Deployment
- [ ] Service deployed successfully
- [ ] Build logs checked for errors
- [ ] Service URL copied: `https://spavix-vision-api.onrender.com`
- [ ] Health check endpoint tested: `/api/health`

## Vercel Frontend Deployment

### Account & Project Setup
- [ ] Vercel account created (https://vercel.com)
- [ ] GitHub repository connected to Vercel
- [ ] Project imported with correct settings

### Configuration
- [ ] Framework: `Vite`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist/public`
- [ ] Install Command: `npm install`
- [ ] Environment variables set:
  - [ ] `VITE_API_URL` = your Render backend URL (e.g., `https://spavix-vision-api.onrender.com`)

### Deployment
- [ ] Project deployed successfully
- [ ] Build logs checked for errors
- [ ] Frontend URL copied: `https://spavix-vision.vercel.app`
- [ ] Frontend loads without errors

## Post-Deployment Testing

### Backend Tests
- [ ] Health check passes: `curl https://spavix-vision-api.onrender.com/api/health`
- [ ] Database connection works
- [ ] API endpoints respond correctly
- [ ] Error logs checked for issues

### Frontend Tests
- [ ] Frontend loads at `https://spavix-vision.vercel.app`
- [ ] No console errors in browser
- [ ] API calls succeed (check Network tab)
- [ ] Authentication works
- [ ] File uploads work
- [ ] Image generation works

### Integration Tests
- [ ] Frontend can communicate with backend
- [ ] CORS errors resolved
- [ ] Session/authentication works across domains
- [ ] All API endpoints accessible

## Monitoring & Maintenance

- [ ] Render logs monitored for errors
- [ ] Vercel analytics checked
- [ ] Database backups configured
- [ ] Error tracking set up (optional)
- [ ] Performance monitoring enabled (optional)

## Troubleshooting

If deployment fails:

1. **Check Render logs**:
   - Go to Render dashboard → Your service → Logs
   - Look for build errors or runtime errors

2. **Check Vercel logs**:
   - Go to Vercel dashboard → Your project → Deployments
   - Click on failed deployment → View logs

3. **Common issues**:
   - Missing environment variables → Add to dashboard
   - CORS errors → Check `server/index.ts` CORS config
   - Database connection errors → Verify `DATABASE_URL`
   - Build failures → Check TypeScript errors locally with `npm run check`

4. **Test locally first**:
   ```bash
   npm run dev
   # Test at http://localhost:5000
   ```

## Final Verification

- [ ] All checklist items completed
- [ ] No errors in production logs
- [ ] All features working as expected
- [ ] Performance acceptable
- [ ] Ready for users

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Notes**: 

