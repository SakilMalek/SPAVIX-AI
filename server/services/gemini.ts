import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Get the correct path to the Python script
// In production, the script is at the root directory
const GEMINI_SCRIPT_PATH = path.join(process.cwd(), 'gemini_image_generate.py');

export class GeminiImageService {
  static async generateImage(prompt: string, inputImageUrl: string): Promise<Buffer> {
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
      console.error('❌ Gemini generation error:', errorMessage);
      throw error; // Propagate the error instead of silently failing
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
    
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`✅ Saved input image to: ${outputPath} (${imageBuffer.length} bytes)`);
  }

  private static async runGeminiGeneration(prompt: string, inputPath: string, outputPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
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
          reject(new Error(`Python script not found at ${scriptPath} or ${alternativePath}`));
          return;
        }
      }
      
      const pythonProcess = spawn('python3', [
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

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        pythonProcess.kill();
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
        
        if (timedOut) {
          return; // Already rejected
        }

        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}.\nStderr: ${stderr}`));
          return;
        }

        if (!fs.existsSync(outputPath)) {
          reject(new Error(`Output image file not created at ${outputPath}`));
          return;
        }

        try {
          const imageBuffer = fs.readFileSync(outputPath);
          console.log(`[Gemini] Successfully read output image: ${imageBuffer.length} bytes`);
          resolve(imageBuffer);
        } catch (error) {
          reject(error);
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutHandle);
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

    return `IMPORTANT: Keep the exact same room layout, structure, and furniture placement. Only update the colors, materials, and lighting.

Redesign this ${roomType} in ${style} style with these changes:

PRESERVE:
- Keep the exact same room layout and dimensions
- Keep all existing furniture in the same positions
- Keep doors, windows, and walls in the same locations
- Maintain the overall spatial arrangement

CHANGE ONLY:
- Wall colors: ${materials.wallColor || 'neutral tones'}
${materials.accentWall && materials.accentWall !== 'none' ? `- Add ${materials.accentWall} accent wall` : ''}
- Floor material: ${materials.floorType || 'hardwood'} flooring
${materials.curtainType && materials.curtainType !== 'none' ? `- Window treatments: ${materials.curtainType} curtains` : ''}
- Lighting: ${lightingDesc}
- Update furniture colors and finishes to match ${style} aesthetic
- Add decorative elements (plants, artwork) that fit the style

STYLE GUIDELINES:
- Apply ${style} design principles to existing furniture
- Maintain the same furniture count and positions
- Update colors and textures only
- Keep the room functional and recognizable

OUTPUT: Photorealistic image showing the same ${roomType} with updated colors, materials, and lighting. The layout and furniture placement must remain identical. 8K resolution.`;
  }
}
