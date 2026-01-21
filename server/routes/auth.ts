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
import { SubscriptionService } from '../services/subscription.js';
import { loginLimiter, signupLimiter, forgotPasswordLimiter, refreshTokenLimiter } from '../middleware/rateLimiter.js';

export const authRoutes = Router();

// OAuth state validation schema
const oauthStateSchema = z.object({
  state: z.string().min(32, 'Invalid OAuth state'),
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional(),
  picture: z.string().url().optional(),
});

authRoutes.post('/signup', signupLimiter.middleware(), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  // Create subscription for new user (defaults to Starter plan)
  // Defer to background to avoid blocking signup
  setImmediate(() => {
    SubscriptionService.createSubscription(user.id, 'starter')
      .then(() => logger.info('Subscription created for new user', { userId: user.id, plan: 'starter' }))
      .catch((error) => logger.error('Failed to create subscription for new user', error instanceof Error ? error : new Error(String(error)), { userId: user.id }));
  });

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

  // Set tokens as HTTP-only cookies
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSiteValue: 'strict' | 'lax' | 'none' = isProduction ? 'none' : 'lax';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSiteValue, // Use 'none' in production for cross-origin requests (requires secure: true)
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  };
  
  res.cookie('accessToken', tokenPair.accessToken, cookieOptions);
  res.cookie('refreshToken', tokenPair.refreshToken, {
    ...cookieOptions,
    maxAge: (7 * 24 * 60 * 60 * 1000), // 7 days
  });

  res.json({
    success: true,
    expiresIn: 15 * 60, // 15 minutes in seconds
    user: { id: user.id, email, picture: savedUser?.picture || profilePicture }
  });
}));

authRoutes.post('/login', loginLimiter.middleware(), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

  // Set tokens as HTTP-only cookies
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSiteValue: 'strict' | 'lax' | 'none' = isProduction ? 'none' : 'lax';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSiteValue, // Use 'none' in production for cross-origin requests (requires secure: true)
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  };
  
  res.cookie('accessToken', tokenPair.accessToken, cookieOptions);
  res.cookie('refreshToken', tokenPair.refreshToken, {
    ...cookieOptions,
    maxAge: (7 * 24 * 60 * 60 * 1000), // 7 days
  });

  res.json({
    success: true,
    expiresIn: 15 * 60, // 15 minutes in seconds
    user: { id: user.id, email: user.email, picture: user.picture, name: user.name }
  });
}));

