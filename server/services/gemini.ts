import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Get the correct path to the Python script
// In production, the script is at the root directory
const GEMINI_SCRIPT_PATH = path.join(process.cwd(), 'gemini_image_generate.py');

function findPythonCommand(): string {
  const candidates = process.platform === 'win32' 
    ? ['python', 'python3', 'py']
    : ['python3', 'python'];
  
  for (const cmd of candidates) {
    try {
      const result = spawnSync(cmd, ['--version'], { 
        timeout: 5000,
        stdio: 'pipe'
      });
      if (result.status === 0) {
        console.log(`[Gemini] Found Python: ${cmd}`);
        return cmd;
      }
    } catch (error) {
      // Continue to next candidate
    }
  }
  
  // Default fallback
  console.warn('[Gemini] Could not detect Python, using default: python');
  return process.platform === 'win32' ? 'python' : 'python3';
}


export class GeminiImageService {
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  static async generateImage(prompt: string, inputImageUrl: string): Promise<Buffer> {
    return this.generateImageWithRetry(prompt, inputImageUrl, 0);
  }

  private static async generateImageWithRetry(
    prompt: string,
    inputImageUrl: string,
    retryCount: number
  ): Promise<Buffer> {
    try {
      console.log('Using Gemini 2.5 Flash Image (img2img)');
      console.log('Prompt:', prompt);

      // Create backend_output directory if it doesn't exist
      const outputDir = path.join(process.cwd(), 'backend_output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Detect image format from data URL
      let imageExtension = 'jpg';
      if (inputImageUrl.includes('data:image/png')) {
        imageExtension = 'png';
      } else if (inputImageUrl.includes('data:image/gif')) {
        imageExtension = 'gif';
      } else if (inputImageUrl.includes('data:image/webp')) {
        imageExtension = 'webp';
      } else if (inputImageUrl.includes('data:image/jpeg')) {
        imageExtension = 'jpg';
      }

      console.log(`📸 Detected image format: ${imageExtension}`);

      // Generate unique filenames with correct extension
      const timestamp = Date.now();
      const inputPath = path.join(outputDir, `input_${timestamp}.${imageExtension}`);
      const outputPath = path.join(outputDir, `output_${timestamp}.png`);

      // Convert base64 input image to file
      await this.saveBase64Image(inputImageUrl, inputPath);

      // Small delay to ensure file is fully written before Python script reads it
      await new Promise(resolve => setTimeout(resolve, 100));

      // Run the Python script with input image
      const imageBuffer = await this.runGeminiGeneration(prompt, inputPath, outputPath);

      // Keep the files for inspection (don't delete)
      console.log(`✅ Input image saved: ${inputPath}`);
      console.log(`✅ Output image saved: ${outputPath}`);
      console.log('Image generated successfully, size:', imageBuffer.length);
      
      return imageBuffer;
    } catch (error: any) {
      const errorMessage = error.message || JSON.stringify(error);
      const isRetryableError = error.status === 429 || error.status === 503 || error.code === 'ECONNRESET';
      
      if (isRetryableError && retryCount < this.MAX_RETRIES) {
        const delayMs = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(`⚠️ Retryable error (${error.status || error.code}), retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.generateImageWithRetry(prompt, inputImageUrl, retryCount + 1);
      }
      
      console.error('❌ Gemini generation error:', errorMessage);
      throw error;
    }
  }

  private static async saveBase64Image(base64Url: string, outputPath: string): Promise<void> {
    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Validate image size - Gemini API requires minimum 10KB
    const minImageSize = 10000; // 10KB
    if (imageBuffer.length < minImageSize) {
      console.error(`❌ Image too small: ${imageBuffer.length} bytes (minimum: ${minImageSize} bytes)`);
      throw new Error(`Image is too small (${imageBuffer.length} bytes). Minimum required: ${minImageSize} bytes. This usually means the image is corrupted or over-compressed. Try uploading a higher quality image.`);
    }
    
    await fs.promises.writeFile(outputPath, imageBuffer);
    console.log(`✅ Saved input image to: ${outputPath} (${imageBuffer.length} bytes)`);
  }

  private static async runGeminiGeneration(prompt: string, inputPath: string, outputPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Cleanup function to remove temporary files
      const cleanup = (error?: Error) => {
        const filesToClean = [inputPath, outputPath];
        for (const filePath of filesToClean) {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[Gemini] Cleaned up: ${filePath}`);
            }
          } catch (err) {
            console.warn(`[Gemini] Failed to cleanup ${filePath}:`, err);
          }
        }
      };

      // Try to load API key from config file first, then fall back to environment
      let apiKey = process.env.GEMINI_API_KEY;
      
