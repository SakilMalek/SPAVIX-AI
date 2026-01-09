# Cross-Domain Deployment Guide

## Architecture
- Frontend: Vercel (https://spavix-ai.vercel.app)
- Backend: Render (https://spavix-ai.onrender.com)

## Required Environment Variables

### Render (Backend)
```
NODE_ENV=production
PORT=10000
JWT_SECRET=<generated>
SESSION_SECRET=<generated>
GEMINI_API_KEY=<your-key>
DATABASE_URL=<neon-db-url>
FRONTEND_URL=https://spavix-ai.vercel.app
API_URL=https://spavix-ai.onrender.com
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://spavix-ai.onrender.com/api/auth/google/callback
```

### Vercel (Frontend)
```
VITE_API_URL=https://spavix-ai.onrender.com
```

## Google OAuth Configuration

### 1. Authorized JavaScript Origins
- `https://spavix-ai.vercel.app`
- `https://spavix.vercel.app`
- `http://localhost:5000` (for development)

### 2. Authorized Redirect URIs
- `https://spavix-ai.onrender.com/api/auth/google/callback`
- `http://localhost:5000/api/auth/google/callback` (for development)

## Common Issues & Solutions

### 1. CORS Errors
- Ensure FRONTEND_URL is set correctly on Render
- Check that CORS includes your Vercel domain

### 2. OAuth Redirect Mismatch
- Verify redirect URI in Google Console matches exactly
- Check GOOGLE_REDIRECT_URI environment variable

### 3. 404 on Auth Callback
- Ensure frontend is deployed to Vercel
- Check that /auth/callback route exists in frontend
- Verify FRONTEND_URL points to Vercel, not Render

## Deployment Steps

1. Deploy backend to Render with all environment variables
2. Deploy frontend to Vercel with VITE_API_URL
3. Update Google OAuth console with both URLs
4. Test the OAuth flow end-to-end

## Local Development
```
# Backend
npm run dev

# Frontend (in separate terminal)
VITE_API_URL=http://localhost:5000 npm run dev:client
```
