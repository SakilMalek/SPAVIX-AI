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
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(Errors.unauthorized('Missing or invalid authorization header'));
    }

    const token = authHeader.substring(7);
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
