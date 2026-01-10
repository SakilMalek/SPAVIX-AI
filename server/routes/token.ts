import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { TokenManager } from '../utils/tokenManager.js';
import { Database } from '../db.js';
import { logger } from '../utils/logger.js';

const tokenRoutes = Router();

/**
 * POST /api/token/refresh
 * Refresh access token using refresh token
 */
tokenRoutes.post('/refresh', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.logSecurity('Token refresh: Missing refresh token', 'medium');
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    // Verify refresh token
    const decoded = TokenManager.verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      logger.logSecurity('Token refresh: Invalid token type', 'high', { type: decoded.type });
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    // Hash refresh token to look up session
    const refreshTokenHash = TokenManager.hashToken(refreshToken);

    // Get session from database
    const session = await Database.getSessionByRefreshToken(refreshTokenHash);

    if (!session) {
      logger.logSecurity('Token refresh: Session not found or expired', 'high', { userId: decoded.userId });
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Verify user still exists
    const user = await Database.getUserById(session.user_id);
    if (!user) {
      logger.logSecurity('Token refresh: User not found', 'high', { userId: session.user_id });
      await Database.revokeSession(session.id);
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Generate new access token
    const newAccessToken = TokenManager.generateAccessToken(user.id, user.email);
    const accessTokenHash = TokenManager.hashToken(newAccessToken);

    // Update session with new access token
    await Database.updateSessionAccessToken(session.id, accessTokenHash);

    logger.info('Token refreshed successfully', { userId: user.id, sessionId: session.id });

    res.json({
      accessToken: newAccessToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.logSecurity('Token refresh: Invalid or expired token', 'medium', { error: error.message });
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }
    throw error;
  }
}));

/**
 * POST /api/token/revoke
 * Revoke a specific session (logout from one device)
 */
tokenRoutes.post('/revoke', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const decoded = TokenManager.verifyToken(refreshToken);
    const refreshTokenHash = TokenManager.hashToken(refreshToken);

    const session = await Database.getSessionByRefreshToken(refreshTokenHash);
    if (session) {
      await Database.revokeSession(session.id);
      logger.logAuth('Session revoked', session.user_id, { sessionId: session.id });
    }

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    // Even if token is invalid, return success (idempotent)
    res.json({ message: 'Session revoked successfully' });
  }
}));

/**
 * POST /api/token/revoke-all
 * Revoke all sessions for the authenticated user (logout from all devices)
 */
tokenRoutes.post('/revoke-all', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await Database.revokeAllUserSessions(req.user.id);
  logger.logAuth('All sessions revoked', req.user.id);

  res.json({ message: 'All sessions revoked successfully' });
}));

/**
 * GET /api/token/sessions
 * Get all active sessions for the authenticated user
 */
tokenRoutes.get('/sessions', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const sessions = await Database.getUserActiveSessions(req.user.id);

  res.json({
    sessions: sessions.map(session => ({
      id: session.id,
      deviceInfo: session.device_info,
      ipAddress: session.ip_address,
      userAgent: session.user_agent,
      createdAt: session.created_at,
      lastActivity: session.last_activity
    }))
  });
}));

export default tokenRoutes;
