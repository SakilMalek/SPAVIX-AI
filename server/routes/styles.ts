import { Router, Response, Request } from 'express';

export const stylesRoutes = Router();

const STYLES = [
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean lines, neutral colors, minimal clutter',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
  {
    id: 'industrial-chic',
    name: 'Industrial Chic',
    description: 'Exposed brick, metal accents, concrete finishes',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light woods, cozy textures, functional design',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    description: 'Modern furniture, bold colors, artistic elements',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
  {
    id: 'luxury-modern',
    name: 'Luxury Modern',
    description: 'Premium materials, elegant finishes, sophisticated design',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    description: 'Eclectic mix, vibrant colors, natural textures',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    description: 'Rustic charm, vintage elements, warm tones',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
  {
    id: 'mid-century',
    name: 'Mid-Century Modern',
    description: 'Retro furniture, warm woods, geometric patterns',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
  },
];

stylesRoutes.get('/', (req: Request, res: Response): void => {
  res.json({
    success: true,
    styles: STYLES,
    total: STYLES.length,
  });
});

stylesRoutes.get('/:id', (req: Request, res: Response): void => {
  const style = STYLES.find((s) => s.id === req.params.id);

  if (!style) {
    res.status(404).json({ error: 'Style not found' });
    return;
  }

  res.json({ success: true, style });
});
