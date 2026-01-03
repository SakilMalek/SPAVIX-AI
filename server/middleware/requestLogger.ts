/**
 * Request logging middleware
 * Logs all HTTP requests and responses with timing information
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

/**
 * Middleware to log HTTP requests and responses
 */
export function requestLogger(req: RequestWithId, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.id = randomUUID();
  req.startTime = Date.now();

  // Set request ID in response headers for tracing
  res.setHeader('X-Request-ID', req.id);

  // Log incoming request
  logger.logRequest(req.method, req.path || '/', {
    requestId: req.id,
    ip: req.ip || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  });

  // Intercept response to log it
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - (req.startTime || 0);
    
    // Log response
    logger.logResponse(req.method, req.path || '/', res.statusCode, duration, {
      requestId: req.id,
      userId: (req as any).user?.id,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}
