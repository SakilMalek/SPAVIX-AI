/**
 * Stripe Service
 * Handles all Stripe payment processing and subscription management
 */

import Stripe from 'stripe';
import { Database } from '../db.js';
import { SubscriptionService } from './subscription.js';
import { logger } from '../utils/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover' as any,
});

export interface CheckoutSessionParams {
  userId: string;
  planName: 'starter' | 'pro' | 'business';
  successUrl: string;
  cancelUrl: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

export class StripeService {
  /**
   * Create a Stripe customer for a user
   */
  static async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          userId,
        },
      });

      // Store customer ID in database
      await Database.query(
        `UPDATE user_subscriptions 
         SET stripe_customer_id = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [customer.id, userId]
      );

      logger.info('Stripe customer created', { userId, customerId: customer.id });
      return customer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer', error as Error, { userId, email });
      throw error;
    }
  }

  /**
   * Get or create Stripe customer for user
   */
  static async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      // Check if user already has a Stripe customer ID
      const result = await Database.query(
        'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].stripe_customer_id) {
        return result.rows[0].stripe_customer_id;
      }

      // Create new customer
      return await this.createCustomer(userId, email, name);
    } catch (error) {
      logger.error('Failed to get or create Stripe customer', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription upgrade
   */
  static async createCheckoutSession(params: CheckoutSessionParams): Promise<string> {
    try {
      const { userId, planName, successUrl, cancelUrl } = params;

      // Get user info
      const userResult = await Database.query(
        'SELECT email, name FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Get or create Stripe customer
      const customerId = await this.getOrCreateCustomer(userId, user.email, user.name);

      // Get plan details
      const planResult = await Database.query(
        'SELECT stripe_price_id, display_name FROM subscription_plans WHERE name = $1',
        [planName]
      );

      if (planResult.rows.length === 0) {
        throw new Error(`Plan ${planName} not found`);
      }

      const plan = planResult.rows[0];

      if (!plan.stripe_price_id) {
        throw new Error(`Plan ${planName} does not have a Stripe price ID configured`);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripe_price_id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          planName,
        },
      });

      logger.info('Checkout session created', { userId, planName, sessionId: session.id });
      return session.id;
    } catch (error) {
      logger.error('Failed to create checkout session', error as Error, { userId: params.userId, planName: params.planName });
      throw error;
    }
  }

  /**
   * Get checkout session details
   */
  static async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      logger.error('Failed to retrieve checkout session', error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * Handle successful subscription creation
   */
  static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id;

      if (!customerId) {
        throw new Error('No customer ID in subscription');
      }

      // Get user ID from customer metadata
      const customer = await stripe.customers.retrieve(customerId) as any;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('No user ID in customer metadata');
      }

      // Get plan name from metadata
      const planName = (subscription.metadata as any)?.planName || 'pro';

      // Update subscription in database
      const subData = subscription as any;
      await Database.query(
        `UPDATE user_subscriptions 
         SET stripe_subscription_id = $1, 
             stripe_customer_id = $2,
             status = 'active',
             current_period_start = $3,
             current_period_end = $4,
             updated_at = NOW()
         WHERE user_id = $5`,
        [
          subscription.id,
          customerId,
          new Date(subData.current_period_start * 1000),
          new Date(subData.current_period_end * 1000),
          userId,
        ]
      );

      // Update plan if needed
      if (planName && planName !== 'starter') {
        await SubscriptionService.changePlan(userId, planName as 'pro' | 'business');
      }

      logger.info('Subscription created in Stripe', { userId, subscriptionId: subscription.id, planName });
    } catch (error) {
      logger.error('Failed to handle subscription created', error as Error, { subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle subscription updated
   */
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id;

      if (!customerId) {
        throw new Error('No customer ID in subscription');
      }

      // Get user ID from customer metadata
      const customer = await stripe.customers.retrieve(customerId) as any;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('No user ID in customer metadata');
      }

      // Update subscription in database
      const subData = subscription as any;
      await Database.query(
        `UPDATE user_subscriptions 
         SET current_period_start = $1,
             current_period_end = $2,
             cancel_at_period_end = $3,
             updated_at = NOW()
         WHERE user_id = $4`,
        [
          new Date(subData.current_period_start * 1000),
          new Date(subData.current_period_end * 1000),
          subscription.cancel_at_period_end || false,
          userId,
        ]
      );

      logger.info('Subscription updated in Stripe', { userId, subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription updated', error as Error, { subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle subscription deleted (cancelled)
   */
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id;

      if (!customerId) {
        throw new Error('No customer ID in subscription');
      }

      // Get user ID from customer metadata
      const customer = await stripe.customers.retrieve(customerId) as any;
      const userId = customer.metadata?.userId;

      if (!userId) {
        throw new Error('No user ID in customer metadata');
      }

      // Update subscription status to cancelled
      await Database.query(
        `UPDATE user_subscriptions 
         SET status = 'cancelled',
             stripe_subscription_id = NULL,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Downgrade to Starter plan
      await SubscriptionService.changePlan(userId, 'starter');

      logger.info('Subscription cancelled in Stripe', { userId, subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription deleted', error as Error, { subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Process webhook event
   */
  static async processWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          // Handle successful payment
          logger.info('Invoice payment succeeded', { invoiceId: (event.data.object as Stripe.Invoice).id });
          break;

        case 'invoice.payment_failed':
          // Handle failed payment
          logger.warn('Invoice payment failed', { invoiceId: (event.data.object as Stripe.Invoice).id });
          break;

        default:
          logger.debug('Unhandled webhook event', { eventType: event.type });
      }
    } catch (error) {
      logger.error('Failed to process webhook event', error as Error, { eventType: event.type });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string): Stripe.Event {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured');
      }

      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      return event;
    } catch (error) {
      logger.error('Failed to verify webhook signature', error as Error);
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  static async createBillingPortalSession(userId: string, returnUrl: string): Promise<string> {
    try {
      // Get customer ID
      const result = await Database.query(
        'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
        throw new Error('User has no Stripe customer ID');
      }

      const customerId = result.rows[0].stripe_customer_id;

      // Create billing portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info('Billing portal session created', { userId, sessionId: session.id });
      return session.url;
    } catch (error) {
      logger.error('Failed to create billing portal session', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Cancel subscription immediately
   */
  static async cancelSubscriptionImmediate(userId: string): Promise<void> {
    try {
      // Get subscription ID
      const result = await Database.query(
        'SELECT stripe_subscription_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].stripe_subscription_id) {
        throw new Error('User has no active Stripe subscription');
      }

      const subscriptionId = result.rows[0].stripe_subscription_id;

      // Cancel subscription
      await (stripe.subscriptions as any).del(subscriptionId);

      logger.info('Subscription cancelled immediately', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to cancel subscription', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get subscription details from Stripe
   */
  static async getSubscriptionDetails(userId: string): Promise<Stripe.Subscription | null> {
    try {
      // Get subscription ID
      const result = await Database.query(
        'SELECT stripe_subscription_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].stripe_subscription_id) {
        return null;
      }

      const subscriptionId = result.rows[0].stripe_subscription_id;

      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Failed to get subscription details', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  static async updateSubscriptionPlan(userId: string, newPlanName: 'pro' | 'business'): Promise<void> {
    try {
      // Get current subscription
      const subResult = await Database.query(
        `SELECT us.stripe_subscription_id, sp.stripe_price_id
         FROM user_subscriptions us
         JOIN subscription_plans sp ON sp.name = $1
         WHERE us.user_id = $2`,
        [newPlanName, userId]
      );

      if (subResult.rows.length === 0) {
        throw new Error('Plan not found or user has no subscription');
      }

      const { stripe_subscription_id: subscriptionId, stripe_price_id: newPriceId } = subResult.rows[0];

      if (!subscriptionId) {
        throw new Error('User has no active Stripe subscription');
      }

      // Get current subscription items
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const currentItem = subscription.items.data[0];

      if (!currentItem) {
        throw new Error('Subscription has no items');
      }

      // Update subscription item
      await stripe.subscriptionItems.update(currentItem.id, {
        price: newPriceId,
        proration_behavior: 'create_prorations',
      });

      logger.info('Subscription plan updated', { userId, newPlanName });
    } catch (error) {
      logger.error('Failed to update subscription plan', error as Error, { userId, newPlanName });
      throw error;
    }
  }

  /**
   * Get invoice list for user
   */
  static async getInvoices(userId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      // Get customer ID
      const result = await Database.query(
        'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
        return [];
      }

      const customerId = result.rows[0].stripe_customer_id;

      // Get invoices
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
      });

      return invoices.data;
    } catch (error) {
      logger.error('Failed to get invoices', error as Error, { userId });
      throw error;
    }
  }
}