      const configPath = path.join(process.cwd(), 'gemini_config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (config.GEMINI_API_KEY) {
            apiKey = config.GEMINI_API_KEY;
            console.log('[Gemini] Loaded API key from gemini_config.json');
          }
        } catch (error) {
          console.warn('[Gemini] Failed to read config file, using environment variable');
        }
      }
      
      if (!apiKey) {
        cleanup();
        reject(new Error('GEMINI_API_KEY not found in gemini_config.json or environment variables'));
        return;
      }
      
      console.log(`[Gemini] Starting image generation process`);
      console.log(`[Gemini] Input path: ${inputPath}`);
      console.log(`[Gemini] Output path: ${outputPath}`);
      console.log(`[Gemini] Script path: ${GEMINI_SCRIPT_PATH}`);
      console.log(`[Gemini] Script exists: ${fs.existsSync(GEMINI_SCRIPT_PATH)}`);
      
      let scriptPath = GEMINI_SCRIPT_PATH;
      if (!fs.existsSync(scriptPath)) {
        const alternativePath = path.join(process.cwd(), 'gemini_image_generate.py');
        if (fs.existsSync(alternativePath)) {
          console.log(`[Gemini] Using alternative script path: ${alternativePath}`);
          scriptPath = alternativePath;
        } else {
          cleanup();
          reject(new Error(`Python script not found at ${scriptPath} or ${alternativePath}`));
          return;
        }
      }
      
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      const pythonProcess = spawn(pythonCommand, [
        scriptPath,
        '--prompt',
        prompt,
        '--input',
        inputPath,
        '--output',
        outputPath,
      ], {
        env: {
          ...process.env,
          GEMINI_API_KEY: apiKey,
          PYTHONUNBUFFERED: '1'
        },
        timeout: 120000 // 2 minute timeout
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let resolved = false;

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        console.warn('[Gemini] Process timeout - killing Python process');
        pythonProcess.kill('SIGTERM');
        
        // Force kill if SIGTERM doesn't work
        const killTimer = setTimeout(() => {
          console.warn('[Gemini] SIGTERM failed - force killing with SIGKILL');
          pythonProcess.kill('SIGKILL');
        }, 5000);
        
        cleanup();
        resolved = true;
        reject(new Error('Python process timed out after 5 minutes'));
      }, 300000); // 5 minutes timeout for Gemini API

      pythonProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        stdout += message + '\n';
        console.log('[Gemini stdout]', message);
      });

      pythonProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        stderr += message + '\n';
        console.log('[Gemini stderr]', message);
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutHandle);
        
        if (resolved) {
          return; // Already resolved or rejected
        }

        if (timedOut) {
          return; // Already rejected by timeout handler
        }

        resolved = true;

        if (code !== 0) {
          cleanup();
          reject(new Error(`Python process exited with code ${code}.\nStderr: ${stderr}`));
          return;
        }

        if (!fs.existsSync(outputPath)) {
          cleanup();
          reject(new Error(`Output image file not created at ${outputPath}`));
          return;
        }

        try {
          const imageBuffer = fs.readFileSync(outputPath);
          console.log(`[Gemini] Successfully read output image: ${imageBuffer.length} bytes`);
          // Don't cleanup on success - keep files for inspection
          resolve(imageBuffer);
        } catch (error) {
          cleanup();
          reject(error);
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutHandle);
        
        if (resolved) {
          return;
        }

        resolved = true;
        cleanup();
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  private static async generateDemoImage(): Promise<Buffer> {
    // Return a simple placeholder PNG (1x1 gray pixel)
    // In production, this would be replaced with actual Gemini output
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 size
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00, // Gray pixel data
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, // 
      0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
      0x44, 0xAE, 0x42, 0x60, 0x82 // PNG end
    ]);
    return pngHeader;
  }

  static buildPrompt(
    roomType: string,
    style: string,
    materials: {
      wallColor?: string;
      floorType?: string;
      curtainType?: string;
      lightingMood?: string;
      accentWall?: string;
    }
  ): string {
    const materialDescriptions: string[] = [];

    if (materials.wallColor) {
      materialDescriptions.push(`${materials.wallColor} walls`);
    }
    if (materials.accentWall && materials.accentWall !== 'none') {
      materialDescriptions.push(`${materials.accentWall} accent wall`);
    }
    if (materials.floorType) {
      materialDescriptions.push(`${materials.floorType} flooring`);
    }
    if (materials.curtainType && materials.curtainType !== 'none') {
      materialDescriptions.push(`${materials.curtainType} curtains`);
    }

    const lightingDesc = materials.lightingMood
      ? `${materials.lightingMood} lighting` 
      : 'natural lighting';

    const materialSection = materialDescriptions.length > 0 
      ? materialDescriptions.join(', ') 
      : 'modern finishes';

    return `SYSTEM/ROLE: You are an expert photorealistic room restyler. Your job is ONLY to change finishes, colors, textures, and lighting — NOTHING else. Treat these rules as absolute, highest-priority constraints.

REFERENCE: Use the provided input image as the only visual source. Preserve the camera position, focal length, perspective, image framing, and scale.

HARD CONSTRAINTS — DO NOT VIOLATE:
- Do not move, add, remove, or resize any objects (furniture, rugs, plants, appliances, boxes, tools, etc.).
- Do not move or change doors, windows, window slats, frame shapes, or wall locations. Do not change ceiling height, wall placement, or architectural elements.
- Do not change camera angle, perspective, horizon, vanishing points, or crop/zoom.
- Do not add new walls, openings, windows, or structural elements. No new rooms or doorways.
- Do not insert people, pets, or text/logos.
- Maintain original hard contact shadows and occlusions; if lighting changes, update shadows conservatively and consistently — do not invent new geometry shadows that imply moved objects.

ALLOWED CHANGES — STRICTLY LIMITED:
- Repaint walls (color, texture, finishes).
- REPAIR DAMAGED AREAS: Fix any visible damage in the room including holes in walls, broken wall sections, cracks, water damage, peeling paint, stains, or deteriorated surfaces. Repair these areas to look clean, intact, and professionally finished while maintaining the room's architectural integrity.
- Replace floor finish (tile, wood, carpet) visually only — keep exact floor geometry and seams.
- Change window treatments (curtains/blinds) appearance, but keep them in the same location and shape.
- Adjust furniture surface colors and upholstery texture only (no reshaping, no adding/removing legs/frames).
- Adjust lighting mood (warmer/colder, brightness), but preserve apparent light source directions unless user explicitly requests new fixtures.
- Add decorative elements that enhance the room: potted plants, decorative lights (string lights, wall sconces, table lamps), wall art (paintings, prints, photographs), sculptures, mirrors, throw pillows, rugs, and other small decor items. These must be placed naturally on existing surfaces (shelves, tables, walls, corners) without moving or obscuring existing furniture. Any added decor must not overlap or obstruct existing objects and must be appropriate to the ${style} style.

MASK / INPAINTING INSTRUCTIONS:
- If an edit mask is provided, restrict edits strictly to masked regions (walls, floor, curtains, upholstery). Outside the mask: zero changes.
- If no mask: only edit pixels that belong to continuous planar surfaces (walls, floors, curtains, cushions). Avoid changing textured clutter or small objects.

OUTPUT DETAILS:
- Photorealistic image, same resolution and aspect ratio as input.
- Keep camera framing identical; no cropping, no added peripheral space.
- Maintain original perspective, scale, and furniture placement.

STYLE GUIDELINES:
- Redesign in a ${style} style while strictly following allowed changes.
- Use natural, plausible materials and realistic reflections appropriate to the lighting.
- Colors: ${materials.wallColor || 'neutral tones'}, Accent wall: ${materials.accentWall || 'none'}, Floor: ${materials.floorType || 'same geometry, new finish'}, Curtains: ${materials.curtainType || 'no change unless specified'}, Lighting: ${lightingDesc}.

DECORATIVE ELEMENTS TO ADD (${style} style):
- Potted plants and greenery: Place indoor plants (monstera, fiddle leaf fig, snake plants, pothos, peace lilies) on shelves, corners, tables, or floor in ways that complement the ${style} aesthetic.
- Wall art and paintings: Add framed artwork, paintings, prints, or photographs on empty wall spaces that match the ${style} style and color scheme.
- Decorative lighting: Include table lamps, floor lamps, wall sconces, string lights, or pendant lights that enhance the ${style} ambiance and complement the ${lightingDesc} mood.
- Decorative accessories: Add throw pillows, decorative rugs, blankets, vases, sculptures, mirrors, candles, books, or other small decor items on tables, shelves, and seating areas.
- Mirrors: Place decorative mirrors on walls to enhance light and create visual interest while maintaining the ${style} aesthetic.
- Textiles: Add throw blankets, cushions, and rugs in colors and patterns that complement the ${style} and the ${materials.wallColor || 'neutral'} walls.
All decorative additions must be placed on existing surfaces without moving furniture, must not obstruct existing objects, and must be photorealistic and appropriate to the ${style} design style.

NEGATIVE PROMPT (things to avoid):
- Do not change room layout, structure, architecture, doors, windows, or perspective.
- Do not move, remove, or add furniture pieces (only change their colors/finishes).
- Do not add walls, archways, or open-plan changes.
- Do not add people, animals, watermarks, captions, or logos.
- Do not create cartoonish, surreal, or stylized geometry changes.
- Decorative items must not overlap or hide existing furniture or architectural elements.
- Do not add decorative elements that are inappropriate for the ${style} style.
- DO NOT leave any visible damage, holes, cracks, or deteriorated areas in the final image. All damage must be repaired and the room must look clean and well-maintained.

STRICT INSTRUCTION: Treat "HARD CONSTRAINTS" as non-negotiable. If a requested style would require structural changes, instead create an equivalent look through colors, finishes, and decor only.

IMPORTANT: Use the input image as the sole reference. PRESERVE the exact room geometry, camera angle, framing, and all object placements. DO NOT move, add, remove, resize, or reshape any furniture, doors, windows, or architectural elements.

Only edit allowed elements: wall paint/texture, floor finish (visual only, keep seams and layout), window treatments, furniture surface colors/finishes, lighting (brightness & color), and small decor that does not require moving objects. Maintain original shadows/occlusions; do not invent new geometry.

OUTPUT: Single photorealistic image; same resolution & aspect ratio; identical perspective; no added structures or objects.`;
  }
}
