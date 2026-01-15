import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import 'dotenv/config';
import { authRoutes } from "./routes/auth.js";
import tokenRoutes from "./routes/token.js";
import { generationRoutes } from "./routes/generation.js";
import { uploadRoutes } from "./routes/upload.js";
import productsRoutes from "./routes/products.js";
import { materialsRoutes } from "./routes/materials.js";
import { stylesRoutes } from "./routes/styles.js";
import { projectRoutes } from "./routes/projects.js";
import { chatRoutes } from "./routes/chat.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { subscriptionRoutes } from "./routes/subscriptions.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import { stripeWebhookRoutes } from "./routes/stripe-webhook.js";
import { razorpayWebhookRoutes } from "./routes/razorpay-webhook.js";
import { Database } from "./db.js";
import { Router } from "express";
import { authMiddleware, type AuthRequest } from "./middleware/auth.js";
import { StarterPlanFeaturesService } from "./services/starterPlanFeatures.js";
import { logger } from "./utils/logger.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize database
  await Database.initializeDatabase();

  // Register auth routes
  app.use("/api/auth", authRoutes);
  app.use("/api/token", tokenRoutes);

  // Register other routes
  app.use("/api/generations", generationRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/materials", materialsRoutes);
  app.use("/api/styles", stylesRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // Register subscription routes (pricing/checkout)
  app.use("/api/subscriptions", subscriptionRoutes);
  
  // Register subscription feature/usage routes
  app.use("/api/subscription", subscriptionRouter);

  // Register Starter plan features routes (tutorials, email preferences, download history, analytics)
  const starterFeaturesRouter = Router();

  // GET /api/starter-features/tutorials
  starterFeaturesRouter.get('/tutorials', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const tutorials = await StarterPlanFeaturesService.getTutorials(1);
      res.json({ success: true, count: tutorials.length, tutorials });
    } catch (error) {
      logger.error('Failed to get tutorials', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get tutorials' });
    }
  });

  // GET /api/starter-features/tutorials/:category
  starterFeaturesRouter.get('/tutorials/:category', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { category } = req.params;
      const tutorials = await StarterPlanFeaturesService.getTutorialsByCategory(category, 1);
      res.json({ success: true, category, count: tutorials.length, tutorials });
    } catch (error) {
      logger.error('Failed to get tutorials by category', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get tutorials' });
    }
  });

  // GET /api/starter-features/email-preferences
  starterFeaturesRouter.get('/email-preferences', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const preferences = await StarterPlanFeaturesService.getEmailPreferences(req.user.id);
      if (!preferences) {
        res.status(404).json({ error: 'Email preferences not found' });
        return;
      }
      res.json({ success: true, preferences });
    } catch (error) {
      logger.error('Failed to get email preferences', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get email preferences' });
    }
  });

  // PUT /api/starter-features/email-preferences
  starterFeaturesRouter.put('/email-preferences', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { weekly_inspiration, design_tips, newsletter } = req.body;
      const updated = await StarterPlanFeaturesService.updateEmailPreferences(req.user.id, {
        weekly_inspiration,
        design_tips,
        newsletter,
      });
      if (!updated) {
        res.status(404).json({ error: 'Email preferences not found' });
        return;
      }
      res.json({ success: true, preferences: updated });
    } catch (error) {
      logger.error('Failed to update email preferences', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update email preferences' });
    }
  });

  // GET /api/starter-features/download-history
  starterFeaturesRouter.get('/download-history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await StarterPlanFeaturesService.getDownloadHistory(req.user.id, limit);
      res.json({ success: true, count: history.length, history });
    } catch (error) {
      logger.error('Failed to get download history', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get download history' });
    }
  });

  // GET /api/starter-features/usage-stats
  starterFeaturesRouter.get('/usage-stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const stats = await StarterPlanFeaturesService.getBasicUsageStats(req.user.id);
      if (!stats) {
        res.status(404).json({ error: 'Usage stats not found' });
        return;
      }
      res.json({ success: true, stats });
    } catch (error) {
      logger.error('Failed to get usage stats', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get usage stats' });
    }
  });

  // GET /api/starter-features/analytics-summary
  starterFeaturesRouter.get('/analytics-summary', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const days = parseInt(req.query.days as string) || 30;
      const summary = await StarterPlanFeaturesService.getAnalyticsSummary(req.user.id, days);
      res.json({ success: true, days, summary });
    } catch (error) {
      logger.error('Failed to get analytics summary', error as Error, { userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get analytics summary' });
    }
  });

  app.use("/api/starter-features", starterFeaturesRouter);

  // Register Stripe webhook (must be before express.json middleware in some cases)
  app.use("/api/stripe", stripeWebhookRoutes);

  // Register Razorpay webhook
  app.use("/api/razorpay", razorpayWebhookRoutes);

  return httpServer;
}
