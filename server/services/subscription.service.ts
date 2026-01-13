import { Database } from '../db';
import {
  Plan,
  Subscription,
  UsageTracking,
  SubscriptionHistory,
  PLAN_DEFINITIONS,
  PlanTier,
  SubscriptionStatus,
} from '../../shared/subscription-schema';
import { randomUUID } from 'crypto';

export class SubscriptionService {
  /**
   * Initialize plans in database (run once on startup)
   */
  static async initializePlans() {
    const plans = Object.values(PLAN_DEFINITIONS);

    for (const plan of plans) {
      await Database.query(
        `
        INSERT INTO plans (id, name, slug, tier, price_monthly, price_annual, description, features, limits)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO UPDATE SET
          features = EXCLUDED.features,
          limits = EXCLUDED.limits,
          updated_at = NOW()
        `,
        [
          plan.id,
          plan.name,
          plan.slug,
          plan.tier,
          plan.price_monthly,
          plan.price_annual,
          plan.description,
          JSON.stringify(plan.features),
          JSON.stringify(plan.limits),
        ]
      );
    }
  }

  /**
   * Create a new subscription for a user (called on signup)
   */
  static async createSubscription(userId: string, planName: string = 'Starter'): Promise<Subscription> {
    try {
      // Get plan by name
      const planResult = await Database.query(
        'SELECT id FROM subscription_plans WHERE name = $1',
        [planName]
      );
      
      if ((planResult.rows as any[]).length === 0) {
        throw new Error(`Plan not found: ${planName}`);
      }
      
      const planId = (planResult.rows as any[])[0].id;

      const now = new Date();
      const billingPeriodEnd = new Date(now);
      billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

      const subscriptionId = randomUUID();

      // Use UPSERT to handle case where user already has a subscription
      const result = await Database.query(
        `
        INSERT INTO user_subscriptions (
          id, user_id, plan_id, status, current_period_start, current_period_end
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          status = 'active',
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = NOW()
        RETURNING *
        `,
        [subscriptionId, userId, planId, 'active', now, billingPeriodEnd]
      );

      const subscription = result.rows[0];

      return subscription;
    } catch (error) {
      console.error('❌ Subscription creation error:', error);
      throw error;
    }
  }

  /**
   * Get active subscription for a user
   */
  static async getActiveSubscription(userId: string): Promise<(Subscription & { plan: Plan }) | null> {
    const result = await Database.query(
      `
      SELECT s.*, p.* FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 AND s.status = 'active'
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...this.formatSubscription(row),
      plan: this.formatPlan(row),
    };
  }

  /**
   * Get subscription by ID
   */
  static async getSubscriptionById(subscriptionId: string): Promise<(Subscription & { plan: Plan }) | null> {
    const result = await Database.query(
      `
      SELECT s.*, p.* FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.id = $1
      LIMIT 1
      `,
      [subscriptionId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...this.formatSubscription(row),
      plan: this.formatPlan(row),
    };
  }

  /**
   * Get plan by slug
   */
  static async getPlanBySlug(slug: string): Promise<Plan | null> {
    const result = await Database.query(`SELECT * FROM plans WHERE slug = $1`, [slug]);
    if (result.rows.length === 0) return null;
    return this.formatPlan(result.rows[0]);
  }

  /**
   * Get plan by ID
   */
  static async getPlanById(planId: string): Promise<Plan | null> {
    const result = await Database.query(`SELECT * FROM plans WHERE id = $1`, [planId]);
    if (result.rows.length === 0) return null;
    return this.formatPlan(result.rows[0]);
  }

  /**
   * Get all plans
   */
  static async getAllPlans(): Promise<Plan[]> {
    const result = await Database.query(`SELECT * FROM plans ORDER BY tier ASC`);
    return result.rows.map((row) => this.formatPlan(row));
  }

  /**
   * Upgrade or downgrade subscription
   */
  static async upgradePlan(userId: string, newPlanSlug: string): Promise<Subscription> {
    const currentSubscription = await this.getActiveSubscription(userId);
    if (!currentSubscription) throw new Error('No active subscription found');

    const newPlan = await this.getPlanBySlug(newPlanSlug);
    if (!newPlan) throw new Error(`Plan not found: ${newPlanSlug}`);

    const fromPlanId = currentSubscription.plan_id;
    const toPlanId = newPlan.id;

    // Determine event type
    let eventType: 'upgraded' | 'downgraded' = 'upgraded';
    if (newPlan.tier < currentSubscription.plan.tier) {
      eventType = 'downgraded';
    }

    // Update subscription
    const result = await Database.query(
      `
      UPDATE subscriptions
      SET plan_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [toPlanId, currentSubscription.id]
    );

    const updatedSubscription = result.rows[0];

    // Update user plan_id
    await Database.query(`UPDATE users SET plan_id = $1 WHERE id = $2`, [toPlanId, userId]);

    // Log event
    await this.logSubscriptionEvent(
      userId,
      currentSubscription.id,
      eventType,
      fromPlanId,
      toPlanId,
      `Plan ${eventType} from ${currentSubscription.plan.name} to ${newPlan.name}`
    );

    return this.formatSubscription(updatedSubscription);
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string, reason?: string): Promise<Subscription> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');

