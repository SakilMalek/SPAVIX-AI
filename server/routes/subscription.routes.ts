import { Router, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  SelectPlanRequestSchema,
  UpgradePlanRequestSchema,
  CancelSubscriptionRequestSchema,
  CheckFeatureRequestSchema,
  RecordUsageRequestSchema,
  CheckUsageRequestSchema,
} from '../../shared/subscription-schema';

const router = Router();

/**
 * GET /api/subscription (or /api/subscriptions/)
 * Get current subscription and usage for authenticated user
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const subscription = await SubscriptionService.getActiveSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const usage = await SubscriptionService.getAllUsage(subscription.id);
    const features = subscription.plan.features as Record<string, boolean>;

    // Format usage response
    const formattedUsage: Record<string, any> = {};
    for (const [featureKey, usageData] of Object.entries(usage)) {
      const limits = subscription.plan.limits as Record<string, number | null>;
      const limit = limits[featureKey];

      formattedUsage[featureKey] = {
        used: usageData.usage_count,
        limit,
        unlimited: limit === null || limit === undefined,
        reset_at: usageData.period_end,
      };
    }

    res.json({
      subscription: {
        id: subscription.id,
        user_id: subscription.user_id,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          slug: subscription.plan.slug,
          tier: subscription.plan.tier,
          price_monthly: subscription.plan.price_monthly,
        },
        status: subscription.status,
        billing_period_start: subscription.billing_period_start,
        billing_period_end: subscription.billing_period_end,
        trial_ends_at: subscription.trial_ends_at,
        cancelled_at: subscription.cancelled_at,
      },
      usage: formattedUsage,
      features,
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/plans
 * Get all available plans
 */
router.get('/subscription/plans', async (req: AuthRequest, res: Response) => {
  try {
    const plans = await SubscriptionService.getAllPlans();

    res.json({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        tier: plan.tier,
        price_monthly: plan.price_monthly,
        price_annual: plan.price_annual,
        description: plan.description,
        features: plan.features,
        limits: plan.limits,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/select-plan
 * User selects a plan (mock billing mode)
 */
router.post('/subscription/select-plan', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = SelectPlanRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error });
    }

    const { plan_slug } = validation.data;

    // Check if user already has a subscription
    const existingSubscription = await SubscriptionService.getActiveSubscription(userId);

    let subscription;
    if (existingSubscription) {
      // Upgrade/downgrade existing subscription
      subscription = await SubscriptionService.upgradePlan(userId, plan_slug);
    } else {
      // Create new subscription
      subscription = await SubscriptionService.createSubscription(userId, plan_slug);
    }

    const plan = await SubscriptionService.getPlanById(subscription.plan_id);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan_id: subscription.plan_id,
        status: subscription.status,
        plan: {
          name: plan?.name,
          slug: plan?.slug,
        },
      },
      message: `Plan selected: ${plan?.name}`,
    });
  } catch (error: any) {
    console.error('Error selecting plan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade to a higher plan
 */
router.post('/subscription/upgrade', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = UpgradePlanRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error });
    }

    const { plan_slug } = validation.data;

    const subscription = await SubscriptionService.upgradePlan(userId, plan_slug);
    const plan = await SubscriptionService.getPlanById(subscription.plan_id);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan_id: subscription.plan_id,
        status: subscription.status,
        plan: {
          name: plan?.name,
          slug: plan?.slug,
        },
      },
      payment_required: false,
    });
  } catch (error: any) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post('/subscription/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = CancelSubscriptionRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error });
    }

    const { reason } = validation.data;

    const subscription = await SubscriptionService.cancelSubscription(userId, reason);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelled_at: subscription.cancelled_at,
      },
      cancellation_effective_date: subscription.cancelled_at,
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/features/check
 * Check if user can use a feature
 */
router.post('/features/check', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = CheckFeatureRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error });
    }

    const { feature_key } = validation.data;

    const result = await SubscriptionService.canUseFeature(userId, feature_key);

    res.json({
      allowed: result.allowed,
      reason: result.reason,
    });
  } catch (error: any) {
    console.error('Error checking feature:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/usage/record
 * Record feature usage (server-side only)
 */
router.post('/usage/record', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = RecordUsageRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error });
    }

    const { feature_key, amount } = validation.data;

    // Check if user can use feature
    const canUse = await SubscriptionService.canUseFeature(userId, feature_key);
    if (!canUse.allowed) {
      return res.status(403).json({ error: canUse.reason });
    }

    // Check quota
    const quota = await SubscriptionService.checkUsageQuota(userId, feature_key, amount);
    if (!quota.allowed) {
      return res.status(429).json({
        error: 'Usage limit exceeded',
        used: quota.used,
        limit: quota.limit,
      });
    }

    // Record usage
    const usage = await SubscriptionService.recordUsage(userId, feature_key, amount);

    res.json({
      success: true,
      usage: {
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
      },
    });
  } catch (error: any) {
    console.error('Error recording usage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/usage/check
 * Check if user has quota remaining
 */
router.post('/usage/check', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const validation = CheckUsageRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request', details: validation.error });
    }

    const { feature_key, amount } = validation.data;

    const quota = await SubscriptionService.checkUsageQuota(userId, feature_key, amount);

    res.json({
      allowed: quota.allowed,
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
    });
  } catch (error: any) {
    console.error('Error checking usage:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
