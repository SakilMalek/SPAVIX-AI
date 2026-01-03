import { z } from 'zod';
import { AppError } from './errorHandler';

/**
 * Validation schemas for API requests
 * Enforces input constraints to prevent DoS and data corruption
 */

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(255)
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  profilePicture: z.string().url('Invalid profile picture URL').max(2048).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
});

export const googleAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(255).optional(),
  picture: z.string().url().optional(),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name required').max(255),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name required').max(255),
  description: z.string().max(2000).optional(),
});

export const searchProjectSchema = z.object({
  query: z.string().min(1, 'Search term required').max(255),
});

// Generation schemas
export const generationSchema = z.object({
  imageUrl: z.string()
    .min(1, 'Image URL required')
    .max(5242880, 'Image URL too large (max 5MB)')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'),
      'Image URL must be a valid HTTP(S) URL or data URI'
    ),
  roomType: z.string().min(1, 'Room type required').max(100),
  style: z.string().min(1, 'Style required').max(100),
  materials: z.object({
    wallColor: z.string().max(100).optional(),
    floorType: z.string().max(100).optional(),
    curtainType: z.string().max(100).optional(),
    lightingMood: z.string().max(100).optional(),
    accentWall: z.string().max(100).optional(),
  }).strict().optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
});

// Chat schemas
export const chatSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  message: z.string().min(1, 'Message required').max(5000),
});

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * Validate request data against schema
 * Returns validated data or throws validation error
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validation error: ${messages}`, 400, 'VALIDATION_ERROR');
    }
    throw error;
  }
}
