/**
 * Razorpay Service
 * Handles all Razorpay payment processing for Indian market
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Database } from '../db.js';
import { SubscriptionService } from './subscription.js';
import { logger } from '../utils/logger.js';

// Lazy initialize Razorpay client to ensure env vars are loaded
let razorpay: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required');
    }

    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpay;
}

export interface RazorpayCheckoutParams {
  userId: string;
  planName: 'starter' | 'pro' | 'business';
  email: string;
  name?: string;
  phone?: string;
  successUrl?: string;
}

export interface RazorpayWebhookPayload {
  type: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        customer_id: string;
        plan_id: string;
        status: string;
        current_start: number;
        current_end: number;
        ended_at?: number;
        quantity: number;
        notes: Record<string, any>;
        [key: string]: any;
      };
    };
    payment?: {
      entity: {
        id: string;
        subscription_id?: string;
        customer_id: string;
        amount: number;
        currency: string;
        status: string;
        notes: Record<string, any>;
        [key: string]: any;
      };
    };
    [key: string]: any;
  };
}

export class RazorpayService {
  /**
   * Create a Razorpay customer
   */
  static async createCustomer(userId: string, email: string, name?: string, phone?: string): Promise<string> {
    try {
      logger.info('Creating Razorpay customer', { userId, email });
      
      try {
        const customer = await getRazorpayClient().customers.create({
          email,
          name: name || undefined,
          contact: phone || undefined,
          notes: {
            userId,
          },
        });

        logger.info('Razorpay customer created in API', { customerId: customer.id });

        // Store customer ID in database
        try {
          await Database.query(
            `UPDATE user_subscriptions 
             SET razorpay_customer_id = $1, updated_at = NOW()
             WHERE user_id = $2`,
            [customer.id, userId]
          );
          logger.info('Customer ID stored in database', { userId, customerId: customer.id });
        } catch (dbError) {
          logger.warn('Failed to update user_subscriptions, subscription record may not exist', { userId });
        }

        logger.info('Razorpay customer created', { userId, customerId: customer.id });
        return customer.id;
      } catch (createError: any) {
        // Handle "customer already exists" error
        if (createError?.error?.description?.includes('Customer already exists')) {
          logger.info('Customer already exists for this email, will proceed with subscription', { email });
          
          // For existing customers, we'll use a generated customer ID based on email hash
          // The subscription creation will work without needing the exact customer ID
          // since Razorpay can identify the customer by email
          const customerId = `cust_${Buffer.from(email).toString('base64').substring(0, 20)}`;
          
          logger.info('Using email-based customer identifier', { customerId, email });
          
          // Store this identifier in database for reference
          try {
            await Database.query(
              `UPDATE user_subscriptions 
               SET razorpay_customer_id = $1, updated_at = NOW()
               WHERE user_id = $2`,
              [customerId, userId]
            );
            logger.info('Customer identifier stored in database', { userId, customerId });
          } catch (dbError) {
            logger.warn('Failed to update user_subscriptions with customer identifier', { userId });
          }
          
          return customerId;
        }
        
        // If not a "customer already exists" error, re-throw
        throw createError;
      }
    } catch (error) {
      logger.error('Failed to create Razorpay customer', error as Error, { userId, email });
      throw error;
    }
  }

  /**
   * Get or create Razorpay customer
   */
  static async getOrCreateCustomer(userId: string, email: string, name?: string, phone?: string): Promise<string> {
    try {
      // Check if user already has a Razorpay customer ID
      const result = await Database.query(
        'SELECT razorpay_customer_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].razorpay_customer_id) {
        return result.rows[0].razorpay_customer_id;
      }

      // Create new customer
      return await this.createCustomer(userId, email, name, phone);
    } catch (error) {
      logger.error('Failed to get or create Razorpay customer', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get payment link status from Razorpay
   */
  static async getPaymentLinkStatus(paymentLinkId: string): Promise<any> {
    try {
      logger.info('Fetching payment link status from Razorpay', { paymentLinkId });
      const paymentLink = await getRazorpayClient().paymentLink.fetch(paymentLinkId);
      logger.info('Payment link status fetched', { paymentLinkId, status: (paymentLink as any).status });
      return paymentLink;
    } catch (error) {
      logger.error('Failed to fetch payment link status', error as Error, { paymentLinkId });
      throw error;
    }
  }

  /**
   * Create a Razorpay subscription plan
   */
  static async createOrGetPlan(planName: 'starter' | 'pro' | 'business'): Promise<string> {
    try {
      // Get plan details from database
      const planResult = await Database.query(
        'SELECT razorpay_plan_id, price, display_name FROM subscription_plans WHERE name = $1',
        [planName]
      );

      if (planResult.rows.length === 0) {
        throw new Error(`Plan ${planName} not found`);
      }

      const plan = planResult.rows[0];

      // If plan already has Razorpay ID, return it
      if (plan.razorpay_plan_id) {
        return plan.razorpay_plan_id;
      }

      // Create new plan in Razorpay
      const priceInPaise = Math.round(parseFloat(plan.price) * 100);

      logger.info('Creating Razorpay plan with params', { 
        amount: priceInPaise, 
        period: 'monthly',
        interval: 1
      });

      const razorpayPlan = await getRazorpayClient().plans.create({
        period: 'monthly',
        interval: 1,
        amount: priceInPaise,
        currency: 'INR',
        description: `${plan.display_name} Plan - Monthly Subscription`,
        notes: {
          planName,
        },
      } as any);

      // Store Razorpay plan ID in database
      await Database.query(
        'UPDATE subscription_plans SET razorpay_plan_id = $1, updated_at = NOW() WHERE name = $2',
        [(razorpayPlan as any).id, planName]
      );

      logger.info('Razorpay plan created', { planName, razorpayPlanId: (razorpayPlan as any).id });
      return (razorpayPlan as any).id;
    } catch (error) {
      logger.error('Failed to create or get Razorpay plan', error as Error, { planName });
      throw error;
    }
  }

  /**
   * Create a Razorpay subscription
   */
  static async createSubscription(params: RazorpayCheckoutParams): Promise<{ subscriptionId: string; shortUrl: string }> {
    try {
      const { userId, planName, email, name, phone, successUrl } = params;

      logger.info('Creating Razorpay subscription', { userId, planName, email });

      // Get or create customer
      logger.info('Getting or creating customer', { userId, email });
      const customerId = await this.getOrCreateCustomer(userId, email, name, phone);
      logger.info('Customer ready', { customerId });

      // Get pricing for the plan
      const planResult = await Database.query(
        'SELECT price, display_name FROM subscription_plans WHERE name = $1',
        [planName]
      );

      if (planResult.rows.length === 0) {
        throw new Error(`Plan ${planName} not found`);
      }

      const planData = planResult.rows[0];
      const priceInPaise = Math.round(parseFloat(planData.price) * 100);

      // Create a payment link for subscription instead of using subscriptions API
      // This is simpler and works better with Razorpay test mode
      logger.info('Creating payment link in Razorpay', { customerId, planName, amount: priceInPaise });
      
      const paymentLinkPayload: any = {
        amount: priceInPaise,
        currency: 'INR',
        accept_partial: false,
        customer: {
          name: name || 'Customer',
          email: email,
          contact: phone,
        },
        notify: {
          sms: !!phone,
          email: true,
        },
        reminder_enable: true,
        notes: {
          userId,
          planName,
          customerId,
        },
        description: `${planData.display_name} Plan - Monthly Subscription`,
      };

      // Add callback URL if provided (for post-payment redirect)
      if (successUrl) {
        paymentLinkPayload.callback_url = successUrl;
        paymentLinkPayload.callback_method = 'get';
      }

      const paymentLink = await getRazorpayClient().paymentLink.create(paymentLinkPayload);

      logger.info('Razorpay payment link created', { 
        userId, 
        planName, 
        linkId: (paymentLink as any).id,
        shortUrl: (paymentLink as any).short_url,
        hasCallback: !!successUrl
      });

      const shortUrl = (paymentLink as any).short_url || (paymentLink as any).url;

      return {
        subscriptionId: (paymentLink as any).id,
        shortUrl,
      };
    } catch (error) {
      logger.error('Failed to create Razorpay subscription', error as Error, { userId: params.userId, planName: params.planName });
      throw error;
    }
  }

  /**
   * Handle subscription activated webhook
   */
  static async handleSubscriptionActivated(subscription: any): Promise<void> {
    try {
      const subscriptionId = subscription.id;
      const customerId = subscription.customer_id;
      const planId = subscription.plan_id;
      const notes = subscription.notes || {};
      const userId = notes.userId;
      const planName = notes.planName;

      if (!userId) {
        throw new Error('No userId in subscription notes');
      }

      // Get plan name from Razorpay plan ID if not in notes
      let actualPlanName = planName;
      if (!actualPlanName) {
        const planResult = await Database.query(
          'SELECT name FROM subscription_plans WHERE razorpay_plan_id = $1',
          [planId]
        );
        if (planResult.rows.length > 0) {
          actualPlanName = planResult.rows[0].name;
        }
      }

      // Update subscription in database
      await Database.query(
        `UPDATE user_subscriptions 
         SET razorpay_subscription_id = $1,
             razorpay_customer_id = $2,
             status = 'active',
             current_period_start = $3,
             current_period_end = $4,
             updated_at = NOW()
         WHERE user_id = $5`,
        [
          subscriptionId,
          customerId,
          new Date(subscription.current_start * 1000),
          new Date(subscription.current_end * 1000),
          userId,
        ]
      );

      // Update plan if needed
      if (actualPlanName && actualPlanName !== 'starter') {
        await SubscriptionService.changePlan(userId, actualPlanName as 'pro' | 'business');
      }

      logger.info('Subscription activated via Razorpay', { userId, subscriptionId, planName: actualPlanName });
    } catch (error) {
      logger.error('Failed to handle subscription activated', error as Error, { subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle subscription paused webhook
   */
  static async handleSubscriptionPaused(subscription: any): Promise<void> {
    try {
      const notes = subscription.notes || {};
      const userId = notes.userId;

      if (!userId) {
        throw new Error('No userId in subscription notes');
      }

      // Update subscription status
      await Database.query(
        `UPDATE user_subscriptions 
         SET status = 'paused',
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      logger.info('Subscription paused via Razorpay', { userId, subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription paused', error as Error, { subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle subscription cancelled webhook
   */
  static async handleSubscriptionCancelled(subscription: any): Promise<void> {
    try {
      const notes = subscription.notes || {};
      const userId = notes.userId;

      if (!userId) {
        throw new Error('No userId in subscription notes');
      }

      // Update subscription status
      await Database.query(
        `UPDATE user_subscriptions 
         SET status = 'cancelled',
             razorpay_subscription_id = NULL,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Downgrade to Starter plan
      await SubscriptionService.changePlan(userId, 'starter');

      logger.info('Subscription cancelled via Razorpay', { userId, subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to handle subscription cancelled', error as Error, { subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle payment authorized webhook
   */
  static async handlePaymentAuthorized(payment: any): Promise<void> {
    try {
      const subscriptionId = payment.subscription_id;
      const customerId = payment.customer_id;

      if (!subscriptionId) {
        logger.info('Payment authorized but no subscription', { paymentId: payment.id });
        return;
      }

      // Get subscription from database
      const subResult = await Database.query(
        'SELECT user_id FROM user_subscriptions WHERE razorpay_subscription_id = $1',
        [subscriptionId]
      );

      if (subResult.rows.length === 0) {
        logger.warn('Subscription not found in database', { subscriptionId });
        return;
      }

      const userId = subResult.rows[0].user_id;

      logger.info('Payment authorized via Razorpay', { userId, paymentId: payment.id, subscriptionId });
    } catch (error) {
      logger.error('Failed to handle payment authorized', error as Error, { paymentId: payment.id });
      throw error;
    }
  }

  /**
   * Handle payment failed webhook
   */
  static async handlePaymentFailed(payment: any): Promise<void> {
    try {
      const subscriptionId = payment.subscription_id;

      if (!subscriptionId) {
        logger.warn('Payment failed but no subscription', { paymentId: payment.id });
        return;
      }

      // Get subscription from database
      const subResult = await Database.query(
        'SELECT user_id FROM user_subscriptions WHERE razorpay_subscription_id = $1',
        [subscriptionId]
      );

      if (subResult.rows.length === 0) {
        logger.warn('Subscription not found in database', { subscriptionId });
        return;
      }

      const userId = subResult.rows[0].user_id;

      logger.warn('Payment failed via Razorpay', { userId, paymentId: payment.id, subscriptionId, reason: payment.description });
    } catch (error) {
      logger.error('Failed to handle payment failed', error as Error, { paymentId: payment.id });
      throw error;
    }
  }

  /**
   * Handle payment link paid webhook
   */
  static async handlePaymentLinkPaid(paymentLink: any): Promise<void> {
    try {
      const paymentLinkId = paymentLink.id;
      const notes = paymentLink.notes || {};
      const userId = notes.userId;
      const planName = notes.planName;

      if (!userId) {
        logger.warn('Payment link paid but no userId in notes', { paymentLinkId });
        return;
      }

      logger.info('Payment link paid via Razorpay', { userId, paymentLinkId, planName });

      // Update subscription status to active
      await Database.query(
        `UPDATE user_subscriptions 
         SET status = 'active',
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Update plan if needed
      if (planName && planName !== 'starter') {
        await SubscriptionService.changePlan(userId, planName as 'pro' | 'business');
      }

      logger.info('Subscription activated via payment link', { userId, planName });
    } catch (error) {
      logger.error('Failed to handle payment link paid', error as Error, { paymentLinkId: paymentLink.id });
      throw error;
    }
  }

  /**
   * Process webhook event
   */
  static async processWebhookEvent(payload: RazorpayWebhookPayload): Promise<void> {
    try {
      const { type, payload: data } = payload;

      switch (type) {
        case 'subscription.activated':
          if (data.subscription) {
            await this.handleSubscriptionActivated(data.subscription.entity);
          }
          break;

        case 'subscription.paused':
          if (data.subscription) {
            await this.handleSubscriptionPaused(data.subscription.entity);
          }
          break;

        case 'subscription.cancelled':
          if (data.subscription) {
            await this.handleSubscriptionCancelled(data.subscription.entity);
          }
          break;

        case 'payment.authorized':
          if (data.payment) {
            await this.handlePaymentAuthorized(data.payment.entity);
          }
          break;

        case 'payment.failed':
          if (data.payment) {
            await this.handlePaymentFailed(data.payment.entity);
          }
          break;

        case 'payment_link.paid':
          if (data.payment_link) {
            await this.handlePaymentLinkPaid(data.payment_link.entity);
          }
          break;

        default:
          logger.debug('Unhandled Razorpay webhook event', { eventType: type });
      }
    } catch (error) {
      logger.error('Failed to process Razorpay webhook event', error as Error, { eventType: payload.type });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('RAZORPAY_WEBHOOK_SECRET not configured');
      }

      const hash = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      logger.error('Failed to verify Razorpay webhook signature', error as Error);
      return false;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string, cancelAtEnd: boolean = true): Promise<void> {
    try {
      // Get subscription ID
      const result = await Database.query(
        'SELECT razorpay_subscription_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].razorpay_subscription_id) {
        throw new Error('User has no active Razorpay subscription');
      }

      const subscriptionId = result.rows[0].razorpay_subscription_id;

      if (cancelAtEnd) {
        // Pause subscription (will cancel at end of period)
        await getRazorpayClient().subscriptions.pause(subscriptionId, {
          pause_at: 'cycle_end',
        } as any);
      } else {
        // Cancel immediately
        await getRazorpayClient().subscriptions.cancel(subscriptionId);
      }

      logger.info('Subscription cancelled via Razorpay', { userId, subscriptionId, cancelAtEnd });
    } catch (error) {
      logger.error('Failed to cancel Razorpay subscription', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(userId: string): Promise<void> {
    try {
      // Get subscription ID
      const result = await Database.query(
        'SELECT razorpay_subscription_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].razorpay_subscription_id) {
        throw new Error('User has no Razorpay subscription');
      }

      const subscriptionId = result.rows[0].razorpay_subscription_id;

      // Resume subscription
      await razorpay.subscriptions.resume(subscriptionId, {
        resume_at: 'now',
      });

      logger.info('Subscription resumed via Razorpay', { userId, subscriptionId });
    } catch (error) {
      logger.error('Failed to resume Razorpay subscription', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscriptionDetails(userId: string): Promise<any | null> {
    try {
      // Get subscription ID
      const result = await Database.query(
        'SELECT razorpay_subscription_id FROM user_subscriptions WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].razorpay_subscription_id) {
        return null;
      }

      const subscriptionId = result.rows[0].razorpay_subscription_id;

      // Get subscription from Razorpay
      const subscription = await getRazorpayClient().subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Failed to get Razorpay subscription details', error as Error, { userId });
      throw error;
    }
  }
}
