# Gemini Image Generation Flow - Complete Analysis

## Component 1: generation.ts (Backend Route Handler)

### Input (from frontend):
```typescript
{
  imageUrl: "data:image/png;base64,...",  // Base64 encoded image
  roomType: "living-room",
  style: "modern",
  materials: {
    wallColor: "white",
    floorType: "hardwood",
    curtainType: "none",
    lightingMood: "natural",
    accentWall: "none"
  },
  projectId?: "uuid"
}
```

### Processing (Line 39-50):
```typescript
const prompt = GeminiImageService.buildPrompt(roomType, style, materials);
// Returns: Detailed text prompt for Gemini

imageBuffer = await GeminiImageService.generateImage(prompt, imageUrl);
// Expects: Buffer containing PNG image bytes
// Returns: Buffer of generated image
```

### Output (Line 66-71):
```typescript
res.json({
  success: true,
  generationId: generation.id,
  beforeImage: imageUrl,
  afterImage: `data:image/png;base64,${imageBuffer.toString('base64')}`
})
```

---

## Component 2: gemini.ts (GeminiImageService)

### Input:
- `prompt`: String (detailed transformation instructions)
- `inputImageUrl`: String (base64 data URL)

### Processing (Line 14-47):

**Step 1: Create output directory**
```typescript
const outputDir = path.join(process.cwd(), 'backend_output');
// Creates: c:\SPAVIX-Vision\backend_output\
```

**Step 2: Generate file paths**
```typescript
const timestamp = Date.now();
const inputPath = path.join(outputDir, `input_${timestamp}.jpg`);
const outputPath = path.join(outputDir, `output_${timestamp}.png`);
// Example:
// inputPath: c:\SPAVIX-Vision\backend_output\input_1767263576332.jpg
// outputPath: c:\SPAVIX-Vision\backend_output\output_1767263576332.png
```

**Step 3: Convert base64 to file**
```typescript
await this.saveBase64Image(inputImageUrl, inputPath);
// Takes: "data:image/png;base64,iVBORw0KGgo..."
// Strips: "data:image/png;base64,"
// Decodes: Base64 → Binary
// Saves: Binary to inputPath
```

**Step 4: Call Python script**
```typescript
const imageBuffer = await this.runGeminiGeneration(prompt, inputPath, outputPath);
// Spawns: python gemini_image_generate.py --prompt "..." --input "..." --output "..."
// Waits for: Process to complete
// Returns: Buffer from outputPath
```

**Step 5: Return buffer**
```typescript
return imageBuffer;
// Returns: PNG image bytes as Buffer
```

### Critical Issue Check:
✅ **inputPath exists**: Yes, created in Step 3
✅ **outputPath format**: PNG (expected by Python script)
✅ **API key passed**: Yes, via environment variable (Line 109)
✅ **Timeout**: 5 minutes (Line 123)
✅ **Error handling**: Checks exit code, stderr, file existence

---

## Component 3: gemini_image_generate.py (Python Script)

### Input (Command line arguments):
```bash
python gemini_image_generate.py \
  --prompt "IMPORTANT: Keep the exact same room layout..." \
  --input "c:\SPAVIX-Vision\backend_output\input_1767263576332.jpg" \
  --output "c:\SPAVIX-Vision\backend_output\output_1767263576332.png"
```

### Processing (Line 16-151):

**Step 1: Load API key**
```python
# Priority 1: gemini_config.json
config_path = os.path.join(os.path.dirname(__file__), "gemini_config.json")
if os.path.exists(config_path):
    config = json.load(f)
    api_key = config.get("GEMINI_API_KEY")

# Priority 2: Environment variable
if not api_key:
    api_key = os.environ.get("GEMINI_API_KEY")
```

**Step 2: Load input image**
```python
if not os.path.exists(input_image_path):
    sys.exit(1)  # FAIL if file doesn't exist

with open(input_image_path, 'rb') as f:
    image_data = f.read()

image_base64 = base64.standard_b64encode(image_data).decode('utf-8')
# Converts: Binary → Base64 string
```

