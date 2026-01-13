/**
 * Stripe Webhook Handler
 * Processes Stripe events for subscription lifecycle management
 */

import { Router, Request, Response, raw } from 'express';
import { StripeService } from '../services/stripe.js';
import { logger } from '../utils/logger.js';

export const stripeWebhookRoutes = Router();

// Use raw body parser for webhook signature verification
stripeWebhookRoutes.post(
  '/webhook',
  raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      // Verify webhook signature
      const event = StripeService.verifyWebhookSignature(
        req.body as unknown as string,
        signature
      );

      logger.info('Webhook received', { eventType: event.type, eventId: event.id });

      // Process the event
      await StripeService.processWebhookEvent(event);

      // Return success
      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook processing failed', error as Error);
      res.status(400).json({ error: (error as Error).message });
    }
  }
);
