import { Router, Response } from 'express';
import { GeminiImageService } from '../services/gemini';
import { ShoppingListService } from '../services/shopping';
import { Database } from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { generateSecureShareId } from '../utils/shareId';
import { logger } from '../utils/logger';
import { Errors, asyncHandler } from '../middleware/errorHandler.js';
import { paginationSchema, validateRequest } from '../middleware/validation.js';

export const generationRoutes = Router();

interface GenerationRequest {
  imageUrl: string;
  roomType: string;
  style: string;
  materials: {
    wallColor?: string;
    floorType?: string;
    curtainType?: string;
    lightingMood?: string;
    accentWall?: string;
  };
  projectId?: string;
}

generationRoutes.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { imageUrl, roomType, style, materials, projectId } = req.body as GenerationRequest;

    if (!imageUrl || !roomType || !style) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate projectId if provided
    if (projectId) {
      const project = await Database.getProjectById(projectId, req.user.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found or does not belong to user' });
        return;
      }
      console.log('Generating image for project:', projectId);
    }

    console.log('Generating image with prompt for:', { roomType, style, projectId });

    // Stage 1: Detect room type from image
    console.log('🔍 Stage 1: Detecting room type...');
    let detectedRoomType: string;
    try {
      detectedRoomType = await GeminiImageService.detectRoomType(imageUrl);
      console.log(`✅ Room detected: ${detectedRoomType}`);
    } catch (error: any) {
      console.warn('⚠️ Room detection failed, using user-provided room type:', roomType);
      detectedRoomType = roomType; // Fallback to user-provided room type
    }

    // Stage 2: Build prompt with detected room type and generate image
    const prompt = GeminiImageService.buildPrompt(detectedRoomType, style, materials);
    console.log('Generated prompt length:', prompt.length);

    console.log('🎨 Stage 2: Calling Gemini 2.5 Flash Image (img2img) for transformation...');
    let imageBuffer: Buffer;
    try {
      imageBuffer = await GeminiImageService.generateImage(prompt, imageUrl);
      console.log('✅ Image generated successfully, size:', imageBuffer.length);
    } catch (error: any) {
      console.error('❌ Gemini generation failed:', error.message);
      throw new Error(`Image generation failed: ${error.message}`);
    }

    const afterImageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    const generation = await Database.saveGeneration(
      req.user.id,
      imageUrl,
      afterImageUrl,
      style,
      materials,
      roomType,
      projectId
    );

    // Save initial transformation history (version 1)
    await Database.saveTransformationHistory(
      generation.id,
      req.user.id,
      1,
      imageUrl,
      afterImageUrl,
      style,
      materials,
      roomType,
      'completed'
    );

    logger.info('Generation created with history', { generationId: generation.id, userId: req.user.id, projectId });

    res.json({
      success: true,
      id: generation.id,
      generationId: generation.id,
      beforeImage: imageUrl,
      afterImage: afterImageUrl,
      version: 1,
      projectId: projectId || null,
    });
  } catch (error: any) {
    console.error('Generation error:', error.message || error);
    res.status(500).json({ error: error.message || 'Generation failed' });
  }
});

// Public endpoint to retrieve shared transformation - MUST come before /:id routes
generationRoutes.get(/^\/shares\/([a-zA-Z0-9]+)$/, async (req: any, res: Response): Promise<void> => {
  const shareId = req.params[0];
  try {
    const generation = await Database.getSharedGeneration(shareId);

    if (!generation) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    res.json({
      id: generation.id,
      before_image_url: generation.before_image_url,
      after_image_url: generation.after_image_url,
      style: generation.style,
      room_type: generation.room_type,
      created_at: generation.created_at,
    });
  } catch (error: any) {
    console.error('Share retrieval error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to retrieve share' });
  }
});

generationRoutes.get('/', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  const startTime = Date.now();
  console.log(`[GENERATIONS] Starting GET / request for user ${req.user.id}`);

  const validationStart = Date.now();
  const validated = validateRequest(paginationSchema, req.query);
  const { limit, offset } = validated;
  console.log(`[GENERATIONS] Validation took ${Date.now() - validationStart}ms`);

  const dbStart = Date.now();
  const generations = await Database.getGenerations(req.user.id, limit, offset);
  const dbDuration = Date.now() - dbStart;
  console.log(`[GENERATIONS] Database query took ${dbDuration}ms, returned ${generations.length} items`);

  const formatStart = Date.now();
  const formattedGenerations = generations.map((gen: any) => ({
    id: gen.id,
    style: gen.style,
    room_type: gen.room_type,
    created_at: gen.created_at,
    // Images are loaded on-demand to avoid transferring 50+ MB of data
  }));
  console.log(`[GENERATIONS] Formatting took ${Date.now() - formatStart}ms`);

  const totalDuration = Date.now() - startTime;
  console.log(`[GENERATIONS] Total request time: ${totalDuration}ms`);
  logger.info('Generations retrieved', { userId: req.user.id, count: formattedGenerations.length, duration: totalDuration });

  res.json(formattedGenerations);
}));

