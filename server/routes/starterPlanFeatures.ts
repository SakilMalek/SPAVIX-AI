/**
 * Starter Plan Features Routes
 * Handles tutorials, email preferences, download history, and analytics
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { StarterPlanFeaturesService } from '../services/starterPlanFeatures.js';
import { SubscriptionService } from '../services/subscription.js';
import { logger } from '../utils/logger.js';

export const starterPlanFeaturesRoutes = Router();

/**
 * GET /api/starter-features/tutorials
 * Get all available tutorials for user's plan
 */
starterPlanFeaturesRoutes.get('/tutorials', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Get user's plan tier (default to 1 for Starter)
    const planTier = 1;

    const tutorials = await StarterPlanFeaturesService.getTutorials(planTier);

    res.json({
      success: true,
      count: tutorials.length,
      tutorials,
    });
  } catch (error) {
    logger.error('Failed to get tutorials', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get tutorials' });
  }
});

/**
 * GET /api/starter-features/tutorials/:category
 * Get tutorials by category
 */
starterPlanFeaturesRoutes.get('/tutorials/:category', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { category } = req.params;

    // Get user's plan tier (default to 1 for Starter)
    const planTier = 1;

    const tutorials = await StarterPlanFeaturesService.getTutorialsByCategory(category, planTier);

    res.json({
      success: true,
      category,
      count: tutorials.length,
      tutorials,
    });
  } catch (error) {
    logger.error('Failed to get tutorials by category', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get tutorials' });
  }
});

/**
 * GET /api/starter-features/email-preferences
 * Get user's email preferences
 */
starterPlanFeaturesRoutes.get('/email-preferences', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
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

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    logger.error('Failed to get email preferences', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get email preferences' });
  }
});

/**
 * PUT /api/starter-features/email-preferences
 * Update user's email preferences
 */
starterPlanFeaturesRoutes.put('/email-preferences', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
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

    res.json({
      success: true,
      preferences: updated,
    });
  } catch (error) {
    logger.error('Failed to update email preferences', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
});

/**
 * GET /api/starter-features/download-history
 * Get user's download history
 */
starterPlanFeaturesRoutes.get('/download-history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const history = await StarterPlanFeaturesService.getDownloadHistory(req.user.id, limit);

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    logger.error('Failed to get download history', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get download history' });
  }
});

/**
 * GET /api/starter-features/usage-stats
 * Get user's basic usage statistics
 */
starterPlanFeaturesRoutes.get('/usage-stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
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

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Failed to get usage stats', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

/**
 * GET /api/starter-features/analytics-summary
 * Get user's analytics summary
 */
starterPlanFeaturesRoutes.get('/analytics-summary', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const days = parseInt(req.query.days as string) || 30;
    const summary = await StarterPlanFeaturesService.getAnalyticsSummary(req.user.id, days);

    res.json({
      success: true,
      days,
      summary,
    });
  } catch (error) {
    logger.error('Failed to get analytics summary', error as Error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

export default starterPlanFeaturesRoutes;
