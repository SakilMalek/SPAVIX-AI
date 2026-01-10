# Forgot Password Feature Setup Guide

## Overview
The forgot password feature allows users to reset their password via email. The flow includes:
1. User requests password reset via email
2. System generates a secure token and sends reset link via email
3. User clicks link and is redirected to reset password page
4. User sets new password and can login

## Backend Setup

### 1. Database Migration
The password reset tokens table is automatically created during database initialization. It includes:
- `password_reset_tokens` table with fields:
  - `id`: UUID primary key
  - `user_id`: References users table
  - `token`: JWT token (unique)
  - `expires_at`: Token expiration time (1 hour)
  - `created_at`: Creation timestamp

### 2. Environment Variables
Add these to your `.env` file for email configuration:

```env
# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Frontend URL (for reset link)
FRONTEND_URL=https://spavix-ai.vercel.app
```

#### Gmail Setup Instructions:
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use the 16-character password as `EMAIL_PASSWORD`

#### Alternative Email Providers:
- **SendGrid**: Use SMTP credentials from SendGrid dashboard
- **Mailgun**: Use SMTP credentials from Mailgun console
- **AWS SES**: Configure with SMTP endpoint

### 3. API Endpoints

#### POST `/api/auth/forgot-password`
Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Security Notes:**
- Returns same message whether user exists or not (prevents email enumeration)
- Token expires in 1 hour
- Token is stored in database and verified before password reset

#### POST `/api/auth/reset-password`
Reset password using the token from email.

**Request:**
```json
{
  "token": "jwt-token-from-email",
  "newPassword": "NewPassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Frontend Setup

### 1. Forgot Password Page (`/forgot-password`)
- User enters email address
- System sends reset email
- Shows confirmation message

**Features:**
- Email validation
- Loading state during request
- Success confirmation with email display
- Link to retry if email not received

### 2. Reset Password Page (`/reset-password`)
- Accessed via link in email: `/reset-password?token=<jwt-token>`
- User enters new password and confirms
- Password strength validation
- Success confirmation with auto-redirect to login

**Features:**
- Password strength requirements display
- Confirm password field
- Error handling for expired/invalid tokens
- Auto-redirect to login on success

## Email Template

The password reset email includes:
- Professional HTML formatting
- Clear call-to-action button
- Fallback text link
- 1-hour expiration notice
- Security reminder

## Database Methods

### Available Methods in `Database` class:

```typescript
// Create a password reset token
static async createPasswordResetToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<{ id: string }>

// Get valid password reset token
static async getPasswordResetToken(
  token: string
): Promise<{ id: string; user_id: string; expires_at: string } | null>

// Delete password reset token
static async deletePasswordResetToken(
  token: string
): Promise<boolean>

// Clean up expired tokens
static async deleteExpiredPasswordResetTokens(): Promise<void>
```

## Security Considerations

1. **Token Storage**: Tokens are stored in database and verified before use
2. **Token Expiration**: Tokens expire after 1 hour
3. **One-Time Use**: Tokens are deleted after successful password reset
4. **Email Verification**: No email verification required (user already has access to email)
5. **Rate Limiting**: Consider implementing rate limiting on forgot-password endpoint
6. **HTTPS Only**: Always use HTTPS in production
7. **Password Hashing**: Passwords are hashed with bcryptjs (10 rounds)

## Testing

### Manual Testing Flow:

1. **Request Reset:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Check Email**: Look for reset link in email

3. **Reset Password:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"<token-from-email>","newPassword":"NewPassword123"}'
   ```

4. **Login**: Use new password to login

### Frontend Testing:

1. Navigate to `/forgot-password`
2. Enter email address
3. Check email for reset link
4. Click link (should redirect to `/reset-password?token=...`)
5. Enter new password
6. Submit form
7. Should redirect to login
8. Login with new password

## Troubleshooting

### Email Not Sending
- Check `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Verify email provider SMTP settings
- Check server logs for email service errors
- Ensure `nodemailer` package is installed: `npm install nodemailer`

### Invalid Token Error
- Token may have expired (1 hour limit)
- User should request new reset link
- Check database for `password_reset_tokens` table

### Password Reset Fails
- Verify password meets requirements (8+ chars, uppercase, lowercase, number)
- Check user exists in database
- Verify token is valid and not expired

### CORS Issues
- Ensure frontend URL matches `FRONTEND_URL` env variable
- Check CORS configuration in Express server

## Cleanup

### Scheduled Token Cleanup
Add this to a cron job or background task to clean expired tokens:

```typescript
// Run periodically (e.g., every hour)
await Database.deleteExpiredPasswordResetTokens();
```

## Future Enhancements

1. **Rate Limiting**: Limit forgot-password requests per email/IP
2. **Email Verification**: Add email verification step before password reset
3. **SMS Option**: Add SMS-based password reset
4. **Security Questions**: Add security questions as additional verification
5. **Login History**: Track login attempts and alert on suspicious activity
6. **Two-Factor Authentication**: Add 2FA support
7. **Token Customization**: Allow custom token expiration times
8. **Email Templates**: Support custom email templates

## Dependencies

- `nodemailer`: ^6.9.7 - Email sending
- `@types/nodemailer`: ^6.4.14 - TypeScript types
- `jsonwebtoken`: ^9.0.0 - JWT token generation
- `bcryptjs`: ^2.4.3 - Password hashing
- `pg`: ^8.16.3 - Database connection

All dependencies are already included in `package.json`.
