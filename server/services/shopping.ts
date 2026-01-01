import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHOPPING_LIST_SCRIPT_PATH = path.join(__dirname, '..', '..', 'gemini_shopping_list.py');

export class ShoppingListService {
  static async generateShoppingList(beforeImageUrl: string, afterImageUrl: string): Promise<string> {
    try {
      console.log('Generating shopping list from before/after images');

      const timestamp = Date.now();
      const beforePath = path.join(process.cwd(), `before_${timestamp}.png`);
      const afterPath = path.join(process.cwd(), `after_${timestamp}.png`);
      const outputPath = path.join(process.cwd(), `shopping_list_${timestamp}.json`);

      this.saveBase64Image(beforeImageUrl, beforePath);
      this.saveBase64Image(afterImageUrl, afterPath);

      const shoppingList = await this.runShoppingListGeneration(beforePath, afterPath, outputPath);

      if (fs.existsSync(beforePath)) fs.unlinkSync(beforePath);
      if (fs.existsSync(afterPath)) fs.unlinkSync(afterPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      console.log('Shopping list generated successfully');
      return shoppingList;
    } catch (error: any) {
      const errorMessage = error.message || JSON.stringify(error);
      console.error('Shopping list generation error:', errorMessage);
      throw new Error(`Failed to generate shopping list: ${errorMessage}`);
    }
  }

  private static saveBase64Image(base64Data: string, outputPath: string): void {
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(outputPath, imageBuffer);
  }

  private static async runShoppingListGeneration(
    beforePath: string,
    afterPath: string,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        SHOPPING_LIST_SCRIPT_PATH,
        '--before',
        beforePath,
        '--after',
        afterPath,
        '--output',
        outputPath,
      ], {
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log('[ShoppingList]', data.toString().trim());
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.log('[ShoppingList]', data.toString().trim());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        if (!fs.existsSync(outputPath)) {
          reject(new Error('Shopping list file not created'));
          return;
        }

        try {
          const jsonData = fs.readFileSync(outputPath, 'utf-8');
          const result = JSON.parse(jsonData);
          resolve(result.shopping_list);
        } catch (error) {
          reject(error);
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }
}
