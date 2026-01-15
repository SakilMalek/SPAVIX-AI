/**
 * Feature Restriction Middleware
 * Enforces plan-based access control for premium features
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { SubscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';

/**
 * Restrict access to premium styles (Pro+ only)
 */
export const requirePremiumStyles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'Premium styles require an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.premium_styles) {
      res.status(403).json({
        error: 'Premium styles are only available in Pro and Business plans',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Pro',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Premium styles check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to high resolution exports (Pro+ only)
 */
export const requireHighResolutionExports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'High resolution exports require an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.high_resolution_exports) {
      res.status(403).json({
        error: 'High resolution exports are only available in Pro and Business plans',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Pro',
        currentResolution: '1024x1024',
        upgradeResolution: '2048x2048',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('High resolution exports check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to priority generation (Pro+ only)
 */
export const requirePriorityGeneration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'Priority generation requires an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.priority_generation) {
      res.status(403).json({
        error: 'Priority generation is only available in Pro and Business plans',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Pro',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Priority generation check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to advanced product matching (Pro+ only)
 */
export const requireAdvancedProductMatching = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'Advanced product matching requires an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.advanced_product_matching) {
      res.status(403).json({
        error: 'Advanced product matching is only available in Pro and Business plans',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Pro',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Advanced product matching check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to AI design advice (Pro+ only)
 */
export const requireAIDesignAdvice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'AI design advice requires an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.ai_design_advice) {
      res.status(403).json({
        error: 'AI design advice is only available in Pro and Business plans',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Pro',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('AI design advice check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to team collaboration (Business only)
 */
export const requireTeamCollaboration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'Team collaboration requires an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.team_collaboration) {
      res.status(403).json({
        error: 'Team collaboration is only available in the Business plan',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Business',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Team collaboration check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to API access (Business only)
 */
export const requireAPIAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'API access requires an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.api_access) {
      res.status(403).json({
        error: 'API access is only available in the Business plan',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Business',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('API access check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to custom brand styles (Business only)
 */
export const requireCustomBrandStyles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'Custom brand styles require an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.custom_brand_styles) {
      res.status(403).json({
        error: 'Custom brand styles are only available in the Business plan',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Business',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Custom brand styles check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to whitelabel reports (Business only)
 */
export const requireWhitelabelReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'Whitelabel reports require an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.whitelabel_reports) {
      res.status(403).json({
        error: 'Whitelabel reports are only available in the Business plan',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Business',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Whitelabel reports check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};

/**
 * Restrict access to bulk processing (Business only)
 */
export const requireBulkProcessing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const subscription = await SubscriptionService.getActiveSubscription(req.user.id);
    if (!subscription) {
      res.status(403).json({
        error: 'Bulk processing requires an active subscription',
        code: 'NO_SUBSCRIPTION'
      });
      return;
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features.bulk_processing) {
      res.status(403).json({
        error: 'Bulk processing is only available in the Business plan',
        code: 'FEATURE_LOCKED',
        currentPlan: subscription.plan.name,
        requiredPlan: 'Business',
        upgradeUrl: '/pricing'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Bulk processing check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify feature access' });
  }
};
