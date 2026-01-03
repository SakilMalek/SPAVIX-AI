import { Router, Response } from 'express';
import { Database } from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { Errors, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const analyticsRoutes = Router();

analyticsRoutes.get('/', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  try {
    // Get total transformations
    const generations = await Database.getGenerations(req.user.id, 1000, 0);
    const totalTransformations = generations.length;

    // Get total projects
    const projects = await Database.getProjects(req.user.id, 1000, 0);
    const totalProjects = projects.length;

    // Calculate average transformations per day
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentGenerations = generations.filter((g: any) => new Date(g.created_at) > thirtyDaysAgo);
    const averageTransformationsPerDay = recentGenerations.length / 30;

    // Get most used style
    const styleCount: Record<string, number> = {};
    generations.forEach((g: any) => {
      styleCount[g.style] = (styleCount[g.style] || 0) + 1;
    });
    const mostUsedStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Get style distribution
    const styleDistribution = Object.entries(styleCount).map(([style, count]) => ({
      style,
      count,
    }));

    // Get room type distribution
    const roomTypeCount: Record<string, number> = {};
    generations.forEach((g: any) => {
      roomTypeCount[g.room_type] = (roomTypeCount[g.room_type] || 0) + 1;
    });
    const roomTypeDistribution = Object.entries(roomTypeCount).map(([roomType, count]) => ({
      roomType,
      count,
    }));

    // Get weekly activity
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayTransformations = generations.filter((g: any) => {
        const genDate = new Date(g.created_at);
        return genDate >= dayStart && genDate < dayEnd;
      }).length;

      weeklyActivity.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        transformations: dayTransformations,
      });
    }

    logger.info('Analytics retrieved', { userId: req.user.id });

    res.json({
      totalTransformations,
      totalProjects,
      averageTransformationsPerDay,
      mostUsedStyle,
      styleDistribution,
      roomTypeDistribution,
      weeklyActivity,
    });
  } catch (error: any) {
    logger.error('Analytics retrieval error', error instanceof Error ? error : new Error(String(error)));
    throw Errors.internalError('Failed to retrieve analytics');
  }
}));
