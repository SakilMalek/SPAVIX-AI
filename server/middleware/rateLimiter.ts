import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

/**
 * Simple in-memory rate limiter for auth endpoints
 * Prevents brute force attacks and spam
 */
export class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number; // Time window in milliseconds
  private maxRequests: number; // Max requests per window

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private getKey(req: Request): string {
    // Use IP address as the key
    return (req.ip || req.socket.remoteAddress || 'unknown') as string;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getKey(req);
      const now = Date.now();

      if (!this.store[key]) {
        this.store[key] = { count: 1, resetTime: now + this.windowMs };
        next();
        return;
      }

      const record = this.store[key];

      // Reset if window has expired
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + this.windowMs;
        next();
        return;
      }

      // Increment count
      record.count++;

      // Check if limit exceeded
      if (record.count > this.maxRequests) {
        res.status(429).json({
          error: 'Too many requests, please try again later',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }

      next();
    };
  }
}

// Create rate limiters for different endpoints
export const loginLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const signupLimiter = new RateLimiter(60 * 60 * 1000, 3); // 3 attempts per hour
export const forgotPasswordLimiter = new RateLimiter(60 * 60 * 1000, 3); // 3 attempts per hour
export const refreshTokenLimiter = new RateLimiter(60 * 1000, 10); // 10 attempts per minute
