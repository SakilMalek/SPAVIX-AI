import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Database } from '../db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { Errors, asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const dataRoutes = Router();

// GET /api/data/export - Export user data (GDPR right to data portability)
dataRoutes.get('/export', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  try {
    // Fetch all user data
    const user = await Database.getUserById(req.user.id);
    if (!user) {
      throw Errors.notFound('User');
    }

    const generations = await Database.getGenerations(req.user.id, 1000, 0);
    const projects = await Database.getProjects(req.user.id, 1000, 0);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name || null,
        picture: user.picture || null
      },
      statistics: {
        totalGenerations: generations.length,
        totalProjects: projects.length
      },
      generations: generations.map((g: any) => ({
        id: g.id,
        style: g.style,
        roomType: g.room_type,
        projectId: g.project_id,
        createdAt: g.created_at
      })),
      projects: projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.created_at
      }))
    };

    logger.logSecurity('User data export requested', 'low', { userId: req.user.id });

    // Send as JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="spavix-data-export.json"');
    res.json(exportData);
  } catch (error: any) {
    logger.error('Data export error', error instanceof Error ? error : new Error(String(error)));
    throw Errors.internalError('Failed to export data');
  }
}));

// DELETE /api/data/delete - Delete user account and all data (GDPR right to erasure)
dataRoutes.delete('/delete', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  try {
    const { password } = req.body;

    if (!password) {
      throw Errors.validationError('Password required for account deletion');
    }

    // Fetch user with password hash
    const user = await Database.getUserByEmail(req.user.email);
    if (!user) {
      throw Errors.notFound('User');
    }

    // Verify password before deletion
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      logger.logSecurity('Account deletion: Invalid password', 'medium', { userId: req.user.id });
      throw Errors.invalidCredentials();
    }

    // Log deletion request
    logger.logSecurity('User account deletion initiated', 'high', { userId: req.user.id, email: req.user.email });

    // Delete all user data (cascading deletes handle related data)
    await Database.deleteUser(req.user.id);

    // Clear session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error', { error: err });
      }
    });

    logger.logSecurity('User account deleted', 'high', { userId: req.user.id, email: req.user.email });

    res.json({ success: true, message: 'Account and all data deleted' });
  } catch (error: any) {
    logger.error('Account deletion error', error instanceof Error ? error : new Error(String(error)));
    throw Errors.internalError('Failed to delete account');
  }
}));

// POST /api/data/withdraw-consent - Withdraw consent (GDPR right to object)
dataRoutes.post('/withdraw-consent', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  try {
    const { consentType } = req.body;

    if (!['privacy', 'terms', 'marketing'].includes(consentType)) {
      throw Errors.validationError('Invalid consent type');
    }

    // Update consent in database
    await Database.withdrawConsent(req.user.id, consentType);

    logger.logSecurity('User withdrew consent', 'low', {
      userId: req.user.id,
      consentType
    });

    res.json({ success: true, message: `${consentType} consent withdrawn` });
  } catch (error: any) {
    logger.error('Consent withdrawal error', error instanceof Error ? error : new Error(String(error)));
    throw Errors.internalError('Failed to withdraw consent');
  }
}));

// POST /api/data/consent - Record user consent (GDPR consent requirement)
dataRoutes.post('/consent', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  try {
    const { privacyConsent, termsConsent, marketingConsent } = req.body;

    if (!privacyConsent || !termsConsent) {
      throw Errors.validationError('Privacy and terms consent required');
    }

    await Database.recordUserConsent(
      req.user.id,
      privacyConsent === true,
      termsConsent === true,
      marketingConsent === true || false
    );

    logger.logSecurity('User consent recorded', 'low', {
      userId: req.user.id,
      privacyConsent,
      termsConsent,
      marketingConsent
    });

    res.json({ success: true, message: 'Consent recorded' });
  } catch (error: any) {
    logger.error('Consent recording error', error instanceof Error ? error : new Error(String(error)));
    throw Errors.internalError('Failed to record consent');
  }
}));
