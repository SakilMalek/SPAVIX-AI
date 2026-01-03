import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  message?: string; // Error message
}

/**
 * Simple in-memory rate limiter middleware
 * For production, use redis-based rate limiter (e.g., express-rate-limit with redis store)
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = (req) => req.ip || 'unknown',
    message = 'Too many requests, please try again later.',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or get existing record
    if (!store[key]) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    const record = store[key];

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    // Increment counter
    record.count++;

    // Set rate limit headers
    const remaining = Math.max(0, max - record.count);
    const resetTime = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

    // Check if limit exceeded
    if (record.count > max) {
      res.status(429).json({
        error: message,
        retryAfter: resetTime,
      });
      return;
    }

    next();
  };
}

/**
 * Clean up expired entries periodically
 * Runs every 10 minutes to prevent memory leaks
 */
export function startRateLimitCleanup() {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const key in store) {
      if (store[key].resetTime < now) {
        delete store[key];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
    }
  }, 10 * 60 * 1000); // Every 10 minutes
}
