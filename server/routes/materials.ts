import { Router, Response, Request } from 'express';

export const materialsRoutes = Router();

const MATERIALS = {
  wallColors: [
    { id: 'warm-white', name: 'Warm White', hex: '#F5F1E8' },
    { id: 'cool-white', name: 'Cool White', hex: '#F0F0F0' },
    { id: 'greige', name: 'Greige', hex: '#D4C5B9' },
    { id: 'soft-gray', name: 'Soft Gray', hex: '#C0C0C0' },
    { id: 'charcoal', name: 'Charcoal', hex: '#36454F' },
    { id: 'muted-blue', name: 'Muted Blue', hex: '#6B8E99' },
    { id: 'sage-green', name: 'Sage Green', hex: '#9DC183' },
    { id: 'blush-pink', name: 'Blush Pink', hex: '#E8B4B8' },
    { id: 'terracotta', name: 'Terracotta', hex: '#C2581D' },
  ],
  floorTypes: [
    { id: 'marble', name: 'Marble', description: 'Elegant and luxurious' },
    { id: 'wood', name: 'Hardwood', description: 'Warm and natural' },
    { id: 'tile', name: 'Porcelain Tile', description: 'Durable and modern' },
    { id: 'concrete', name: 'Polished Concrete', description: 'Industrial and sleek' },
    { id: 'laminate', name: 'Laminate', description: 'Budget-friendly option' },
    { id: 'vinyl', name: 'Luxury Vinyl', description: 'Waterproof and durable' },
  ],
  curtainTypes: [
    { id: 'sheer', name: 'Sheer Curtains', description: 'Light and airy' },
    { id: 'blackout', name: 'Blackout Curtains', description: 'Light blocking' },
    { id: 'linen', name: 'Linen Curtains', description: 'Natural and textured' },
    { id: 'velvet', name: 'Velvet Curtains', description: 'Luxurious and rich' },
    { id: 'blinds', name: 'Roller Blinds', description: 'Modern and minimal' },
    { id: 'none', name: 'No Curtains', description: 'Bare windows' },
  ],
  lightingMoods: [
    { id: 'warm', name: 'Warm Lighting', description: 'Cozy and inviting' },
    { id: 'neutral', name: 'Neutral Lighting', description: 'Balanced and natural' },
    { id: 'cool', name: 'Cool Lighting', description: 'Bright and energetic' },
    { id: 'dim', name: 'Dim Lighting', description: 'Relaxing and intimate' },
  ],
  accentWallColors: [
    { id: 'navy', name: 'Navy Blue', hex: '#001F3F' },
    { id: 'forest-green', name: 'Forest Green', hex: '#228B22' },
    { id: 'burgundy', name: 'Burgundy', hex: '#800020' },
    { id: 'charcoal-accent', name: 'Charcoal', hex: '#36454F' },
    { id: 'none', name: 'No Accent Wall', hex: '#FFFFFF' },
  ],
};

materialsRoutes.get('/', (req: Request, res: Response): void => {
  res.json({
    success: true,
    materials: MATERIALS,
  });
});

materialsRoutes.get('/wall-colors', (req: Request, res: Response): void => {
  res.json({
    success: true,
    wallColors: MATERIALS.wallColors,
  });
});

materialsRoutes.get('/floor-types', (req: Request, res: Response): void => {
  res.json({
    success: true,
    floorTypes: MATERIALS.floorTypes,
  });
});

materialsRoutes.get('/curtain-types', (req: Request, res: Response): void => {
  res.json({
    success: true,
    curtainTypes: MATERIALS.curtainTypes,
  });
});

materialsRoutes.get('/lighting-moods', (req: Request, res: Response): void => {
  res.json({
    success: true,
    lightingMoods: MATERIALS.lightingMoods,
  });
});

materialsRoutes.get('/accent-colors', (req: Request, res: Response): void => {
  res.json({
    success: true,
    accentColors: MATERIALS.accentWallColors,
  });
});
