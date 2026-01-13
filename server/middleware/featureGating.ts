import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { SubscriptionService } from '../services/subscription.service';

/**
 * Feature gating middleware
 * Checks if user has access to a specific feature
 */
export async function requireFeature(featureKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await SubscriptionService.canUseFeature(req.user.id, featureKey);

      if (!result.allowed) {
        return res.status(403).json({
          error: 'Feature not available',
          reason: result.reason,
          feature: featureKey,
        });
      }

      next();
    } catch (error: any) {
      console.error('Error checking feature access:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

/**
 * Usage quota middleware
 * Checks if user has quota remaining for a feature
 */
export async function requireUsageQuota(featureKey: string, amount: number = 1) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const quota = await SubscriptionService.checkUsageQuota(req.user.id, featureKey, amount);

      if (!quota.allowed) {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          feature: featureKey,
        });
      }

      // Attach quota info to request for later use
      (req as any).quota = quota;

      next();
    } catch (error: any) {
      console.error('Error checking usage quota:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

/**
 * Record usage middleware
 * Automatically records usage after successful request
 */
export function recordUsageAfter(featureKey: string, amount: number = 1) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next();
      }

      // Intercept response.json to record usage after response
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        // Record usage asynchronously (don't wait for it)
        SubscriptionService.recordUsage(req.user!.id, featureKey, amount).catch((error) => {
          console.error('Error recording usage:', error);
        });

        return originalJson(data);
      };

      next();
    } catch (error: any) {
      console.error('Error in recordUsageAfter middleware:', error);
      next();
    }
  };
}

/**
 * Subscription info middleware
 * Attaches subscription info to request for use in handlers
 */
export async function attachSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return next();
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    (req as any).subscription = subscription;

    next();
  } catch (error: any) {
    console.error('Error attaching subscription:', error);
    next();
  }
}
