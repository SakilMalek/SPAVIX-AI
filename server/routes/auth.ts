import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Database } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { getJWTSecret } from '../config/secrets.js';
import { signupSchema, loginSchema, googleAuthSchema, validateRequest } from '../middleware/validation.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/authCookie.js';
import { Errors, asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { emailService } from '../services/email.js';
import { TokenManager } from '../utils/tokenManager.js';

export const authRoutes = Router();

// OAuth state validation schema
const oauthStateSchema = z.object({
  state: z.string().min(32, 'Invalid OAuth state'),
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional(),
  picture: z.string().url().optional(),
});

authRoutes.post('/signup', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const validated = validateRequest(signupSchema, req.body);
  const { email, password, profilePicture } = validated;
  const rememberMe = req.body.rememberMe === true;

  logger.info('Signup attempt', { email, rememberMe });

  const existingUser = await Database.getUserByEmail(email);
  if (existingUser) {
    logger.logSecurity('Signup: User already exists', 'low', { email });
    throw Errors.duplicate('User');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Database.createUser(email, passwordHash, undefined, profilePicture);

  // Generate token pair with refresh token
  const tokenPair = TokenManager.generateTokenPair(user.id, email, rememberMe);

  // Create session in database
  const deviceInfo = TokenManager.extractDeviceInfo(req.headers['user-agent']);
  const refreshTokenHash = TokenManager.hashToken(tokenPair.refreshToken);
  const accessTokenHash = TokenManager.hashToken(tokenPair.accessToken);
  const expiresAt = TokenManager.getRefreshTokenExpiryDate(rememberMe);

  await Database.createSession(
    user.id,
    refreshTokenHash,
    accessTokenHash,
    expiresAt,
    deviceInfo,
    req.ip,
    req.headers['user-agent']
  );

  const savedUser = await Database.getUserById(user.id);

  logger.logAuth('User signup successful', user.id, { email, rememberMe });

  res.json({
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
    user: { id: user.id, email, picture: savedUser?.picture || profilePicture }
  });
}));

authRoutes.post('/login', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const validated = validateRequest(loginSchema, req.body);
  const { email, password } = validated;
  const rememberMe = req.body.rememberMe === true;

  logger.info('Login attempt', { email, rememberMe });

  const user = await Database.getUserByEmail(email);
  if (!user) {
    logger.logSecurity('Login: User not found', 'low', { email });
    throw Errors.invalidCredentials();
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    logger.logSecurity('Login: Invalid password', 'medium', { userId: user.id, email });
    throw Errors.invalidCredentials();
  }

  // Generate token pair with refresh token
  const tokenPair = TokenManager.generateTokenPair(user.id, user.email, rememberMe);

  // Create session in database
  const deviceInfo = TokenManager.extractDeviceInfo(req.headers['user-agent']);
  const refreshTokenHash = TokenManager.hashToken(tokenPair.refreshToken);
  const accessTokenHash = TokenManager.hashToken(tokenPair.accessToken);
  const expiresAt = TokenManager.getRefreshTokenExpiryDate(rememberMe);

  await Database.createSession(
    user.id,
    refreshTokenHash,
    accessTokenHash,
    expiresAt,
    deviceInfo,
    req.ip,
    req.headers['user-agent']
  );

  logger.logAuth('User login successful', user.id, { email, rememberMe });

  res.json({
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
    user: { id: user.id, email: user.email, picture: user.picture, name: user.name }
  });
}));

