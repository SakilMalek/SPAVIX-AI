/**
 * Subscription Service
 * Handles subscription management, plan checks, and usage tracking
 */

import { Database } from '../db.js';
import { logger } from '../utils/logger.js';
import { PLAN_DEFINITIONS } from '../../shared/subscription-schema.js';
import type { SubscriptionPlan, UserSubscription, UsageTracking } from '../types/database.js';

export interface UserPlanInfo {
  plan: SubscriptionPlan;
  subscription: UserSubscription;
  usage: {
    transformations: number;
    api_calls: number;
    team_members: number;
  };
  limits: {
    transformations_per_month: number;
    max_projects: number;
    max_team_members: number;
    max_api_calls_per_day: number;
    max_resolution: string;
  };
}

export class SubscriptionService {
  /**
   * Create a new subscription for a user (called on signup)
   * Note: This is usually auto-created by database trigger, but kept for manual creation
   */
  static async createSubscription(userId: string, planName: string = 'starter'): Promise<void> {
    try {
      // Get plan by name from subscription_plans table
      const planResult = await Database.query(
        'SELECT id FROM subscription_plans WHERE name = $1',
        [planName.toLowerCase()]
      );
      
      if (planResult.rows.length === 0) {
        logger.warn('Plan not found, skipping subscription creation', { userId, planName });
        // Don't throw - the trigger will create the default subscription
        return;
      }
      
      const planId = (planResult.rows as any[])[0].id;

      const now = new Date();
      const billingPeriodEnd = new Date(now);
      billingPeriodEnd.setFullYear(billingPeriodEnd.getFullYear() + 1); // 1 year for free plan

      // Use UPSERT to handle case where user already has a subscription
      await Database.query(
        `INSERT INTO user_subscriptions (
          user_id, plan_id, status, current_period_start, current_period_end
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          status = 'active',
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = NOW()`,
        [userId, planId, 'active', now, billingPeriodEnd]
      );

      logger.info('Subscription created for user', { userId, plan: planName });
    } catch (error) {
      logger.error('Failed to create subscription', error as Error, { userId, planName });
      // Don't throw - let the trigger handle it
    }
  }

