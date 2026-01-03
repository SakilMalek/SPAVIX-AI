import { Response } from 'express';

/**
 * Set secure authentication cookie with JWT token
 * Uses HTTP-only flag to prevent XSS attacks
 * Uses Secure flag to ensure HTTPS in production
 * Uses SameSite to prevent CSRF attacks
 */
export function setAuthCookie(res: Response, token: string, maxAge: number = 7 * 24 * 60 * 60 * 1000) {
  res.cookie('auth_token', token, {
    httpOnly: true,           // Prevents JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',       // Prevents CSRF attacks
    maxAge: maxAge,           // 7 days by default
    path: '/',
    signed: false,            // Not signed since token is already signed JWT
  });
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(res: Response) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

/**
 * Get token from cookie (for middleware use)
 */
export function getTokenFromCookie(cookieString: string | undefined): string | null {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'auth_token' && value) {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}