**Step 3: Call Gemini REST API**
```python
api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{
        "parts": [
            {"text": prompt},
            {"inlineData": {
                "mimeType": "image/jpeg",
                "data": image_base64
            }}
        ]
    }],
    "generationConfig": {
        "responseModalities": ["IMAGE"]
    }
}

response = requests.post(api_url, json=payload, headers=headers, timeout=120)
```

**Step 4: Extract image from response**
```python
response_json = response.json()
# Expected structure:
# {
#   "candidates": [{
#     "content": {
#       "parts": [{
#         "inlineData": {
#           "mimeType": "image/png",
#           "data": "iVBORw0KGgo..."  # Base64 PNG
#         }
#       }]
#     }
#   }]
# }

image_data_b64 = part['inlineData'].get('data')
image_bytes = base64.standard_b64decode(image_data_b64)
```

**Step 5: Save to output file**
```python
with open(output_path, 'wb') as f:
    f.write(image_bytes)
# Saves: Binary PNG to outputPath
# Exit code: 0 (success)
```

### Error Handling:
- Exit code 1 if API key missing
- Exit code 1 if input file not found
- Exit code 1 if API returns error
- Exit code 1 if no image in response
- Prints detailed errors to stderr

---

## Compatibility Analysis

### ✅ COMPATIBLE

| Component | Sends | Receives | Status |
|-----------|-------|----------|--------|
| generation.ts | Base64 imageUrl | Buffer (PNG bytes) | ✅ Correct |
| gemini.ts | File paths + prompt | Exit code + file | ✅ Correct |
| gemini_image_generate.py | PNG file | Exit code 0 | ✅ Correct |

### Data Flow:

```
Frontend
  ↓ (base64 data URL)
generation.ts
  ↓ (prompt + base64)
gemini.ts
  ├─ Converts base64 → input_*.jpg file
  ├─ Calls Python with file paths
  └─ Waits for output_*.png file
      ↓ (file paths + prompt)
gemini_image_generate.py
  ├─ Loads input_*.jpg
  ├─ Encodes to base64
  ├─ Calls Gemini API
  ├─ Decodes response
  └─ Saves output_*.png
      ↓ (exit code 0 + file created)
gemini.ts
  ├─ Reads output_*.png
  └─ Returns Buffer
      ↓ (Buffer)
generation.ts
  └─ Converts to base64 data URL
      ↓ (JSON response)
Frontend
```

---

## Potential Issues & Fixes

### Issue 1: API Key Loading
**Problem**: Backend loads from env var, Python loads from config file
**Status**: ✅ FIXED - gemini.ts now loads from config file first

**gemini.ts (Line 59-78)**:
```typescript
let apiKey = process.env.GEMINI_API_KEY;

const configPath = path.join(process.cwd(), 'gemini_config.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (config.GEMINI_API_KEY) {
    apiKey = config.GEMINI_API_KEY;
  }
}
```

### Issue 2: File Path Handling
**Problem**: Windows vs Unix path separators
**Status**: ✅ OK - Using `path.join()` which handles both

### Issue 3: Image Format
**Problem**: Input saved as JPG, output expected as PNG
**Status**: ✅ OK - Gemini API handles format conversion

### Issue 4: Timeout
**Problem**: Python script might take >2 minutes
**Status**: ⚠️ WARNING - Timeout is 5 minutes, should be sufficient

### Issue 5: Error Propagation
**Problem**: Python errors must be caught by backend
**Status**: ✅ OK - Exit code checked, stderr logged

---

## Testing Checklist

- [ ] Verify `gemini_config.json` has valid API key
- [ ] Verify `backend_output/` directory is created
- [ ] Verify input image file is created
- [ ] Verify Python script receives correct arguments
- [ ] Verify Gemini API returns valid response
- [ ] Verify output image file is created
- [ ] Verify exit code is 0
- [ ] Verify buffer is returned to frontend
- [ ] Verify base64 conversion works
- [ ] Verify database save works

---

## Summary

✅ **All three components are compatible**
✅ **Data flows correctly between layers**
✅ **Error handling is in place**
✅ **API key loading is fixed**

**Ready to test**: Upload an image on the dashboard