authRoutes.get('/google/callback', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code, state } = req.query;

  if (!code || !state) {
    logger.logSecurity('Google OAuth: Missing code or state', 'high', { hasCode: !!code, hasState: !!state });
    res.status(400).json({ error: 'Missing authorization code or state' });
    return;
  }

  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Determine redirect URI based on environment
    const redirectUri = isProduction 
      ? 'https://spavix-ai.onrender.com/api/auth/google/callback'
      : 'http://localhost:5000/api/auth/google/callback';

    logger.info('Google OAuth callback initiated', {
      redirectUri,
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret,
      code: code ? `${String(code).substring(0, 20)}...` : 'missing',
      state: state ? `${String(state).substring(0, 20)}...` : 'missing'
    });

    if (!googleClientId || !googleClientSecret) {
      logger.error('Google OAuth credentials not configured');
      res.status(500).json({ error: 'OAuth not configured' });
      return;
    }

    // Exchange authorization code for access token
    const tokenBody = new URLSearchParams({
      code: code as string,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString();

    logger.info('Sending token exchange request to Google', {
      redirectUri,
      clientIdLength: googleClientId?.length,
      clientSecretLength: googleClientSecret?.length,
      codeLength: String(code).length
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error(`Google OAuth: Token exchange failed - Status ${tokenResponse.status}: ${errorText}`);
      logger.info('Token exchange debug', {
        redirectUri,
        clientIdSet: !!googleClientId,
        clientSecretSet: !!googleClientSecret
      });
      res.status(400).json({ error: 'Failed to exchange authorization code', details: errorText });
      return;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      logger.logSecurity('Google OAuth: Failed to fetch user info', 'medium', { status: userInfoResponse.status });
      res.status(400).json({ error: 'Failed to fetch user information' });
      return;
    }

    const googleUser = await userInfoResponse.json();
    const { email, name, picture } = googleUser;

    logger.info('Google OAuth callback: User info retrieved', { email });

    // Find or create user
    let user = await Database.getUserByEmail(email);

    if (!user) {
      logger.info('Creating new user from Google OAuth', { email });
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const newUser = await Database.createUser(email, passwordHash, name, picture);
      user = {
        id: newUser.id,
        email,
        password_hash: passwordHash,
        name: name || undefined,
        picture: picture || undefined,
      };
      logger.logAuth('User created via Google OAuth', user.id, { email });
    } else {
      if (name || picture) {
        await Database.updateUserProfile(user.id, name, picture);
      }
      user = {
        ...user,
        name: name || user.name,
        picture: picture || user.picture,
      };
      logger.logAuth('User login via Google OAuth', user.id, { email });
    }

    // Generate token pair with refresh token (default 7 days for OAuth)
    const tokenPair = TokenManager.generateTokenPair(user.id, user.email, false);

    // Create session in database
    const deviceInfo = TokenManager.extractDeviceInfo(req.headers['user-agent']);
    const refreshTokenHash = TokenManager.hashToken(tokenPair.refreshToken);
    const accessTokenHash = TokenManager.hashToken(tokenPair.accessToken);
    const expiresAt = TokenManager.getRefreshTokenExpiryDate(false);

    await Database.createSession(
      user.id,
      refreshTokenHash,
      accessTokenHash,
      expiresAt,
      deviceInfo,
      req.ip,
      req.headers['user-agent']
    );

    // Redirect to frontend with tokens
    const frontendUrl = isProduction 
      ? 'https://spavix-ai.vercel.app'
      : 'http://localhost:5000'; // Vite default port
    
    const callbackUrl = `${frontendUrl}/auth/callback?accessToken=${tokenPair.accessToken}&refreshToken=${tokenPair.refreshToken}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}&picture=${encodeURIComponent(picture || '')}`;
    logger.info(`Redirecting to frontend callback: ${callbackUrl}`);
    res.redirect(callbackUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Google OAuth callback error: ${errorMessage}`);
    res.status(500).json({ error: 'Authentication failed' });
  }
}));

authRoutes.post('/google', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const validated = validateRequest(oauthStateSchema, req.body);
  const { state, email, name, picture } = validated;
  
  // Validate OAuth state parameter (CSRF protection)
  const sessionState = req.session?.oauthState;
  if (!sessionState || sessionState !== state) {
    logger.logSecurity('OAuth: Invalid state parameter', 'high', { email, hasSessionState: !!sessionState });
    throw Errors.unauthorized('Invalid OAuth state - possible CSRF attack');
  }
  
  // Clear the state after validation
  if (req.session) {
    delete req.session.oauthState;
  }
  
  logger.info('Google OAuth login attempt', { email });

  let user = await Database.getUserByEmail(email);

  if (!user) {
    logger.info('Creating new user from Google OAuth', { email });
    const randomPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    const newUser = await Database.createUser(email, passwordHash, name, picture);
    user = {
      id: newUser.id,
      email,
      password_hash: passwordHash,
      name: name || undefined,
      picture: picture || undefined,
    };
    logger.logAuth('User created via Google OAuth', user.id, { email });
  } else {
    if (name || picture) {
      await Database.updateUserProfile(user.id, name, picture);
    }
    user = {
      ...user,
      name: name || user.name,
      picture: picture || user.picture,
    };
    logger.logAuth('User login via Google OAuth', user.id, { email });
  }

  const jwtToken = jwt.sign(
    { userId: user.id, email: user.email },
    getJWTSecret(),
    { expiresIn: '7d' }
  );

  res.json({
    token: jwtToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || null,
      picture: user.picture || null,
    },
  });
}));

authRoutes.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  const user = await Database.getUserById(req.user.id);
  if (!user) {
    throw Errors.notFound('User');
  }

  // Get subscription info
  const subResult = await Database.query(
    `SELECT plan_name, status FROM user_subscriptions WHERE user_id = $1`,
    [user.id]
  );

  const subscription = subResult.rows[0] || { plan_name: 'starter', status: 'active' };

  res.json({ 
    id: user.id, 
    email: user.email, 
    picture: user.picture, 
    name: user.name,
    subscription_plan: subscription.plan_name,
    subscription_status: subscription.status
  });
}));

authRoutes.put('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  const { name, picture } = req.body;
  await Database.updateUserProfile(req.user.id, name, picture);

  const user = await Database.getUserById(req.user.id);
  if (!user) {
    throw Errors.notFound('User');
  }

  res.json({ id: user.id, email: user.email, picture: user.picture, name: user.name });
}));

// Forgot password route
authRoutes.post('/forgot-password', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw Errors.validationError('Email is required');
  }

  // Check if user exists
  const user = await Database.getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists or not for security
    logger.logSecurity('Forgot password: User not found', 'low', { email });
    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    return;
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user.id, email, type: 'password-reset' },
    getJWTSecret(),
    { expiresIn: '1h' }
  );

  // Store token in database with 1 hour expiry
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await Database.createPasswordResetToken(user.id, resetToken, expiresAt);

  // Build reset link
  const frontendUrl = process.env.FRONTEND_URL || 'https://spavix-ai.vercel.app';
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  // Send email
  const emailSent = await emailService.sendPasswordResetEmail(email, resetLink);

  logger.info('Password reset token generated and email sent', { email, userId: user.id, emailSent });

  res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
}));

// Change password route
authRoutes.post('/change-password', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long' });
    return;
  }

  try {
    if (!req.user) {
      throw Errors.unauthorized('User not authenticated');
    }

    // Get user with password
    const user = await Database.getUserByIdWithPassword(req.user.id);
    if (!user) {
      throw Errors.notFound('User');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      logger.logSecurity('Change password: Invalid current password', 'medium', { userId: req.user.id });
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await Database.updateUserPassword(req.user.id, newPasswordHash);

    logger.logAuth('Password changed successfully', req.user.id);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error:', error instanceof Error ? error : new Error(String(error)));
    if (error instanceof Error) {
      throw Errors.internalError('Failed to change password');
    }
    throw Errors.internalError('Unknown error occurred');
  }
}));

// Reset password route
authRoutes.post('/reset-password', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw Errors.validationError('Token and new password are required');
  }

  if (newPassword.length < 8) {
    throw Errors.validationError('Password must be at least 8 characters long');
  }

  // Verify token exists and is not expired
  const resetTokenRecord = await Database.getPasswordResetToken(token);
  if (!resetTokenRecord) {
    logger.logSecurity('Reset password: Invalid or expired token', 'medium', { token: token.substring(0, 20) });
    throw Errors.unauthorized('Invalid or expired reset token');
  }

  // Verify JWT token signature
  try {
    jwt.verify(token, getJWTSecret());
  } catch (error) {
    logger.logSecurity('Reset password: Invalid token signature', 'medium', { error: error instanceof Error ? error.message : String(error) });
    throw Errors.unauthorized('Invalid reset token');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update user password
  const updated = await Database.updateUserPassword(resetTokenRecord.user_id, passwordHash);
  if (!updated) {
    throw Errors.internalError('Failed to update password');
  }

  // Delete the used token
  await Database.deletePasswordResetToken(token);

  logger.logAuth('Password reset successfully', resetTokenRecord.user_id);

  res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
}));

authRoutes.post('/logout', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true });
}));