    const result = await Database.query(
      `
      UPDATE subscriptions
      SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [reason || null, subscription.id]
    );

    const cancelledSubscription = result.rows[0];

    // Log event
    await this.logSubscriptionEvent(
      userId,
      subscription.id,
      'cancelled',
      subscription.plan_id,
      subscription.plan_id,
      reason || 'User cancelled subscription'
    );

    return this.formatSubscription(cancelledSubscription);
  }

  /**
   * Check if user can use a feature
   */
  static async canUseFeature(userId: string, featureKey: string): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      return { allowed: false, reason: 'No active subscription' };
    }

    if (subscription.status !== 'active') {
      return { allowed: false, reason: `Subscription is ${subscription.status}` };
    }

    const features = subscription.plan.features as Record<string, boolean>;
    if (!features[featureKey]) {
      return { allowed: false, reason: `Feature not included in ${subscription.plan.name} plan` };
    }

    return { allowed: true };
  }

  /**
   * Check if user has usage quota remaining
   */
  static async checkUsageQuota(
    userId: string,
    featureKey: string,
    amount: number = 1
  ): Promise<{ allowed: boolean; used: number; limit: number | null; remaining: number | null }> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      return { allowed: false, used: 0, limit: null, remaining: null };
    }

    // Get current usage
    const usage = await this.getUsage(subscription.id, featureKey);
    const limits = subscription.plan.limits as Record<string, number | null>;
    const limit = limits[featureKey];

    if (limit === null || limit === undefined) {
      // Unlimited
      return { allowed: true, used: usage.usage_count, limit: null, remaining: null };
    }

    const remaining = Math.max(0, limit - usage.usage_count);
    const allowed = remaining >= amount;

    return { allowed, used: usage.usage_count, limit, remaining };
  }

  /**
   * Record feature usage
   */
  static async recordUsage(
    userId: string,
    featureKey: string,
    amount: number = 1
  ): Promise<{ used: number; limit: number | null; remaining: number | null }> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) throw new Error('No active subscription');

    const usage = await this.getUsage(subscription.id, featureKey);
    const limits = subscription.plan.limits as Record<string, number | null>;
    const limit = limits[featureKey];

    // Update usage
    const newUsageCount = usage.usage_count + amount;
    await Database.query(
      `
      UPDATE usage_tracking
      SET usage_count = $1, updated_at = NOW()
      WHERE subscription_id = $2 AND feature_key = $3
      `,
      [newUsageCount, subscription.id, featureKey]
    );

    const remaining = limit === null ? null : Math.max(0, limit - newUsageCount);

    return { used: newUsageCount, limit, remaining };
  }

  /**
   * Get usage for a feature
   */
  static async getUsage(subscriptionId: string, featureKey: string): Promise<UsageTracking> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await Database.query(
      `
      SELECT * FROM usage_tracking
      WHERE subscription_id = $1 AND feature_key = $2 AND period_start = $3
      LIMIT 1
      `,
      [subscriptionId, featureKey, periodStart]
    );

    if (result.rows.length === 0) {
      throw new Error(`Usage tracking not found for feature: ${featureKey}`);
    }

    return this.formatUsageTracking(result.rows[0]);
  }

  /**
   * Get all usage for a subscription
   */
  static async getAllUsage(subscriptionId: string): Promise<Record<string, UsageTracking>> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await Database.query(
      `
      SELECT * FROM usage_tracking
      WHERE subscription_id = $1 AND period_start = $2
      ORDER BY feature_key ASC
      `,
      [subscriptionId, periodStart]
    );

    const usage: Record<string, UsageTracking> = {};
    for (const row of result.rows) {
      const formatted = this.formatUsageTracking(row);
      usage[formatted.feature_key] = formatted;
    }

    return usage;
  }

  /**
   * Initialize usage tracking for all features
   */
  private static async initializeUsageTracking(subscriptionId: string, userId: string, planId: string) {
    const plan = await this.getPlanById(planId);
    if (!plan) throw new Error('Plan not found');

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const limits = plan.limits as Record<string, number | null>;

    for (const [featureKey, limit] of Object.entries(limits)) {
      await Database.query(
        `
        INSERT INTO usage_tracking (
          id, subscription_id, user_id, feature_key, usage_count, limit_per_month, period_start, period_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (subscription_id, feature_key, period_start) DO NOTHING
        `,
        [randomUUID(), subscriptionId, userId, featureKey, 0, limit, periodStart, periodEnd]
      );
    }
  }

  /**
   * Log subscription event
   */
  private static async logSubscriptionEvent(
    userId: string,
    subscriptionId: string,
    eventType: string,
    fromPlanId: string | null,
    toPlanId: string | null,
    reason: string
  ) {
    await Database.query(
      `
      INSERT INTO subscription_history (
        id, user_id, subscription_id, event_type, from_plan_id, to_plan_id, reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [randomUUID(), userId, subscriptionId, eventType, fromPlanId, toPlanId, reason]
    );
  }

  /**
   * Format subscription row
   */
  private static formatSubscription(row: Record<string, any>): Subscription {
    return {
      id: row.id,
      user_id: row.user_id,
      plan_id: row.plan_id,
      status: row.status,
      billing_period_start: new Date(row.billing_period_start),
      billing_period_end: row.billing_period_end ? new Date(row.billing_period_end) : null,
      payment_provider: row.payment_provider,
      payment_method_id: row.payment_method_id,
      razorpay_subscription_id: row.razorpay_subscription_id,
      trial_ends_at: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
      trial_used: row.trial_used,
      cancelled_at: row.cancelled_at ? new Date(row.cancelled_at) : null,
      cancellation_reason: row.cancellation_reason,
      metadata: row.metadata || {},
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  /**
   * Format plan row
   */
  private static formatPlan(row: Record<string, any>): Plan {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      tier: row.tier,
      price_monthly: row.price_monthly,
      price_annual: row.price_annual,
      description: row.description,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
      limits: typeof row.limits === 'string' ? JSON.parse(row.limits) : row.limits,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  /**
   * Format usage tracking row
   */
  private static formatUsageTracking(row: Record<string, any>): UsageTracking {
    return {
      id: row.id,
      subscription_id: row.subscription_id,
      user_id: row.user_id,
      feature_key: row.feature_key,
      usage_count: row.usage_count,
      limit_per_month: row.limit_per_month,
      period_start: new Date(row.period_start),
      period_end: new Date(row.period_end),
      reset_at: row.reset_at ? new Date(row.reset_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
