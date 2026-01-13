/**
 * Razorpay Webhook Handler
 * Processes Razorpay events for subscription lifecycle management
 */

import { Router, Request, Response } from 'express';
import { RazorpayService } from '../services/razorpay.js';
import { logger } from '../utils/logger.js';

export const razorpayWebhookRoutes = Router();

/**
 * POST /api/razorpay/webhook
 * Handle Razorpay webhook events
 */
razorpayWebhookRoutes.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      return;
    }

    // Get raw body for signature verification
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      logger.warn('Invalid Razorpay webhook signature');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    const payload = req.body;

    logger.info('Razorpay webhook received', { eventType: payload.event });

    // Process the event
    await RazorpayService.processWebhookEvent({
      type: payload.event,
      payload: payload,
    });

    // Return success
    res.json({ received: true });
  } catch (error) {
    logger.error('Razorpay webhook processing failed', error as Error);
    res.status(400).json({ error: (error as Error).message });
  }
});
