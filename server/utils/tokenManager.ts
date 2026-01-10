import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getJWTSecret } from '../config/secrets.js';

/**
 * Token Manager for Phase 2 Refresh Token Implementation
 * Handles creation and validation of access and refresh tokens
 */

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
  private static readonly REFRESH_TOKEN_EXPIRY_EXTENDED = '30d'; // 30 days for "Remember Me"

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(userId: string, email: string, rememberMe: boolean = false): TokenPair {
    const secret = getJWTSecret();
    const refreshExpiry = rememberMe ? this.REFRESH_TOKEN_EXPIRY_EXTENDED : this.REFRESH_TOKEN_EXPIRY;

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId, email, type: 'access' } as TokenPayload,
      secret,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' } as TokenPayload,
      secret,
      { expiresIn: refreshExpiry }
    );

    // Calculate expiry timestamps
    const accessTokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiry = Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;

    return {
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry
    };
  }

  /**
   * Verify and decode a token
   */
  static verifyToken(token: string): TokenPayload {
    const secret = getJWTSecret();
    return jwt.verify(token, secret) as TokenPayload;
  }

  /**
   * Hash a token for secure storage (SHA-256)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a new access token from a refresh token
   */
  static generateAccessToken(userId: string, email: string): string {
    const secret = getJWTSecret();
    return jwt.sign(
      { userId, email, type: 'access' } as TokenPayload,
      secret,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Calculate expiry date for refresh token
   */
  static getRefreshTokenExpiryDate(rememberMe: boolean = false): Date {
    const days = rememberMe ? 30 : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Extract device information from request
   */
  static extractDeviceInfo(userAgent?: string): any {
    if (!userAgent) return null;

    // Simple device info extraction
    const isChrome = /Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !isChrome;
    const isEdge = /Edg/.test(userAgent);
    
    const isWindows = /Windows/.test(userAgent);
    const isMac = /Macintosh/.test(userAgent);
    const isLinux = /Linux/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isIOS = /iPhone|iPad/.test(userAgent);

    return {
      browser: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : 'Unknown',
      os: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : isAndroid ? 'Android' : isIOS ? 'iOS' : 'Unknown',
      isMobile: isAndroid || isIOS
    };
  }
}
