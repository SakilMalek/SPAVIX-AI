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

  /**
   * Detect room type from image using Gemini Vision
   * This is Stage 1 of the 2-stage pipeline
   */
  static async detectRoomType(inputImageUrl: string): Promise<string> {
    try {
      console.log('🔍 Stage 1: Detecting room type with Gemini Vision...');
      
      // Create temporary directory for room detection
      const outputDir = path.join(process.cwd(), 'backend_output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Detect image format
      let imageExtension = 'jpg';
      if (inputImageUrl.includes('data:image/png')) {
        imageExtension = 'png';
      } else if (inputImageUrl.includes('data:image/jpeg')) {
        imageExtension = 'jpg';
      } else if (inputImageUrl.includes('data:image/webp')) {
        imageExtension = 'webp';
      }

      // Save image temporarily for room detection
      const timestamp = Date.now();
      const inputPath = path.join(outputDir, `detect_${timestamp}.${imageExtension}`);
      await this.saveBase64Image(inputImageUrl, inputPath);

      // Room detection prompt - simple and direct
      const detectionPrompt = `Look at this image carefully.
Classify the room type.

Choose exactly ONE:
Bathroom
Kitchen
Bedroom
Living Room
Dining Room
Office
Garage
Laundry Room
Hallway
Other

Return only the room type word(s). No explanation.`;

      // Run Python script for room detection (text-only output)
      const roomType = await this.runRoomDetection(detectionPrompt, inputPath);

      // Cleanup detection image
      try {
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      } catch (err) {
        console.warn('Failed to cleanup detection image:', err);
      }

      console.log(`✅ Room detected: ${roomType}`);
      return roomType.trim();
    } catch (error: any) {
      console.error('❌ Room detection failed:', error.message);
      // Fallback to "Other" if detection fails
      return 'Other';
    }
  }

  static async generateImage(prompt: string, inputImageUrl: string): Promise<Buffer> {
    return this.generateImageWithRetry(prompt, inputImageUrl, 0);
  }

  private static async generateImageWithRetry(
    prompt: string,
    inputImageUrl: string,
    retryCount: number
  ): Promise<Buffer> {
    try {
      console.log('Using Gemini 3 Pro Image (img2img)');
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

  /**
   * Run room detection using Gemini Vision (text-only response)
   */
  private static async runRoomDetection(prompt: string, inputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Try to load API key from config file first, then fall back to environment
      let apiKey = process.env.GEMINI_API_KEY;
      
      const configPath = path.join(process.cwd(), 'gemini_config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (config.GEMINI_API_KEY) {
            apiKey = config.GEMINI_API_KEY;
          }
        } catch (error) {
          console.warn('[Gemini] Failed to read config file for room detection');
        }
      }
      
      if (!apiKey) {
        reject(new Error('GEMINI_API_KEY not found'));
        return;
      }

      const pythonCommand = findPythonCommand();
      const scriptPath = path.join(process.cwd(), 'gemini_room_detect.py');
      
      // Create a simple detection script if it doesn't exist
      if (!fs.existsSync(scriptPath)) {
        const detectionScript = `import os
import sys
import json
import base64
import requests
from pathlib import Path

def detect_room(prompt, input_image_path):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    
    # Read and encode image
    with open(input_image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')
    
    # Detect MIME type
    ext = Path(input_image_path).suffix.lower()
    mime_type = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    }.get(ext, 'image/jpeg')
    
    # Call Gemini Vision API for text response
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={api_key}"
    
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": image_data
                    }
                }
            ]
        }]
    }
    
    response = requests.post(url, json=payload, timeout=30)
    
    if response.status_code != 200:
        print(f"ERROR: API returned {response.status_code}", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)
    
    result = response.json()
    room_type = result['candidates'][0]['content']['parts'][0]['text'].strip()
    print(room_type)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--prompt', required=True)
    parser.add_argument('--input', required=True)
    args = parser.parse_args()
    
    detect_room(args.prompt, args.input)
`;
        fs.writeFileSync(scriptPath, detectionScript);
        console.log('[Gemini] Created room detection script');
      }

      const pythonProcess = spawn(pythonCommand, [
        scriptPath,
        '--prompt',
        prompt,
        '--input',
        inputPath,
      ], {
        env: {
          ...process.env,
          GEMINI_API_KEY: apiKey,
          PYTHONUNBUFFERED: '1'
        },
        timeout: 30000 // 30 second timeout for detection
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[Room Detection]', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          const roomType = stdout.trim();
          resolve(roomType);
        } else {
          reject(new Error(`Room detection failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
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
    detectedRoomType: string,
    style: string,
    materials: {
      wallColor?: string;
      floorType?: string;
      curtainType?: string;
      lightingMood?: string;
      accentWall?: string;
    },
    finishQuality: string = 'standard'
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

    // Get finish quality modifier based on plan
    let finishQualityModifier = '';
    switch (finishQuality) {
      case 'photorealistic':
        finishQualityModifier = 'Render photorealistic, catalog-grade quality materials with perfect reflections, micro-details, grain patterns, and professional lighting. Match real estate photography standards with pristine material presentation.';
        break;
      case 'ultra-realistic':
        finishQualityModifier = 'Apply ultra-realistic material finishes with detailed textures, visible grain patterns, and realistic reflections. Enhance material authenticity and visual depth.';
        break;
      case 'standard':
      default:
        finishQualityModifier = 'Use standard material finishes with basic texture detail. Focus on clean surfaces without excessive detail or reflections.';
        break;
    }

    return `DETECTED ROOM TYPE: ${detectedRoomType}
This room is confirmed to be a ${detectedRoomType}.
${detectedRoomType} rules must be followed. No exceptions.

FIRST — ROOM AWARENESS (MANDATORY):
Analyze the input image and identify the room type.
Choose exactly ONE:
Bathroom / Toilet
Kitchen
Bedroom
Living Room
Dining Room
Office
Hallway
Garage / Workshop
Laundry Room
Other

This classification strictly controls what decor and objects are allowed.
You must obey these rules even if the requested style normally uses forbidden items.

ROOM RULES:

If Bathroom / Toilet:
- Allowed: tiles, wall finishes, paint, vanity, sink, toilet, shower, mirror, towel racks, soap holders, bathroom lighting, small moisture-safe plants
- Forbidden: curtains, sofas, rugs, floor lamps, table lamps, bookshelves, coffee tables, large plants, paintings, throw pillows, living room or bedroom furniture

If Kitchen:
- Allowed: cabinets, backsplash, countertops, appliances, bar stools, small plants, kitchen lighting
- Forbidden: beds, sofas, bedroom lamps, bathroom fixtures

If Bedroom:
- Allowed: bed, side tables, lamps, artwork, curtains, rugs, plants
- Forbidden: kitchen or bathroom fixtures

If Living Room:
- Allowed: sofas, coffee tables, rugs, lamps, plants, wall art, curtains
- Forbidden: toilets, sinks, showers, kitchen cabinets

If Dining Room:
- Allowed: dining table, chairs, pendant lights, wall art, plants
- Forbidden: beds, sofas, bathroom fixtures

If Office:
- Allowed: desk, chair, shelves, task lighting, plants, artwork
- Forbidden: beds, sofas, kitchen or bathroom fixtures

If Garage / Workshop:
- Allowed: storage shelves, workbenches, tool racks, garage lighting, epoxy floor coatings
- Forbidden: beds, sofas, bathroom fixtures, kitchen appliances

If Laundry Room:
- Allowed: washer, dryer, utility sink, storage cabinets, folding table
- Forbidden: beds, sofas, bathroom fixtures (except utility sink)

Decor items must NEVER violate the room type.
Style must be applied within the logic of the detected room.
Example: Traditional Bathroom ≠ Traditional Living Room.


SYSTEM / ROLE:
You are an expert photorealistic room restyler. Your job is ONLY to change finishes, colors, textures, and lighting — NOTHING else. Treat these rules as absolute, highest-priority constraints.

REFERENCE:
Use the provided input image as the only visual source. Preserve the camera position, focal length, perspective, image framing, and scale.

HARD CONSTRAINTS — DO NOT VIOLATE:
- Do not move, add, remove, or resize any objects (furniture, rugs, plants, appliances, boxes, tools, etc.).
- Do not move or change doors, windows, window slats, frame shapes, or wall locations.
- Do not change ceiling height, wall placement, or architectural elements.
- Do not change camera angle, perspective, horizon, vanishing points, or crop/zoom.
- Do not add new walls, openings, windows, or structural elements.
- Do not insert people, pets, or text/logos.
- Maintain original hard contact shadows and occlusions. If lighting changes, update shadows conservatively and consistently.

CRITICAL: "Changing colors/finishes" ≠ "moving objects"
- A red chair can become blue, but must stay in the exact same position
- A wooden floor can become tile, but must keep the same seam pattern
- Curtains can change fabric, but must maintain the same folds and position

ALLOWED CHANGES — STRICTLY LIMITED:
- Repaint walls (color, texture, finishes).
- REPAIR DAMAGED AREAS: Fix holes, cracks, stains, water damage, peeling paint, broken wall sections — make surfaces clean and professionally finished.
- Replace floor finish visually only (keep exact geometry and seams).
- Change window treatments (curtains/blinds) appearance only.
- Change furniture surface colors and upholstery textures only (no reshaping).
- Adjust lighting mood (brightness and warmth only).
- Add decor ONLY if allowed by the detected room type.

LIGHTING RULES:
- If changing lighting mood, update ALL shadows and reflections consistently
- Maintain the original light source positions (windows, ceiling lights)
- Do not add new light sources or change window positions
- Keep shadow directions consistent with original light sources
- Update shadows conservatively — do not invent new geometry

MASK / INPAINTING RULES:
- If a mask is provided, modify ONLY the masked regions. Do not touch unmasked areas.
- If no mask: edit walls, floors, and furniture surfaces only. Preserve all small objects, clutter, and personal items exactly as they are.
- Never modify areas outside the mask boundary, even slightly.

OUTPUT:
- Ultra-high resolution 4K photorealistic image
- Extremely sharp details, no blur, no noise, no artifacts
- Same resolution and aspect ratio as input
- Same framing and perspective
- No cropping or zooming
- Professional interior photography quality
- Realistic lighting, textures, shadows, and reflections

MATERIAL FINISH QUALITY:
${finishQualityModifier}

STYLE APPLICATION:
Apply a ${style} design style appropriate to the detected room type.

MATERIAL TARGETS:
- Walls: ${materials.wallColor || 'neutral tones'}
- Accent wall: ${materials.accentWall || 'none'}
- Floor: ${materials.floorType || 'same layout, new finish'}
- Curtains: ${materials.curtainType || 'no change'}
- Lighting: ${lightingDesc}

DECOR ADDITIONS (Only if allowed by room type):
If decor is allowed, add small photorealistic decorative elements that fit the ${style} aesthetic:
- Plants (appropriate to room type)
- Wall art (appropriate to room type)
- Decorative lighting (appropriate to room type)
- Mirrors (appropriate to room type)
- Pillows or throws (if seating exists and room type allows)
All decor must sit on existing surfaces and must not overlap, hide, or block existing objects.

NEGATIVE PROMPT:
- No layout changes
- No structural changes
- No furniture movement
- No added rooms, walls, or windows
- No people, animals, text, logos, or watermarks
- No living-room decor inside bathrooms
- No bedroom decor inside kitchens
- No bathroom fixtures inside living rooms
- No damaged or unfinished surfaces
- No blurry, low-resolution, cartoonish, CGI, or fake-looking output

FINAL INSTRUCTION:
The detected room type overrides all style expectations.
The final image must look like a professionally designed ${style} version of THAT room — not a different room type.

Only allowed edits:
Paint, finishes, textures, lighting, small decor (room-safe only).

Render as a high-end 4K interior design photograph with realistic materials, lighting and shadows.

Return one single ultra-realistic photorealistic image.`;
  }
}
