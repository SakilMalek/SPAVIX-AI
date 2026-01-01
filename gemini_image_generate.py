#!/usr/bin/env python3
"""
Gemini Image Generation Script - Virtual Interior Designer
Uses google-genai SDK with Gemini 2.5 Flash Image for img2img transformation
Based on Nano Banana Hackathon reference implementation
"""

import argparse
import os
import sys
import time
from google import genai
from google.genai import types


def generate_image(prompt: str, input_image_path: str, output_path: str):
    """
    Generate an image using Gemini 2.5 Flash Image (img2img)
    Takes the input room image and transforms it based on the prompt
    """
    try:
        # Read API key from config file (priority over environment variable)
        api_key = None
        config_path = os.path.join(os.path.dirname(__file__), "gemini_config.json")
        
        if os.path.exists(config_path):
            import json
            with open(config_path, 'r') as f:
                config = json.load(f)
                api_key = config.get("GEMINI_API_KEY")
                print(f"[DEBUG] Loaded API key from config file: {api_key[:20] if api_key else 'NOT FOUND'}...", file=sys.stderr)
        
        # Fallback to environment variable if config file doesn't have it
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")
            print(f"[DEBUG] Loaded API key from environment: {api_key[:20] if api_key else 'NOT FOUND'}...", file=sys.stderr)
        
        if not api_key:
            print("❌ GEMINI_API_KEY not found in config file or environment", file=sys.stderr)
            sys.exit(1)

        print(f"🚀 Initializing Gemini client with API key: {api_key[:20]}...", file=sys.stderr)
        client = genai.Client(api_key=api_key)

        # Use Gemini 2.5 Flash Image Preview (same as Kaggle)
        model = "gemini-2.5-flash-image-preview"
        print(f"📝 Model: {model}", file=sys.stderr)
        print(f"📷 Input image: {input_image_path}", file=sys.stderr)
        print(f"📝 Prompt: {prompt[:100]}...", file=sys.stderr)

        # Load the "Before" image for img2img transformation
        if not os.path.exists(input_image_path):
            print(f"❌ Input image not found: {input_image_path}", file=sys.stderr)
            sys.exit(1)

        # Load as PIL Image (Kaggle approach)
        from PIL import Image
        input_image = Image.open(input_image_path)
        
        print(f"✅ Loaded input image: {input_image.size}", file=sys.stderr)

        # Generate content with IMAGE response modality (img2img)
        # Use Kaggle's simpler approach: pass PIL Image directly
        print(f"⏳ Generating transformed image...", file=sys.stderr)
        
        response = client.models.generate_content(
            model=model,
            contents=[
                prompt,
                input_image  # Pass PIL Image directly (Kaggle style)
            ],
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE']
            )
        )

        # Extract images from response (hackathon approach)
        image_saved = False
        
        if response and hasattr(response, 'candidates'):
            for candidate in response.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'inline_data') and part.inline_data:
                                if hasattr(part.inline_data, 'data') and part.inline_data.data:
                                    # Save the image
                                    with open(output_path, "wb") as f:
                                        f.write(part.inline_data.data)
                                    
                                    print(f"✅ Image saved to: {output_path}", file=sys.stderr)
                                    image_saved = True
                                    break
                    if image_saved:
                        break

        if not image_saved:
            print("❌ No image data received from Gemini", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}", file=sys.stderr)
        
        # Check if it's a quota/rate limit error
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            print("⚠️  Gemini API quota exceeded. This happens because:", file=sys.stderr)
            print("   - Free tier has strict rate limits (2-5 requests/minute)", file=sys.stderr)
            print("   - Kaggle has enterprise access with higher quotas", file=sys.stderr)
            print("   - Solution: Wait 60 seconds between requests or upgrade to paid tier", file=sys.stderr)
        
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate images with Gemini (img2img)")
    parser.add_argument("--prompt", type=str, required=True, help="Image generation prompt")
    parser.add_argument("--input", type=str, required=True, help="Input image path (before)")
    parser.add_argument("--output", type=str, required=True, help="Output image path (after)")

    args = parser.parse_args()

    generate_image(
        prompt=args.prompt,
        input_image_path=args.input,
        output_path=args.output,
    )
