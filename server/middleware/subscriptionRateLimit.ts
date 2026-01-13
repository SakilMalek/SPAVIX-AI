import { Request, Response, NextFunction } from 'express';
import { Database } from '../db.js';
import { logger } from '../utils/logger.js';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

// Rate limits per subscription plan (requests per hour)
const RATE_LIMITS = {
  starter: 5,      // 5 generations per hour
  pro: 50,         // 50 generations per hour
  business: 500,   // 500 generations per hour
  free: 0,         // No generations allowed
};

/**
 * Subscription-based rate limiting middleware
 * Applies different rate limits based on user's subscription plan
 */
export function subscriptionRateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id;
  
  if (!userId) {
    // Not authenticated, skip rate limiting
    return next();
  }

  // Fetch user's subscription plan and apply rate limit
  (async () => {
    try {
      // Get user's subscription plan
      const result = await Database.query(
        `SELECT p.name FROM user_subscriptions us
         JOIN plans p ON us.plan_id = p.id
         WHERE us.user_id = $1 AND us.status = 'active'
         LIMIT 1`,
        [userId]
      );

      const planName = result.rows[0]?.name || 'starter';
      const limit = RATE_LIMITS[planName as keyof typeof RATE_LIMITS] || RATE_LIMITS.starter;

      // If plan has no generations allowed, reject immediately
      if (limit === 0) {
        res.status(403).json({
          error: 'Your subscription plan does not include generation access',
          planName,
        });
        return;
      }

      const now = Date.now();
      const key = `gen-${userId}`;

      // Initialize or get existing record
      if (!store[key]) {
        store[key] = { count: 0, resetTime: now + 60 * 60 * 1000 };
      }

      const record = store[key];

      // Reset if window has passed
      if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + 60 * 60 * 1000;
      }

      // Increment counter
      record.count++;

      // Set rate limit headers
      const remaining = Math.max(0, limit - record.count);
      const resetTime = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

      // Check if limit exceeded
      if (record.count > limit) {
        res.status(429).json({
          error: 'Generation limit exceeded, please try again later.',
          planName,
          limit,
          used: record.count - 1,
          retryAfter: resetTime,
        });
        return;
      }

      next();
    } catch (error) {
      logger.warn('Failed to fetch user subscription for rate limiting', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // On error, allow request to proceed (fail open)
      next();
    }
  })();
}

/**
 * Clean up expired entries periodically
 * Runs every 10 minutes to prevent memory leaks
 */
export function startSubscriptionRateLimitCleanup() {
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
      logger.info(`[SubscriptionRateLimit] Cleaned up ${cleaned} expired entries`);
    }
  }, 10 * 60 * 1000); // Every 10 minutes
}
