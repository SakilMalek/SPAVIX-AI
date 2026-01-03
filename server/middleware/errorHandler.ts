import { Request, Response, NextFunction } from 'express';

/**
 * Standardized API error response format
 */
export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: Record<string, unknown>;
}

/**
 * Custom error class for API errors
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication errors (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Validation errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Resource errors (4xx)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT',
};

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | AppError | string,
  statusCode: number = 500,
  code: string = ErrorCodes.INTERNAL_ERROR,
  details?: Record<string, unknown>
): ApiError {
  const message = error instanceof Error ? error.message : String(error);
  
  return {
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
}

/**
 * Global error handling middleware
 * Must be registered AFTER all other middleware and routes
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  let statusCode = 500;
  let code = ErrorCodes.INTERNAL_ERROR;
  let message = 'Internal server error';
  let details: Record<string, unknown> | undefined;

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle validation errors
  else if (err.message.includes('Validation error')) {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = err.message;
  }
  // Handle JWT errors
  else if (err.message.includes('Invalid token') || err.message.includes('jwt')) {
    statusCode = 401;
    code = ErrorCodes.INVALID_TOKEN;
    message = 'Invalid or expired token';
  }
  // Handle database errors
  else if (err.message.includes('database') || err.message.includes('Database')) {
    statusCode = 500;
    code = ErrorCodes.DATABASE_ERROR;
    message = 'Database operation failed';
  }
  // Handle timeout errors
  else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
    statusCode = 504;
    code = ErrorCodes.TIMEOUT;
    message = 'Request timeout';
  }
  // Default error message
  else {
    message = err.message || 'An unexpected error occurred';
  }

  // Log error for debugging
  console.error(`[${code}] ${statusCode} - ${message}`, {
    error: err instanceof Error ? err.stack : err,
    details,
  });

  // Send error response
  const errorResponse = createErrorResponse(message, statusCode, code, details);
  res.status(statusCode).json(errorResponse);
}

/**
 * Async route wrapper to catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Helper functions for common errors
 */
export const Errors = {
  unauthorized: (message = 'Unauthorized') =>
    new AppError(message, 401, ErrorCodes.UNAUTHORIZED),
  
  invalidToken: (message = 'Invalid or expired token') =>
    new AppError(message, 401, ErrorCodes.INVALID_TOKEN),
  
  invalidCredentials: (message = 'Invalid email or password') =>
    new AppError(message, 401, ErrorCodes.INVALID_CREDENTIALS),
  
  validationError: (message: string, details?: Record<string, unknown>) =>
    new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details),
  
  notFound: (resource: string) =>
    new AppError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),
  
  conflict: (message: string) =>
    new AppError(message, 409, ErrorCodes.CONFLICT),
  
  duplicate: (resource: string) =>
    new AppError(`${resource} already exists`, 409, ErrorCodes.DUPLICATE_RESOURCE),
  
  rateLimited: (retryAfter: number) =>
    new AppError(
      'Too many requests, please try again later',
      429,
      ErrorCodes.RATE_LIMITED,
      { retryAfter }
    ),
  
  internalError: (message = 'Internal server error') =>
    new AppError(message, 500, ErrorCodes.INTERNAL_ERROR),
  
  databaseError: (message = 'Database operation failed') =>
    new AppError(message, 500, ErrorCodes.DATABASE_ERROR),
  
  externalServiceError: (service: string, message?: string) =>
    new AppError(
      message || `${service} service error`,
      503,
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      { service }
    ),
  
  timeout: (message = 'Request timeout') =>
    new AppError(message, 504, ErrorCodes.TIMEOUT),
};