authRoutes.get('/google/callback', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { code, state } = req.query;

  logger.info('OAuth callback received', {
    hasCode: !!code,
    hasState: !!state,
    hasSession: !!req.session,
    sessionID: req.sessionID,
    cookies: Object.keys(req.cookies || {}),
    statePreview: state ? String(state).substring(0, 10) + '...' : 'none'
  });

  if (!code || !state) {
    logger.logSecurity('Google OAuth: Missing code or state', 'high', { hasCode: !!code, hasState: !!state });
    res.status(400).json({ error: 'Missing authorization code or state' });
    return;
  }

  // Validate OAuth state parameter (CSRF protection)
  const sessionState = req.session?.oauthState;
  
  logger.info('OAuth state validation', {
    receivedState: String(state).substring(0, 10) + '...',
    sessionState: sessionState ? sessionState.substring(0, 10) + '...' : 'none',
    sessionID: req.sessionID,
    match: sessionState === state
  });
  
  if (!sessionState || sessionState !== state) {
    logger.logSecurity('OAuth callback: Invalid state parameter', 'high', { 
      hasSessionState: !!sessionState,
      sessionID: req.sessionID,
      receivedState: String(state).substring(0, 10) + '...',
      sessionState: sessionState ? sessionState.substring(0, 10) + '...' : 'none'
    });
    res.status(400).json({ error: 'Invalid OAuth state - possible CSRF attack' });
    return;
  }

  // Clear the state after validation
  if (req.session) {
    delete req.session.oauthState;
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

      // Create subscription for new Google OAuth user (defaults to Starter plan)
      try {
        await SubscriptionService.createSubscription(user.id, 'starter');
        logger.info('Subscription created for Google OAuth user', { userId: user.id, plan: 'starter' });
      } catch (error) {
        logger.error('Failed to create subscription for Google OAuth user', error instanceof Error ? error : new Error(String(error)), { userId: user.id });
        // Don't fail OAuth flow if subscription creation fails
      }
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

    // Set tokens as HTTP-only cookies (secure, not exposed in URL)
    const sameSiteValue: 'strict' | 'lax' | 'none' = isProduction ? 'none' : 'lax';
    res.cookie('accessToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    res.cookie('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue,
      maxAge: (7 * 24 * 60 * 60 * 1000), // 7 days
      path: '/',
    });

    // Redirect to frontend callback without tokens in URL
    const frontendUrl = isProduction 
      ? 'https://spavix-ai.vercel.app'
      : 'http://localhost:5000'; // Vite default port
    
    const callbackUrl = `${frontendUrl}/auth/callback?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}&picture=${encodeURIComponent(picture || '')}`;
    logger.info(`Redirecting to frontend callback (tokens in secure cookies)`);
    // Set a temporary flag in session so frontend can claim the auth
    if (req.session) {
      req.session.authComplete = true;
      req.session.save((err) => {
        if (err) logger.error('Failed to save auth complete flag', err);
      });
    }
    res.redirect(callbackUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Google OAuth callback error: ${errorMessage}`);
    res.status(500).json({ error: 'Authentication failed' });
  }
}));

// Server-side OAuth redirect endpoint (fixes cross-domain session issue)
authRoutes.get('/google/redirect', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Generate a random state
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store state in session for validation after redirect
  if (req.session) {
    req.session.oauthState = state;
    
    // Force session save before redirecting (critical for OAuth flow)
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          logger.error('Failed to save OAuth state to session', err);
          reject(err);
        } else {
          logger.info('OAuth state saved to session', { 
            state: state.substring(0, 10) + '...', 
            sessionID: req.sessionID 
          });
          resolve();
        }
      });
    });
  } else {
    logger.error('No session available for OAuth state storage');
    throw new Error('Session not initialized');
  }
  
  // Build Google OAuth URL
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://spavix-ai.onrender.com/api/auth/google/callback'
    : 'http://localhost:5000/api/auth/google/callback';
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${googleClientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `state=${state}`;
  
  logger.info('Redirecting to Google OAuth', { sessionID: req.sessionID });
  res.redirect(googleAuthUrl);
}));

// Legacy client-side state endpoint (kept for backward compatibility)
authRoutes.post('/google/state', asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  // Generate a random state
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store state in session for validation after redirect
  if (req.session) {
    req.session.oauthState = state;
    
    // Force session save before responding (critical for OAuth flow)
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          logger.error('Failed to save OAuth state to session', err);
          reject(err);
        } else {
          logger.info('OAuth state saved to session', { 
            state: state.substring(0, 10) + '...', 
            sessionID: req.sessionID 
          });
          resolve();
        }
      });
    });
  } else {
    logger.error('No session available for OAuth state storage');
    throw new Error('Session not initialized');
  }
  
  res.json({ state });
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
    `SELECT us.status, sp.name FROM user_subscriptions us
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = $1`,
    [user.id]
  );

  const subscription = subResult.rows[0] || { name: 'starter', status: 'active' };

  res.json({ 
    id: user.id, 
    email: user.email, 
    picture: user.picture, 
    name: user.name,
    subscription_plan: subscription.name,
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
authRoutes.post('/forgot-password', forgotPasswordLimiter.middleware(), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

authRoutes.post('/update-profile', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized('Not authenticated');
  }

  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    throw Errors.validationError('Name is required');
  }

  if (name.trim().length === 0) {
    throw Errors.validationError('Name cannot be empty');
  }

  await Database.updateUserProfile(req.user.id, name);

  logger.info('Profile updated', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Profile updated successfully',
  });
}));

authRoutes.patch('/profile', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized('Not authenticated');
  }

  const { profilePicture } = req.body;

  if (!profilePicture || typeof profilePicture !== 'string') {
    throw Errors.validationError('Profile picture is required');
  }

  await Database.query(
    'UPDATE users SET picture = $1, updated_at = NOW() WHERE id = $2',
    [profilePicture, req.user.id]
  );

  logger.info('Profile picture updated', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Profile picture updated successfully',
  });
}));

authRoutes.post('/upload-picture', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized('Not authenticated');
  }

  // Get file from FormData (sent as base64 from frontend)
  const { file } = req.body;
  
  if (!file) {
    throw Errors.validationError('No file uploaded');
  }

  // Validate that it's a data URL (base64 encoded image)
  if (typeof file !== 'string' || !file.startsWith('data:image/')) {
    throw Errors.validationError('File must be a valid image');
  }

  // Update user profile picture
  await Database.query(
    'UPDATE users SET picture = $1, updated_at = NOW() WHERE id = $2',
    [file, req.user.id]
  );

  logger.info('Profile picture updated', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Profile picture updated successfully',
    picture: file,
  });
}));

authRoutes.get('/usage', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw Errors.unauthorized('Not authenticated');
  }

  // Get user's subscription
  const subResult = await Database.query(
    `SELECT current_period_start, current_period_end FROM user_subscriptions WHERE user_id = $1`,
    [req.user.id]
  );

  if ((subResult.rows as any[]).length === 0) {
    res.json({
      transformations: 0,
      limit: 5,
    });
    return;
  }

  const { current_period_start, current_period_end } = (subResult.rows as any[])[0];

  // Get transformation usage for current period
  const usageResult = await Database.query(
    `SELECT COALESCE(SUM(count), 0) as total_count 
     FROM usage_tracking 
     WHERE user_id = $1 
     AND resource_type = 'transformation'
     AND period_start = $2`,
    [req.user.id, current_period_start]
  );

  const transformationCount = parseInt((usageResult.rows as any[])[0].total_count) || 0;

  res.json({
    transformations: transformationCount,
    limit: 5,
    period_start: current_period_start,
    period_end: current_period_end,
  });
}));

authRoutes.post('/refresh', refreshTokenLimiter.middleware(), asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;
  
  if (!refreshToken) {
    throw Errors.unauthorized('No refresh token provided');
  }

  try {
    // Verify refresh token signature
    const decoded = TokenManager.verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw Errors.unauthorized('Invalid token type');
    }

    // Generate new access token
    const newAccessToken = TokenManager.generateAccessToken(decoded.userId, decoded.email);

    // Set new access token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSiteValue: 'strict' | 'lax' | 'none' = isProduction ? 'none' : 'lax';
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    logger.logAuth('Token refreshed successfully', decoded.userId);

    res.json({ success: true, expiresIn: 15 * 60 });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw Errors.unauthorized('Invalid or expired refresh token');
    }
    throw error;
  }
}));

authRoutes.post('/logout', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user) {
    await Database.revokeAllUserSessions(req.user.id);
    logger.logAuth('User logout - all sessions revoked', req.user.id);
  }
  clearAuthCookie(res);
  res.json({ success: true });
}));