  /**
   * Get user's current plan with subscription details
   */
  static async getUserPlan(userId: string): Promise<UserPlanInfo | null> {
    try {
      const result = await Database.query(
        `SELECT 
          sp.*,
          us.id as subscription_id,
          us.status,
          us.current_period_start,
          us.current_period_end,
          us.cancel_at_period_end,
          us.stripe_customer_id,
          us.stripe_subscription_id
         FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id = $1 AND us.status = 'active'
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        logger.warn('No active subscription found for user', { userId });
        return null;
      }

      const row = result.rows[0];
      
      // Get current period usage
      const usage = await this.getCurrentPeriodUsage(userId, row.current_period_start, row.current_period_end);

      // Use schema-defined limits as source of truth (overrides database values)
      const planDef = Object.values(PLAN_DEFINITIONS).find(p => p.name.toLowerCase() === row.name.toLowerCase());
      const limitsFromSchema = planDef?.limits || row.limits;

      return {
        plan: {
          id: row.id,
          name: row.name,
          display_name: row.display_name,
          price: parseFloat(row.price),
          billing_cycle: row.billing_cycle,
          features: row.features,
          limits: limitsFromSchema,
          stripe_price_id: row.stripe_price_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        subscription: {
          id: row.subscription_id,
          user_id: userId,
          plan_id: row.id,
          status: row.status,
          stripe_customer_id: row.stripe_customer_id,
          stripe_subscription_id: row.stripe_subscription_id,
          current_period_start: row.current_period_start,
          current_period_end: row.current_period_end,
          cancel_at_period_end: row.cancel_at_period_end,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        usage,
        limits: limitsFromSchema,
      };
    } catch (error) {
      logger.error('Failed to get user plan', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get current period usage for a user
   */
  static async getCurrentPeriodUsage(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ transformations: number; api_calls: number; team_members: number }> {
    try {
      const result = await Database.query(
        `SELECT 
          resource_type,
          COALESCE(SUM(count), 0) as total
         FROM usage_tracking
         WHERE user_id = $1 
         AND period_start >= $2 
         AND period_end <= $3
         GROUP BY resource_type`,
        [userId, periodStart, periodEnd]
      );

      const usage = {
        transformations: 0,
        api_calls: 0,
        team_members: 0,
      };

      result.rows.forEach((row) => {
        if (row.resource_type === 'transformation') {
          usage.transformations = parseInt(row.total);
        } else if (row.resource_type === 'api_call') {
          usage.api_calls = parseInt(row.total);
        } else if (row.resource_type === 'team_member') {
          usage.team_members = parseInt(row.total);
        }
      });

      return usage;
    } catch (error) {
      logger.error('Failed to get current period usage', error as Error, { userId });
      return { transformations: 0, api_calls: 0, team_members: 0 };
    }
  }

  /**
   * Check if user can perform a specific action based on their plan
   */
  static async canPerformAction(userId: string, action: string): Promise<boolean> {
    try {
      const planInfo = await this.getUserPlan(userId);
      if (!planInfo) {
        logger.warn('User has no active plan', { userId, action });
        return false;
      }

      const { plan, usage, limits } = planInfo;

      switch (action) {
        case 'transformation':
        case 'generate_image':
          // Check if unlimited or within limit
          if (limits.transformations_per_month === -1) {
            return true; // Unlimited
          }
          return usage.transformations < limits.transformations_per_month;

        case 'premium_styles':
          return plan.features.premium_styles === true;

        case 'high_resolution_export':
          return plan.features.high_resolution_exports === true;

        case 'priority_generation':
          return plan.features.priority_generation === true;

        case 'ai_design_advice':
          return plan.features.ai_design_advice === true;

        case 'team_collaboration':
          return plan.features.team_collaboration === true;

        case 'api_access':
          return plan.features.api_access === true;

        case 'custom_brand_styles':
          return plan.features.custom_brand_styles === true;

        case 'whitelabel_reports':
          return plan.features.whitelabel_reports === true;

        case 'bulk_processing':
          return plan.features.bulk_processing === true;

        case 'api_call':
          if (limits.max_api_calls_per_day === 0) {
            return false; // No API access
          }
          if (limits.max_api_calls_per_day === -1) {
            return true; // Unlimited
          }
          return usage.api_calls < limits.max_api_calls_per_day;

        default:
          logger.warn('Unknown action type', { userId, action });
          return false;
      }
    } catch (error) {
      logger.error('Failed to check action permission', error as Error, { userId, action });
      return false;
    }
  }

  /**
   * Track usage for a specific resource
   */
  static async trackUsage(userId: string, resourceType: 'transformation' | 'api_call' | 'export' | 'team_member'): Promise<void> {
    try {
      const planInfo = await this.getUserPlan(userId);
      if (!planInfo) {
        logger.warn('Cannot track usage - no active plan', { userId, resourceType });
        return;
      }

      const { subscription } = planInfo;

      // Upsert usage tracking (using actual column names: resource_type and count)
      await Database.query(
        `INSERT INTO usage_tracking (user_id, resource_type, count, period_start, period_end, created_at, updated_at)
         VALUES ($1, $2, 1, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id, resource_type, period_start)
         DO UPDATE SET 
           count = usage_tracking.count + 1,
           updated_at = NOW()`,
        [userId, resourceType, subscription.current_period_start, subscription.current_period_end]
      );

      logger.info('Usage tracked', { userId, resourceType });
    } catch (error) {
      logger.error('Failed to track usage', error as Error, { userId, resourceType });
      throw error;
    }
  }

  /**
   * Get usage statistics for a user
   */
  static async getUsageStats(userId: string): Promise<{
    current_period: { transformations: number; api_calls: number; team_members: number };
    limits: { transformations_per_month: number; max_api_calls_per_day: number; max_team_members: number };
    percentage_used: { transformations: number; api_calls: number };
  } | null> {
    try {
      const planInfo = await this.getUserPlan(userId);
      if (!planInfo) {
        return null;
      }

      const { usage, limits } = planInfo;

      // Calculate percentage used
      const transformationPercentage = limits.transformations_per_month === -1 
        ? 0 
        : (usage.transformations / limits.transformations_per_month) * 100;

      const apiCallPercentage = limits.max_api_calls_per_day === -1 || limits.max_api_calls_per_day === 0
        ? 0
        : (usage.api_calls / limits.max_api_calls_per_day) * 100;

      return {
        current_period: usage,
        limits: {
          transformations_per_month: limits.transformations_per_month,
          max_api_calls_per_day: limits.max_api_calls_per_day,
          max_team_members: limits.max_team_members,
        },
        percentage_used: {
          transformations: Math.min(transformationPercentage, 100),
          api_calls: Math.min(apiCallPercentage, 100),
        },
      };
    } catch (error) {
      logger.error('Failed to get usage stats', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Change user's subscription plan
   */
  static async changePlan(userId: string, newPlanName: 'starter' | 'pro' | 'business'): Promise<void> {
    try {
      // Get the new plan
      const planResult = await Database.query(
        'SELECT id FROM subscription_plans WHERE name = $1',
        [newPlanName]
      );

      if (planResult.rows.length === 0) {
        throw new Error(`Plan ${newPlanName} not found`);
      }

      const newPlanId = planResult.rows[0].id;

      // Use UPSERT to handle case where user might not have a subscription yet
      const now = new Date();
      const billingPeriodEnd = new Date(now);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

      await Database.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id,
           updated_at = NOW()`,
        [userId, newPlanId, 'active', now, billingPeriodEnd]
      );

      logger.info('User plan changed', { userId, newPlan: newPlanName });
    } catch (error) {
      logger.error('Failed to change plan', error as Error, { userId, newPlanName });
      throw error;
    }
  }