generationRoutes.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const generation = await Database.getGenerationById(req.params.id, req.user.id);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    res.json({ success: true, generation });
  } catch (error) {
    console.error('Get generation error:', error);
    res.status(500).json({ error: 'Failed to fetch generation' });
  }
});

generationRoutes.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const generation = await Database.getGenerationById(req.params.id, req.user.id);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    await Database.query(
      'DELETE FROM generations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    console.log('Generation deleted:', req.params.id);
    res.json({ success: true, message: 'Generation deleted' });
  } catch (error) {
    console.error('Delete generation error:', error);
    res.status(500).json({ error: 'Failed to delete generation' });
  }
});

generationRoutes.post('/:id/shopping-list', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const generation = await Database.getGenerationById(req.params.id, req.user.id);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    console.log('Checking for cached shopping list for generation:', req.params.id);

    const cachedShoppingList = await Database.getShoppingList(req.params.id, req.user.id);

    if (cachedShoppingList) {
      console.log('Returning cached shopping list');
      res.json({
        success: true,
        shoppingList: cachedShoppingList,
        generationId: generation.id,
        cached: true,
      });
      return;
    }

    console.log('Generating new shopping list for generation:', req.params.id);

    const shoppingList = await ShoppingListService.generateShoppingList(
      generation.before_image_url,
      generation.after_image_url
    );

    await Database.saveShoppingList(req.params.id, req.user.id, shoppingList);
    console.log('Shopping list saved to cache');

    res.json({
      success: true,
      shoppingList,
      generationId: generation.id,
      cached: false,
    });
  } catch (error: any) {
    console.error('Shopping list generation error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to generate shopping list' });
  }
});

generationRoutes.post('/:id/share', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const generation = await Database.getGenerationById(req.params.id, req.user.id);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    // Check if share already exists
    let existingShare = await Database.getShareByGenerationId(req.params.id);
    
    if (existingShare) {
      res.json({ success: true, shareId: existingShare.share_id });
      return;
    }

    // Generate cryptographically secure share ID
    const shareId = generateSecureShareId();

    const share = await Database.createShare(req.params.id, req.user.id, shareId);

    console.log('Share created for generation:', req.params.id, 'with shareId:', shareId);

    res.json({ success: true, shareId: share.shareId });
  } catch (error: any) {
    console.error('Share creation error:', error.message || error);
    res.status(500).json({ error: error.message || 'Failed to create share' });
  }
});

// GET transformations by project
generationRoutes.get('/project/:projectId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const generations = await Database.getGenerationsByProjectId(req.params.projectId, req.user.id);

    const formattedGenerations = generations.map((gen: any) => ({
      id: gen.id,
      project_id: gen.project_id,
      before_image_url: gen.before_image_url,
      after_image_url: gen.after_image_url,
      style: gen.style,
      room_type: gen.room_type,
      created_at: gen.created_at,
    }));

    console.log('Returning generations for project:', formattedGenerations.length, 'items');

    res.json(formattedGenerations);
  } catch (error) {
    console.error('Get project generations error:', error);
    res.status(500).json({ error: 'Failed to fetch project generations' });
  }
});

// GET transformation history for a generation (paginated, without images)
generationRoutes.get('/:id/history', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized('Not authenticated');
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  const history = await Database.getTransformationHistory(req.params.id, req.user.id, limit, offset);
  const totalCount = await Database.getTransformationHistoryCount(req.params.id, req.user.id);

  if (!history || history.length === 0) {
    throw Errors.notFound('No transformation history found');
  }

  const formattedHistory = history.map((h: any) => ({
    id: h.id,
    version_number: h.version_number,
    style: h.style,
    room_type: h.room_type,
    status: h.status,
    created_at: h.created_at,
  }));

  logger.info('Transformation history retrieved', { generationId: req.params.id, userId: req.user.id, versions: history.length, total: totalCount });

  res.json({
    generationId: req.params.id,
    totalVersions: totalCount,
    currentPage: Math.floor(offset / limit) + 1,
    pageSize: limit,
    history: formattedHistory,
  });
}));

