/**
 * Starter Plan Features Service
 * Handles tutorials, email preferences, download history, and analytics
 */

import { Database } from '../db.js';
import { logger } from '../utils/logger.js';

export interface Tutorial {
  id: string;
  title: string;
  description?: string;
  content: string;
  category: string;
  difficulty_level?: string;
  min_plan_tier: number;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface EmailPreferences {
  id: string;
  user_id: string;
  weekly_inspiration: boolean;
  design_tips: boolean;
  newsletter: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DownloadRecord {
  id: string;
  user_id: string;
  design_id?: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  download_date: Date;
  created_at: Date;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: Date;
}

export class StarterPlanFeaturesService {
  /**
   * Get all tutorials for a user's plan tier
   */
  static async getTutorials(planTier: number = 1): Promise<Tutorial[]> {
    try {
      const result = await Database.query(
        `SELECT * FROM tutorials 
         WHERE min_plan_tier <= $1 
         ORDER BY order_index ASC`,
        [planTier]
      );

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        content: row.content,
        category: row.category,
        difficulty_level: row.difficulty_level,
        min_plan_tier: row.min_plan_tier,
        order_index: row.order_index,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
    } catch (error) {
      logger.error('Failed to get tutorials', error as Error, { planTier });
      return [];
    }
  }

  /**
   * Get tutorials by category
   */
  static async getTutorialsByCategory(category: string, planTier: number = 1): Promise<Tutorial[]> {
    try {
      const result = await Database.query(
        `SELECT * FROM tutorials 
         WHERE category = $1 AND min_plan_tier <= $2
         ORDER BY order_index ASC`,
        [category, planTier]
      );

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        content: row.content,
        category: row.category,
        difficulty_level: row.difficulty_level,
        min_plan_tier: row.min_plan_tier,
        order_index: row.order_index,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
    } catch (error) {
      logger.error('Failed to get tutorials by category', error as Error, { category, planTier });
      return [];
    }
  }

  /**
   * Get user's email preferences
   */
  static async getEmailPreferences(userId: string): Promise<EmailPreferences | null> {
    try {
      const result = await Database.query(
        `SELECT * FROM user_email_preferences WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        weekly_inspiration: row.weekly_inspiration,
        design_tips: row.design_tips,
        newsletter: row.newsletter,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    } catch (error) {
      logger.error('Failed to get email preferences', error as Error, { userId });
      return null;
    }
  }

  /**
   * Update user's email preferences
   */
  static async updateEmailPreferences(
    userId: string,
    preferences: Partial<EmailPreferences>
  ): Promise<EmailPreferences | null> {
    try {
      const result = await Database.query(
        `UPDATE user_email_preferences 
         SET weekly_inspiration = COALESCE($2, weekly_inspiration),
             design_tips = COALESCE($3, design_tips),
             newsletter = COALESCE($4, newsletter),
             updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          preferences.weekly_inspiration ?? null,
          preferences.design_tips ?? null,
          preferences.newsletter ?? null,
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        weekly_inspiration: row.weekly_inspiration,
        design_tips: row.design_tips,
        newsletter: row.newsletter,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    } catch (error) {
      logger.error('Failed to update email preferences', error as Error, { userId });
      return null;
    }
  }

  /**
   * Record a download
   */
  static async recordDownload(
    userId: string,
    fileName: string,
    designId?: string,
    fileSize?: number,
    fileType?: string
  ): Promise<DownloadRecord | null> {
    try {
      const result = await Database.query(
        `INSERT INTO download_history (user_id, design_id, file_name, file_size, file_type, download_date)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [userId, designId || null, fileName, fileSize || null, fileType || null]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        design_id: row.design_id,
        file_name: row.file_name,
        file_size: row.file_size,
        file_type: row.file_type,
        download_date: new Date(row.download_date),
        created_at: new Date(row.created_at),
      };
    } catch (error) {
      logger.error('Failed to record download', error as Error, { userId, fileName });
      return null;
    }
  }

  /**
   * Get user's download history
   */
  static async getDownloadHistory(userId: string, limit: number = 50): Promise<DownloadRecord[]> {
    try {
      const result = await Database.query(
        `SELECT * FROM download_history 
         WHERE user_id = $1 
         ORDER BY download_date DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        design_id: row.design_id,
        file_name: row.file_name,
        file_size: row.file_size,
        file_type: row.file_type,
        download_date: new Date(row.download_date),
        created_at: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error('Failed to get download history', error as Error, { userId });
      return [];
    }
  }

  /**
   * Record an analytics event
   */
  static async recordEvent(
    userId: string,
    eventType: string,
    eventData: Record<string, any> = {}
  ): Promise<AnalyticsEvent | null> {
    try {
      const result = await Database.query(
        `INSERT INTO analytics_events (user_id, event_type, event_data)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, eventType, JSON.stringify(eventData)]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        event_type: row.event_type,
        event_data: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
        created_at: new Date(row.created_at),
      };
    } catch (error) {
      logger.error('Failed to record event', error as Error, { userId, eventType });
      return null;
    }
  }

  /**
   * Get user's analytics summary
   */
  static async getAnalyticsSummary(userId: string, days: number = 30): Promise<Record<string, number>> {
    try {
      const result = await Database.query(
        `SELECT event_type, COUNT(*) as count
         FROM analytics_events
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY event_type`,
        [userId]
      );

      const summary: Record<string, number> = {};
      result.rows.forEach(row => {
        summary[row.event_type] = parseInt(row.count);
      });

      return summary;
    } catch (error) {
      logger.error('Failed to get analytics summary', error as Error, { userId, days });
      return {};
    }
  }

  /**
   * Get basic usage statistics for Starter plan
   */
  static async getBasicUsageStats(userId: string): Promise<{
    transformations_used: number;
    projects_created: number;
    downloads_count: number;
    styles_used: string[];
  } | null> {
    try {
      // Get transformations used this month
      const transformationsResult = await Database.query(
        `SELECT COUNT(*) as count FROM usage_tracking 
         WHERE user_id = $1 AND resource_type = 'transformation' 
         AND period_start >= DATE_TRUNC('month', NOW())`,
        [userId]
      );

      // Get projects created
      const projectsResult = await Database.query(
        `SELECT COUNT(*) as count FROM projects WHERE user_id = $1`,
        [userId]
      );

      // Get downloads count
      const downloadsResult = await Database.query(
        `SELECT COUNT(*) as count FROM download_history WHERE user_id = $1`,
        [userId]
      );

      // Get styles used
      const stylesResult = await Database.query(
        `SELECT DISTINCT style FROM generations WHERE user_id = $1 ORDER BY style`,
        [userId]
      );

      return {
        transformations_used: parseInt(transformationsResult.rows[0]?.count || 0),
        projects_created: parseInt(projectsResult.rows[0]?.count || 0),
        downloads_count: parseInt(downloadsResult.rows[0]?.count || 0),
        styles_used: stylesResult.rows.map(row => row.style),
      };
    } catch (error) {
      logger.error('Failed to get basic usage stats', error as Error, { userId });
      return null;
    }
  }
}