  /**
   * Cancel user's subscription (mark for cancellation at period end)
   */
  static async cancelSubscription(userId: string): Promise<void> {
    try {
      await Database.query(
        `UPDATE user_subscriptions 
         SET cancel_at_period_end = TRUE, updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      logger.info('Subscription marked for cancellation', { userId });
    } catch (error) {
      logger.error('Failed to cancel subscription', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Reactivate a cancelled subscription
   */
  static async reactivateSubscription(userId: string): Promise<void> {
    try {
      await Database.query(
        `UPDATE user_subscriptions 
         SET cancel_at_period_end = FALSE, updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      logger.info('Subscription reactivated', { userId });
    } catch (error) {
      logger.error('Failed to reactivate subscription', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get all available subscription plans
   */
  static async getAllPlans(): Promise<SubscriptionPlan[]> {
    try {
      const result = await Database.query(
        'SELECT * FROM subscription_plans ORDER BY price ASC'
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        price: parseFloat(row.price),
        billing_cycle: row.billing_cycle,
        features: row.features,
        limits: row.limits,
        stripe_price_id: row.stripe_price_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to get all plans', error as Error);
      throw error;
    }
  }

  /**
   * Get priority level for queue ordering (Business > Pro > Starter)
   */
  static async getUserPriority(userId: string): Promise<number> {
    try {
      const planInfo = await this.getUserPlan(userId);
      if (!planInfo) {
        return 3; // Lowest priority
      }

      switch (planInfo.plan.name) {
        case 'business':
          return 1; // Highest priority
        case 'pro':
          return 2;
        case 'starter':
        default:
          return 3; // Lowest priority
      }
    } catch (error) {
      logger.error('Failed to get user priority', error as Error, { userId });
      return 3; // Default to lowest priority on error
    }
  }

  /**
   * Get max resolution allowed for user's plan
   */
  static async getMaxResolution(userId: string): Promise<string> {
    try {
      const planInfo = await this.getUserPlan(userId);
      if (!planInfo) {
        return '1024x1024'; // Default resolution
      }

      return planInfo.limits.max_resolution as string;
    } catch (error) {
      logger.error('Failed to get max resolution', error as Error, { userId });
      return '1024x1024'; // Default on error
    }
  }
}
