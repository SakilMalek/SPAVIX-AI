import { Router, Response } from 'express';
import { GeminiImageService } from '../services/gemini';
import { ShoppingListService } from '../services/shopping';
import { Database } from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

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

    console.log('Generating image with prompt for:', { roomType, style });

    const prompt = GeminiImageService.buildPrompt(roomType, style, materials);
    console.log('Generated prompt length:', prompt.length);

    console.log('Calling Gemini 2.5 Flash Image (img2img) for transformation...');
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

    console.log('Generation saved to database:', generation.id);

    res.json({
      success: true,
      generationId: generation.id,
      beforeImage: imageUrl,
      afterImage: afterImageUrl,
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

generationRoutes.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const generations = await Database.getGenerations(req.user.id, limit, offset);

    const formattedGenerations = generations.map((gen: any) => ({
      id: gen.id,
      before_image_url: gen.before_image_url,
      after_image_url: gen.after_image_url,
      style: gen.style,
      room_type: gen.room_type,
      created_at: gen.created_at,
    }));

    console.log('Returning generations:', formattedGenerations.length, 'items');

    res.json(formattedGenerations);
  } catch (error) {
    console.error('Get generations error:', error);
    res.status(500).json({ error: 'Failed to fetch generations' });
  }
});

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

    // Generate unique share ID
    const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

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

// UPDATE generation project association
generationRoutes.put('/:id/project', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { projectId } = req.body as { projectId: string | null };

    const generation = await Database.updateGenerationProject(req.params.id, req.user.id, projectId || null);

    if (!generation) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    console.log('Generation project updated:', req.params.id, 'projectId:', projectId);

    res.json({ success: true, generation });
  } catch (error) {
    console.error('Update generation project error:', error);
    res.status(500).json({ error: 'Failed to update generation project' });
  }
});
