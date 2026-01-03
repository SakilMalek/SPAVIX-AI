# Security Setup Guide

## Required Environment Variables

The application enforces the following required environment variables at startup. If any are missing, the server will fail to start with a clear error message.

### JWT Configuration

**JWT_SECRET** (Required)
- Used to sign and verify JWT authentication tokens
- Minimum length: 32 characters
- Must be a strong random string
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### Session Configuration

**SESSION_SECRET** (Required)
- Used to sign session cookies
- Minimum length: 32 characters
- Must be a strong random string (different from JWT_SECRET)
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Example: `z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v9`
- Sessions are stored in PostgreSQL (not in-memory)
- Session table is created automatically on first run

### Gemini API Configuration

**GEMINI_API_KEY** (Required)
- API key for Google Gemini API
- Obtain from: https://ai.google.dev/
- Used for image generation and chat features

### Database Configuration

**DATABASE_URL** (Required)
- PostgreSQL connection string
- Format: `postgresql://user:password@host:port/database`
- Example: `postgresql://spavix:password@localhost:5432/spavix_db`

### Frontend Configuration

**FRONTEND_URL** (Optional)
- URL of the frontend application
- Used for OAuth redirects and CORS
- Default: `http://localhost:5000`
- Example: `https://spavix-ai.vercel.app`

**NODE_ENV** (Optional)
- Environment mode: `development` or `production`
- Default: `development`
- In production, enforces HTTPS and secure cookies

## Setup Instructions

1. Generate secure secrets:
   ```bash
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
   node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Create `.env` file in project root with all required variables:
   ```
   JWT_SECRET=<generated-secret>
   SESSION_SECRET=<generated-secret>
   GEMINI_API_KEY=<your-api-key>
   DATABASE_URL=postgresql://user:password@host:port/database
   FRONTEND_URL=http://localhost:5000
   NODE_ENV=development
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

   If any required environment variable is missing, you'll see:
   ```
   ❌ Secret validation failed: FATAL: JWT_SECRET environment variable is required...
   ```

## Security Best Practices

- Never commit `.env` file to git
- Rotate secrets regularly in production
- Use different secrets for development and production
- Store secrets in secure secret management system (AWS Secrets Manager, HashiCorp Vault, etc.)
- Ensure minimum 32-character length for all secrets
- Use cryptographically secure random generation

## Token Expiration

- JWT tokens expire after 7 days
- Session cookies expire after 24 hours
- Implement token refresh mechanism for long-lived sessions (future enhancement)

## Troubleshooting

### "JWT_SECRET environment variable is required"
- Ensure JWT_SECRET is set in your `.env` file
- Verify it's at least 32 characters long
- Restart the server after setting the variable

### "SESSION_SECRET must be at least 32 characters long"
- Generate a new SESSION_SECRET using the command above
- Ensure it's exactly 32+ characters

### "GEMINI_API_KEY environment variable is required"
- Obtain API key from https://ai.google.dev/
- Add it to your `.env` file
- Restart the server
