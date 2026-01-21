import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { File } from 'multer';
import { getJWTSecret } from '../config/secrets.js';
import { Errors } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  file?: File;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Try to get token from Authorization header first (for API calls)
    let token = '';
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      // Fall back to HTTP-only cookie (for browser requests)
      token = req.cookies.accessToken;
    } else {
      return next(Errors.unauthorized('Missing or invalid authorization header'));
    }

    const secret = getJWTSecret();

    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(Errors.invalidToken());
    }
    return next(error);
  }
}
