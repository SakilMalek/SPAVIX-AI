/**
 * Database query logging wrapper
 * Logs all database operations with timing and performance metrics
 */

import { logger } from '../utils/logger.js';

export interface QueryMetrics {
  query: string;
  params?: unknown[];
  duration: number;
  rowCount?: number;
  error?: Error;
}

/**
 * Wrap database query to log execution
 */
export function logQuery(metrics: QueryMetrics, context?: Record<string, any>): void {
  if (metrics.error) {
    logger.error(
      `Database query failed: ${metrics.query}`,
      metrics.error,
      {
        ...context,
        query: metrics.query,
        params: metrics.params,
        duration: metrics.duration,
      }
    );
  } else {
    logger.debug(`Database query executed`, {
      ...context,
      query: metrics.query,
      params: metrics.params,
      duration: metrics.duration,
      rowCount: metrics.rowCount,
    });
  }
}

/**
 * Log slow queries (> 1000ms)
 */
export function logSlowQuery(metrics: QueryMetrics, context?: Record<string, any>): void {
  if (metrics.duration > 1000) {
    logger.warn(`Slow database query detected (${metrics.duration}ms): ${metrics.query}`, {
      ...context,
      query: metrics.query,
      params: metrics.params,
      duration: metrics.duration,
      rowCount: metrics.rowCount,
    });
  }
}
