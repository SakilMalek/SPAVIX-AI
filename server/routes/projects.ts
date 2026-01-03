import { Router, Response } from 'express';
import { Database } from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { generateSecureShareId } from '../utils/shareId';
import { createProjectSchema, updateProjectSchema, searchProjectSchema, paginationSchema, validateRequest } from '../middleware/validation';
import { Errors, asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export const projectRoutes = Router();

interface CreateProjectRequest {
  name: string;
  description: string;
}

interface UpdateProjectRequest {
  name: string;
  description: string;
}

// GET all projects for the authenticated user
projectRoutes.get('/', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  const validated = validateRequest(paginationSchema, req.query);
  const { limit, offset } = validated;

  const projects = await Database.getProjects(req.user.id, limit, offset);

  logger.info('Projects retrieved', { userId: req.user.id, count: projects.length });

  res.json(projects);
}));

// GET single project by ID
projectRoutes.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const project = await Database.getProjectById(req.params.id, req.user.id);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// CREATE new project
projectRoutes.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const validated = validateRequest(createProjectSchema, req.body);
    const { name, description } = validated;

    const project = await Database.createProject(req.user.id, name, description || '');

    console.log('Project created:', project.id);

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// UPDATE project
projectRoutes.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const validated = validateRequest(updateProjectSchema, req.body);
    const { name, description } = validated;

    const project = await Database.updateProject(req.params.id, req.user.id, name, description || '');

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    console.log('Project updated:', req.params.id);

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
projectRoutes.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const deleted = await Database.deleteProject(req.params.id, req.user.id);

    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    console.log('Project deleted:', req.params.id);

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// SEARCH projects
projectRoutes.get('/search/:query', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const validated = validateRequest(searchProjectSchema, { query: req.params.query });
    const { query } = validated;

    const projects = await Database.searchProjects(req.user.id, query);

    console.log('Search results:', projects.length, 'projects found');

    res.json(projects);
  } catch (error) {
    console.error('Search projects error:', error);
    res.status(500).json({ error: 'Failed to search projects' });
  }
});

// CREATE project share link
projectRoutes.post('/:id/share', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Check if project exists and belongs to user
    const project = await Database.getProjectById(req.params.id, req.user.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if share already exists
    const existingShare = await Database.getProjectShareByProjectId(req.params.id);
    if (existingShare) {
      res.json({ success: true, shareId: existingShare.share_id });
      return;
    }

    // Generate cryptographically secure share ID
    const shareId = generateSecureShareId();

    const share = await Database.createProjectShare(req.params.id, req.user.id, shareId);

    console.log('Project share created:', req.params.id, 'with shareId:', shareId);

    res.json({ success: true, shareId: share.shareId });
  } catch (error: any) {
    console.error('Project share creation error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to create project share' });
  }
});

// DELETE project share link
projectRoutes.delete('/:id/share', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const deleted = await Database.deleteProjectShare(req.params.id, req.user.id);

    if (!deleted) {
      res.status(404).json({ error: 'Project share not found' });
      return;
    }

    console.log('Project share deleted:', req.params.id);

    res.json({ success: true, message: 'Project share deleted' });
  } catch (error) {
    console.error('Delete project share error:', error);
    res.status(500).json({ error: 'Failed to delete project share' });
  }
});