// GET specific version of transformation
generationRoutes.get('/:id/history/:version', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized('Not authenticated');
  }

  const versionNumber = parseInt(req.params.version);
  const version = await Database.getTransformationVersion(req.params.id, req.user.id, versionNumber);

  if (!version) {
    throw Errors.notFound('Version not found');
  }

  logger.info('Transformation version retrieved', { generationId: req.params.id, userId: req.user.id, version: versionNumber });

  res.json({
    id: version.id,
    generation_id: version.generation_id,
    version_number: version.version_number,
    style: version.style,
    room_type: version.room_type,
    materials: version.materials,
    before_image_url: version.before_image_url,
    after_image_url: version.after_image_url,
    status: version.status,
    created_at: version.created_at,
  });
}));

// CREATE new transformation version (edit existing generation)
generationRoutes.post('/:id/history', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized('Not authenticated');
  }

  const { imageUrl, roomType, style, materials } = req.body;

  if (!imageUrl || !roomType || !style) {
    throw Errors.validationError('Missing required fields: imageUrl, roomType, style');
  }

  // Verify generation exists and belongs to user
  const generation = await Database.getGenerationById(req.params.id, req.user.id);
  if (!generation) {
    throw Errors.notFound('Generation not found');
  }

  // Generate new version with 2-stage pipeline
  // Stage 1: Detect room type
  console.log('🔍 Stage 1: Detecting room type for new version...');
  let detectedRoomType: string;
  try {
    detectedRoomType = await GeminiImageService.detectRoomType(imageUrl);
    console.log(`✅ Room detected: ${detectedRoomType}`);
  } catch (error: any) {
    console.warn('⚠️ Room detection failed, using user-provided room type:', roomType);
    detectedRoomType = roomType;
  }

  // Stage 2: Generate with detected room type
  const prompt = GeminiImageService.buildPrompt(detectedRoomType, style, materials);
  let imageBuffer: Buffer;
  try {
    imageBuffer = await GeminiImageService.generateImage(prompt, imageUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Gemini generation failed', new Error(errorMessage), { generationId: req.params.id });
    throw Errors.internalError(`Image generation failed: ${errorMessage}`);
  }

  const afterImageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  // Get next version number
  const nextVersion = await Database.getNextVersionNumber(req.params.id);

  // Save new transformation version
  await Database.saveTransformationHistory(
    req.params.id,
    req.user.id,
    nextVersion,
    imageUrl,
    afterImageUrl,
    style,
    materials,
    roomType,
    'completed'
  );

  logger.info('New transformation version created', { generationId: req.params.id, userId: req.user.id, version: nextVersion });

  res.json({
    success: true,
    generationId: req.params.id,
    version: nextVersion,
    beforeImage: imageUrl,
    afterImage: afterImageUrl,
  });
}));

// UPDATE generation project association
generationRoutes.put('/:id/project', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  const { projectId } = req.body as { projectId: string | null };

  // Verify generation exists and belongs to user
  const generation = await Database.getGenerationById(req.params.id, req.user.id);
  if (!generation) {
    throw Errors.notFound('Generation');
  }

  // Verify project exists and belongs to user (if projectId provided)
  if (projectId) {
    const project = await Database.getProjectById(projectId, req.user.id);
    if (!project) {
      throw Errors.notFound('Project');
    }
  }

  // Update generation project association
  const oldProjectId = generation.project_id;
  const updated = await Database.updateGenerationProject(req.params.id, req.user.id, projectId || null);

  if (!updated) {
    throw Errors.internalError('Failed to update generation project');
  }

  // Log the assignment change
  logger.info('Transformation project assignment changed', {
    generationId: req.params.id,
    oldProjectId: oldProjectId,
    newProjectId: projectId || null,
    userId: req.user.id
  });

  res.json({ success: true, generation: updated });
}));

// UNLINK generation from project
generationRoutes.delete('/:id/project', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw Errors.unauthorized();
  }

  // Verify generation exists and belongs to user
  const generation = await Database.getGenerationById(req.params.id, req.user.id);
  if (!generation) {
    throw Errors.notFound('Generation');
  }

  if (!generation.project_id) {
    throw Errors.validationError('Generation is not linked to any project');
  }

  // Unlink from project
  const updated = await Database.updateGenerationProject(req.params.id, req.user.id, null);

  if (!updated) {
    throw Errors.internalError('Failed to unlink generation from project');
  }

  logger.info('Transformation unlinked from project', {
    generationId: req.params.id,
    projectId: generation.project_id,
    userId: req.user.id
  });

  res.json({ success: true, generation: updated });
}));
