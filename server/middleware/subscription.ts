/**
 * Subscription Middleware
 * Feature gating and usage limit enforcement
 */

import { Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.js';
import { Database } from '../db.js';
import { logger } from '../utils/logger.js';
import type { AuthRequest } from './auth.js';

/**
 * Middleware to check if user has access to a specific feature
 */
export const requireFeature = (feature: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const hasAccess = await SubscriptionService.canPerformAction(req.user.id, feature);
      
      if (!hasAccess) {
        const planInfo = await SubscriptionService.getUserPlan(req.user.id);
        
        res.status(403).json({ 
          error: 'Upgrade required',
          message: `This feature requires a higher subscription plan`,
          feature,
          currentPlan: planInfo?.plan.name || 'none',
          upgradeUrl: '/pricing',
          code: 'FEATURE_LOCKED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Feature check failed', error as Error, { feature, userId: req.user?.id });
      res.status(500).json({ 
        error: 'Failed to verify feature access',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to check usage limits before allowing action
 */
export const checkUsageLimit = (resourceType: 'transformation' | 'api_call' | 'export') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const canUse = await SubscriptionService.canPerformAction(
        req.user.id, 
        resourceType === 'transformation' ? 'transformation' : resourceType
      );
      
      if (!canUse) {
        const stats = await SubscriptionService.getUsageStats(req.user.id);
        
        res.status(429).json({ 
          error: 'Usage limit reached',
          message: 'You have reached your monthly limit. Upgrade to Pro for unlimited transformations.',
          resourceType,
          usage: stats?.current_period,
          limits: stats?.limits,
          upgradeUrl: '/pricing',
          code: 'USAGE_LIMIT_EXCEEDED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Usage limit check failed', error as Error, { resourceType, userId: req.user?.id });
      res.status(500).json({ 
        error: 'Failed to verify usage limit',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware to track usage after successful action
 */
export const trackUsage = (resourceType: 'transformation' | 'api_call' | 'export') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store the original send function
    const originalSend = res.send;

    // Override send to track usage on successful response
    res.send = function (data: any): Response {
      // Only track on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        SubscriptionService.trackUsage(req.user.id, resourceType)
          .catch(error => {
            logger.error('Failed to track usage', error as Error, { 
              resourceType, 
              userId: req.user?.id 
            });
          });
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to check if user's plan is active
 */
export const requireActivePlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    const planInfo = await SubscriptionService.getUserPlan(req.user.id);
    
    if (!planInfo) {
      res.status(403).json({ 
        error: 'No active subscription',
        message: 'Your subscription is not active. Please contact support.',
        code: 'NO_ACTIVE_SUBSCRIPTION'
      });
      return;
    }

    if (planInfo.subscription.status !== 'active') {
      res.status(403).json({ 
        error: 'Subscription not active',
        message: `Your subscription status is: ${planInfo.subscription.status}`,
        status: planInfo.subscription.status,
        code: 'SUBSCRIPTION_INACTIVE'
      });
      return;
    }

    // Attach plan info to request for later use
    (req as any).planInfo = planInfo;

    next();
  } catch (error) {
    logger.error('Active plan check failed', error as Error, { userId: req.user?.id });
    res.status(500).json({ 
      error: 'Failed to verify subscription status',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware to enforce plan-specific limits
 */
export const enforcePlanLimits = {
  /**
   * Check if user can create more projects
   */
  checkProjectLimit: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const planInfo = await SubscriptionService.getUserPlan(req.user.id);
      if (!planInfo) {
        res.status(403).json({ error: 'No active subscription' });
        return;
      }

      const maxProjects = planInfo.limits.max_projects as number;
      
      // -1 means unlimited
      if (maxProjects === -1) {
        next();
        return;
      }

      // Count user's projects
      const countResult = await Database.query(
        'SELECT COUNT(*) as count FROM projects WHERE user_id = $1',
        [req.user.id]
      );

      const projectCount = parseInt(countResult.rows[0].count);

      if (projectCount >= maxProjects) {
        res.status(403).json({
          error: 'Project limit reached',
          message: `You can only create ${maxProjects} projects on the ${planInfo.plan.display_name} plan`,
          currentCount: projectCount,
          limit: maxProjects,
          upgradeUrl: '/pricing',
          code: 'PROJECT_LIMIT_EXCEEDED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Project limit check failed', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to verify project limit' });
    }
  },

  /**
   * Check if user can add more team members
   */
  checkTeamMemberLimit: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const planInfo = await SubscriptionService.getUserPlan(req.user.id);
      if (!planInfo) {
        res.status(403).json({ error: 'No active subscription' });
        return;
      }

      const maxTeamMembers = planInfo.limits.max_team_members as number;
      
      // 0 means no team collaboration
      if (maxTeamMembers === 0) {
        res.status(403).json({
          error: 'Team collaboration not available',
          message: 'Upgrade to Business plan for team collaboration',
          upgradeUrl: '/pricing',
          code: 'FEATURE_LOCKED'
        });
        return;
      }

      // -1 means unlimited
      if (maxTeamMembers === -1) {
        next();
        return;
      }

      // Count team members
      const countResult = await Database.query(
        'SELECT COUNT(*) as count FROM team_members WHERE team_owner_id = $1 AND status != $2',
        [req.user.id, 'removed']
      );

      const memberCount = parseInt(countResult.rows[0].count);

      if (memberCount >= maxTeamMembers) {
        res.status(403).json({
          error: 'Team member limit reached',
          message: `You can only have ${maxTeamMembers} team members on the ${planInfo.plan.display_name} plan`,
          currentCount: memberCount,
          limit: maxTeamMembers,
          upgradeUrl: '/pricing',
          code: 'TEAM_LIMIT_EXCEEDED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Team member limit check failed', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to verify team member limit' });
    }
  }
};

/**
 * Get user's plan info and attach to request
 */
export const attachPlanInfo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      const planInfo = await SubscriptionService.getUserPlan(req.user.id);
      (req as any).planInfo = planInfo;
    }
    next();
  } catch (error) {
    logger.error('Failed to attach plan info', error as Error, { userId: req.user?.id });
    next(); // Continue even if this fails
  }
};
