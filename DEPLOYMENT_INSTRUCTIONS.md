# Deployment Guide

## Render Deployment (https://spavix-ai.onrender.com)

### 1. Environment Variables
Set these environment variables in Render dashboard:
- `GEMINI_API_KEY` - Your Google Gemini API key
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret

### 2. Google OAuth Configuration
In your Google Cloud Console:
- Add `https://spavix-ai.onrender.com/api/auth/google/callback` to Authorized redirect URIs

### 3. Custom Domain
- Add your custom domain in Render dashboard
- Update DNS records as instructed by Render

## Vercel Deployment (https://spavix-ai.vercel.app)

### 1. Environment Variables
Set these environment variables in Vercel dashboard:
- `DATABASE_URL` - Your Neon database URL
- `GEMINI_API_KEY` - Your Google Gemini API key
- `JWT_SECRET` - 64+ character random string
- `SESSION_SECRET` - 64+ character random string
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret
- `FRONTEND_URL` - `https://spavix-ai.vercel.app`
- `API_URL` - `https://spavix-ai.vercel.app`

### 2. Google OAuth Configuration
In your Google Cloud Console:
- Add `https://spavix-ai.vercel.app/api/auth/google/callback` to Authorized redirect URIs

### 3. Backend Deployment
Note: Vercel is primarily for frontend. For full-stack deployment:
- Use Vercel for frontend
- Deploy backend separately (Render, Railway, etc.)
- Update API calls to point to backend URL

## Common Issues

### 1. Google OAuth 404 Error
- Ensure redirect URI matches exactly in Google Console
- Check that FRONTEND_URL is set correctly
- Verify HTTPS is used in production

### 2. Database Connection
- Ensure DATABASE_URL is correct
- Check if IP is whitelisted in database settings

### 3. Build Failures
- Check all environment variables are set
- Ensure build command is `npm run build`
- Verify start command is `npm start`

## SSL/HTTPS
Both platforms automatically handle SSL certificates. The application will automatically:
- Redirect HTTP to HTTPS in production
- Use secure cookies in production
- Set appropriate security headers
