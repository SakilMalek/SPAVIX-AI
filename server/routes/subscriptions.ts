/**
 * Subscription API Routes
 * Handles subscription management, upgrades, and billing
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { SubscriptionService } from '../services/subscription.js';
import { StripeService } from '../services/stripe.js';
import { RazorpayService } from '../services/razorpay.js';
import { getPaymentGateway, getLocalPricing, getCountryInfo } from '../utils/country-detection.js';
import { logger } from '../utils/logger.js';
import { Database } from '../db.js';

export const subscriptionRoutes = Router();

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
subscriptionRoutes.get('/plans', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plans = await SubscriptionService.getAllPlans();
    res.json(plans);
  } catch (error) {
    logger.error('Failed to get plans', error as Error);
    res.status(500).json({ error: 'Failed to get subscription plans' });
  }
});

/**
 * GET /api/subscriptions/pricing
 * Get pricing with country detection
 */
subscriptionRoutes.get('/pricing', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const countryCode = (req.query.countryCode as string) || null;
    const gateway = getPaymentGateway(countryCode);
    const pricing = getLocalPricing(countryCode);
    const countryInfo = getCountryInfo(countryCode);

    res.json({
      country: countryInfo,
      gateway,
      pricing,
      plans: {
        starter: {
          name: 'Starter',
          price: pricing.starter,
          currency: pricing.currency,
          symbol: pricing.symbol,
          features: [
            '5 transformations/month',
            'Basic room types',
            'Standard resolution (1024x1024)',
          ],
        },
        pro: {
          name: 'Pro',
          price: pricing.pro,
          currency: pricing.currency,
          symbol: pricing.symbol,
          features: [
            'Unlimited transformations',
            'Premium styles',
            'High resolution exports (2K)',
            'Priority generation',
            'AI design advice',
          ],
        },
        business: {
          name: 'Business',
          price: pricing.business,
          currency: pricing.currency,
          symbol: pricing.symbol,
          features: [
            'Everything in Pro',
            'Team collaboration (10 members)',
            'API access (1000 calls/day)',
            '4K exports',
            'Custom branding',
            'Whitelabel reports',
          ],
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get pricing', error as Error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

/**
 * GET /api/subscriptions/current
 * Get current user's subscription and usage
 */
subscriptionRoutes.get('/current', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const planInfo = await SubscriptionService.getUserPlan(req.user.id);

    if (!planInfo) {
      res.status(404).json({ error: 'No active subscription found' });
      return;
    }

    res.json(planInfo);
  } catch (error) {
    logger.error('Failed to get current subscription', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

/**
 * GET /api/subscriptions/usage
 * Get current usage statistics
 */
subscriptionRoutes.get('/usage', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const stats = await SubscriptionService.getUsageStats(req.user.id);

    if (!stats) {
      res.status(404).json({ error: 'No active subscription found' });
      return;
    }

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get usage stats', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

/**
 * POST /api/subscriptions/checkout
 * Create a checkout session for plan upgrade (auto-detects country)
 */
subscriptionRoutes.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { planName, successUrl, cancelUrl, countryCode, phone } = req.body;

    if (!planName || !successUrl || !cancelUrl) {
      res.status(400).json({ error: 'Missing required fields: planName, successUrl, cancelUrl' });
      return;
    }

    if (!['starter', 'pro', 'business'].includes(planName)) {
      res.status(400).json({ error: 'Invalid plan name' });
      return;
    }

    // Use provided country code or default to IN (India)
    // If countryCode is 'UNKNOWN', treat as India for now
    const resolvedCountryCode = (countryCode && countryCode !== 'UNKNOWN') ? countryCode : 'IN';
    
    logger.info('Checkout country resolution', { 
      providedCountryCode: countryCode, 
      resolvedCountryCode 
    });

    // Determine payment gateway based on country
    const gateway = getPaymentGateway(resolvedCountryCode);
    const countryInfo = getCountryInfo(resolvedCountryCode);

    // Get user info
    const userResult = await Database.query(
      'SELECT email, name FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    let response: any;

    try {
      logger.info('Checkout initiated', { userId: req.user.id, planName, gateway, countryCode });
      
      if (gateway === 'razorpay') {
        // Use Razorpay for Indian users
        logger.info('Creating Razorpay subscription', { userId: req.user.id, planName, email: user.email });
        
        try {
          const { subscriptionId, shortUrl } = await RazorpayService.createSubscription({
            userId: req.user.id,
            planName: planName as 'pro' | 'business',
            email: user.email,
            name: user.name,
            phone,
            successUrl,
          });

          logger.info('Razorpay subscription created successfully', { subscriptionId, shortUrl });

          response = {
            gateway: 'razorpay',
            subscriptionId,
            shortUrl,
            country: countryInfo,
          };
        } catch (razorpayError) {
          logger.error('Razorpay service failed', razorpayError as Error, { 
            userId: req.user.id, 
            planName,
            errorMessage: (razorpayError as Error).message,
            errorStack: (razorpayError as Error).stack
          });
          throw razorpayError;
        }
      } else {
        // Use Stripe for international users
        logger.info('Creating Stripe checkout session', { userId: req.user.id, planName });
        
        try {
          const sessionId = await StripeService.createCheckoutSession({
            userId: req.user.id,
            planName: planName as 'pro' | 'business',
            successUrl,
            cancelUrl,
          });

          response = {
            gateway: 'stripe',
            sessionId,
            country: countryInfo,
          };
        } catch (stripeError) {
          logger.error('Stripe service failed', stripeError as Error, { userId: req.user.id, planName });
          throw stripeError;
        }
      }

      logger.info('Checkout session created successfully', { userId: req.user.id, gateway });
      res.json(response);
    } catch (checkoutError) {
      const errorMsg = (checkoutError as Error).message || 'Unknown error';
      const errorStack = (checkoutError as Error).stack;
      logger.error('Checkout service error', checkoutError as Error, { 
        userId: req.user?.id, 
        gateway,
        errorMessage: errorMsg,
        errorStack
      });
      throw checkoutError;
    }
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error';
    const errorStack = (error as Error).stack || '';
    logger.error('Failed to create checkout session', error as Error, { 
      userId: req.user?.id,
      errorMessage,
      errorStack
    });
    console.error('CHECKOUT ERROR DETAILS:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrade subscription plan (for already paying customers)
 */
subscriptionRoutes.post('/upgrade', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { planName } = req.body;

    if (!planName || !['pro', 'business'].includes(planName)) {
      res.status(400).json({ error: 'Invalid plan name' });
      return;
    }

    const planInfo = await SubscriptionService.getUserPlan(req.user.id);

    if (!planInfo) {
      res.status(404).json({ error: 'No active subscription found' });
      return;
    }

    // If user is on Starter (free), they need to go through checkout
    if (planInfo.plan.name === 'starter') {
      res.status(400).json({
        error: 'Free plan users must use checkout',
        message: 'Use POST /api/subscriptions/checkout instead',
      });
      return;
    }

    // Update subscription in Stripe
    await StripeService.updateSubscriptionPlan(req.user.id, planName as 'pro' | 'business');

    // Update local database
    await SubscriptionService.changePlan(req.user.id, planName as 'pro' | 'business');

    res.json({ success: true, message: `Upgraded to ${planName}` });
  } catch (error) {
    logger.error('Failed to upgrade subscription', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription at end of period
 */
subscriptionRoutes.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await SubscriptionService.cancelSubscription(req.user.id);

    res.json({ success: true, message: 'Subscription marked for cancellation at end of period' });
  } catch (error) {
    logger.error('Failed to cancel subscription', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/subscriptions/reactivate
 * Reactivate a cancelled subscription
 */
subscriptionRoutes.post('/reactivate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await SubscriptionService.reactivateSubscription(req.user.id);

    res.json({ success: true, message: 'Subscription reactivated' });
  } catch (error) {
    logger.error('Failed to reactivate subscription', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

/**
 * GET /api/subscriptions/billing-portal
 * Get billing portal URL
 */
subscriptionRoutes.get('/billing-portal', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { returnUrl } = req.query;

    if (!returnUrl || typeof returnUrl !== 'string') {
      res.status(400).json({ error: 'Missing returnUrl query parameter' });
      return;
    }

    const portalUrl = await StripeService.createBillingPortalSession(req.user.id, returnUrl);

    res.json({ url: portalUrl });
  } catch (error) {
    logger.error('Failed to create billing portal session', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

/**
 * GET /api/subscriptions/invoices
 * Get user's invoices
 */
subscriptionRoutes.get('/invoices', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const invoices = await StripeService.getInvoices(req.user.id, limit);

    res.json(invoices);
  } catch (error) {
    logger.error('Failed to get invoices', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

/**
 * POST /api/subscriptions/payment-success
 * Verify payment was successful and update subscription
 */
subscriptionRoutes.post('/payment-success', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { paymentLinkId } = req.body;

    // If paymentLinkId is provided, verify it with Razorpay
    if (paymentLinkId) {
      try {
        logger.info('Verifying payment link with Razorpay', { paymentLinkId, userId: req.user.id });
        
        // Get payment link details from Razorpay
        const paymentLink = await RazorpayService.getPaymentLinkStatus(paymentLinkId);
        
        if (paymentLink && paymentLink.status === 'paid') {
          logger.info('Payment link confirmed as paid', { paymentLinkId, userId: req.user.id });
          
          // Get the plan name from the payment link notes
          const planName = paymentLink.notes?.planName || 'pro';
          
          // Update subscription status to active
          await Database.query(
            `UPDATE user_subscriptions 
             SET status = 'active', plan_name = $1, updated_at = NOW()
             WHERE user_id = $2`,
            [planName, req.user.id]
          );

          // Update plan if needed
          if (planName && planName !== 'starter') {
            await SubscriptionService.changePlan(req.user.id, planName as 'pro' | 'business');
          }

          logger.info('Subscription activated via payment verification', { userId: req.user.id, planName });
        } else {
          logger.warn('Payment link not yet paid', { paymentLinkId, status: paymentLink?.status });
          res.status(400).json({ error: 'Payment not yet confirmed. Please wait and try again.' });
          return;
        }
      } catch (rzpError) {
        logger.error('Failed to verify payment with Razorpay', rzpError as Error, { paymentLinkId });
        res.status(400).json({ error: 'Failed to verify payment with Razorpay' });
        return;
      }
    }

    // Get the latest subscription status
    const subResult = await Database.query(
      `SELECT plan_name, status FROM user_subscriptions WHERE user_id = $1`,
      [req.user.id]
    );

    if (subResult.rows.length === 0) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    const subscription = subResult.rows[0];
    logger.info('Payment success verified', { userId: req.user.id, plan: subscription.plan_name, status: subscription.status });

    res.json({ 
      success: true, 
      subscription: {
        plan_name: subscription.plan_name,
        status: subscription.status
      }
    });
  } catch (error) {
    logger.error('Failed to verify payment success', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

/**
 * POST /api/subscriptions/cancel-immediate
 * Cancel subscription immediately (admin only)
 */
subscriptionRoutes.post('/cancel-immediate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // TODO: Add admin check here
    // if (!req.user.isAdmin) {
    //   res.status(403).json({ error: 'Admin only' });
    //   return;
    // }

    await StripeService.cancelSubscriptionImmediate(req.user.id);

    res.json({ success: true, message: 'Subscription cancelled immediately' });
  } catch (error) {
    logger.error('Failed to cancel subscription immediately', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});
