import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';

interface DetectedItem {
  id: string;
  name: string;
  description: string;
  category: string;
  color?: string;
  material?: string;
  estimatedPrice?: string;
  confidence: number;
}

interface ProductDetectionResult {
  items: DetectedItem[];
  totalItems: number;
  analysisTimestamp: string;
}

export class ProductDetectionService {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async detectItemsInImage(imagePath: string): Promise<ProductDetectionResult> {
    try {
      console.log('[ProductDetection] Starting item detection for:', imagePath);

      let base64Image: string;
      let mimeType: string;

      if (imagePath.startsWith('data:')) {
        const matches = imagePath.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid data URL format');
        }
        mimeType = matches[1];
        base64Image = matches[2];
      } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        const response = await fetch(imagePath);
        const buffer = await response.arrayBuffer();
        base64Image = Buffer.from(buffer).toString('base64');
        mimeType = response.headers.get('content-type') || 'image/jpeg';
      } else {
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }
        const imageBuffer = fs.readFileSync(imagePath);
        base64Image = imageBuffer.toString('base64');
        mimeType = this.getMimeType(imagePath);
      }

      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const detectionPrompt = `Analyze this interior design image and detect ALL furniture, decor, and design elements visible.

For each item detected, provide:
1. Item name (specific, e.g., "gray modular sofa" not just "sofa")
2. Brief description (style, color, material if visible)
3. Category (furniture, lighting, decor, textiles, wall-treatment, flooring, etc.)
4. Color (if visible)
5. Material (if identifiable)
6. Estimated price range (budget/mid-range/premium)
7. Confidence level (0-100, how certain you are about the item)

Format as JSON array with these exact fields:
[
  {
    "name": "item name",
    "description": "detailed description",
    "category": "category",
    "color": "color",
    "material": "material",
    "estimatedPrice": "price range",
    "confidence": 95
  }
]

IMPORTANT: Be specific and detailed. Include EVERY visible item (furniture, lighting, decor, plants, artwork, rugs, curtains, etc.). Aim for 15-30 items depending on room complexity.`;

      const response = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        detectionPrompt,
      ]);

      const responseText = response.response.text();
      console.log('[ProductDetection] Raw response:', responseText.substring(0, 200));

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from Gemini response');
      }

      const parsedItems = JSON.parse(jsonMatch[0]);
      const items: DetectedItem[] = parsedItems.map((item: any, index: number) => ({
        id: `item_${index + 1}`,
        name: item.name || 'Unknown Item',
        description: item.description || '',
        category: item.category || 'other',
        color: item.color,
        material: item.material,
        estimatedPrice: item.estimatedPrice,
        confidence: item.confidence || 80,
      }));

      console.log(`[ProductDetection] Detected ${items.length} items`);

      return {
        items,
        totalItems: items.length,
        analysisTimestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[ProductDetection] Error:', error.message);
      throw new Error(`Product detection failed: ${error.message}`);
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[ext || ''] || 'image/jpeg';
  }
}
