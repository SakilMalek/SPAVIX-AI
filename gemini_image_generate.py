#!/usr/bin/env python3
"""
Gemini Image Generation Script - Virtual Interior Designer
Uses Gemini 2.5 Flash for img2img transformation via REST API
"""

import argparse
import os
import sys
import json
import base64
import requests
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()


def generate_image(prompt: str, input_image_path: str, output_path: str):
    """
    Generate an image using Gemini 2.5 Flash (img2img)
    Takes the input room image and transforms it based on the prompt
    """
    try:
        # Load API key from environment variable only (secure method)
        api_key = os.environ.get("GEMINI_API_KEY")
        
        if not api_key:
            print("❌ GEMINI_API_KEY environment variable not set", file=sys.stderr)
            sys.exit(1)
        
        print(f"[DEBUG] Loaded API key from environment: {api_key[:20]}...", file=sys.stderr)

        print(f"🚀 Using Gemini 3 Pro Image with REST API", file=sys.stderr)
        print(f"📝 Prompt: {prompt[:100]}...", file=sys.stderr)

        # Load the input image
        if not os.path.exists(input_image_path):
            print(f"❌ Input image not found: {input_image_path}", file=sys.stderr)
            sys.exit(1)

        # Read and encode image as base64
        with open(input_image_path, 'rb') as f:
            image_data = f.read()
        
        # Validate image data
        if len(image_data) == 0:
            print(f"❌ Input image is empty: {input_image_path}", file=sys.stderr)
            sys.exit(1)
        
        # Gemini API requires images to be at least 10KB for reliable processing
        min_image_size = 10000  # 10KB minimum
        if len(image_data) < min_image_size:
            print(f"❌ Input image is too small ({len(image_data)} bytes). Minimum required: {min_image_size} bytes", file=sys.stderr)
            print(f"   This can happen if the image is corrupted or too compressed.", file=sys.stderr)
            sys.exit(1)
        
        # Check image magic bytes to validate format
        if image_data[:3] == b'\xff\xd8\xff':
            media_type = 'image/jpeg'
        elif image_data[:8] == b'\x89PNG\r\n\x1a\n':
            media_type = 'image/png'
        elif image_data[:6] == b'GIF87a' or image_data[:6] == b'GIF89a':
            media_type = 'image/gif'
        elif image_data[:4] == b'RIFF' and image_data[8:12] == b'WEBP':
            media_type = 'image/webp'
        else:
            # Fallback to file extension
            if input_image_path.lower().endswith('.png'):
                media_type = 'image/png'
            elif input_image_path.lower().endswith('.gif'):
                media_type = 'image/gif'
            elif input_image_path.lower().endswith('.webp'):
                media_type = 'image/webp'
            else:
                media_type = 'image/jpeg'
            print(f"⚠️  Warning: Could not detect image format from magic bytes, using {media_type}", file=sys.stderr)
        
        image_base64 = base64.standard_b64encode(image_data).decode('utf-8')
        
        print(f"✅ Loaded input image: {len(image_data)} bytes, type: {media_type}", file=sys.stderr)
        print(f"📏 Base64 encoded size: {len(image_base64)} bytes", file=sys.stderr)

        # Call Gemini API via REST
        print(f"⏳ Generating transformed image...", file=sys.stderr)
        
        # Use gemini-3-pro-image for image generation
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": prompt
                        },
                        {
                            "inlineData": {
                                "mimeType": media_type,
                                "data": image_base64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "temperature": 0.7,
                "topP": 0.95,
                "topK": 40
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE"
                }
            ]
        }
        
        # Retry logic for API calls
        max_retries = 3
        retry_count = 0
        response = None
        
        while retry_count < max_retries:
            try:
                response = requests.post(api_url, json=payload, headers=headers, timeout=120)
                print(f"📊 API Response Status: {response.status_code}", file=sys.stderr)
                
                if response.status_code == 200:
                    break  # Success, exit retry loop
                elif response.status_code == 429:
                    # Rate limited, retry with backoff
                    retry_count += 1
                    if retry_count < max_retries:
                        wait_time = 2 ** retry_count  # Exponential backoff: 2s, 4s, 8s
                        print(f"⏳ Rate limited (429). Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                        import time
                        time.sleep(wait_time)
                        continue
                    else:
                        error_text = response.text
                        print(f"❌ API Error (Rate Limited): {error_text}", file=sys.stderr)
                        sys.exit(1)
                else:
                    error_text = response.text
                    print(f"❌ API Error ({response.status_code}): {error_text}", file=sys.stderr)
                    sys.exit(1)
            except requests.exceptions.Timeout:
                retry_count += 1
                if retry_count < max_retries:
                    wait_time = 2 ** retry_count
                    print(f"⏳ Request timeout. Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                    import time
                    time.sleep(wait_time)
                    continue
                else:
                    print("❌ Request timeout - API took too long to respond", file=sys.stderr)
                    sys.exit(1)
            except requests.exceptions.RequestException as e:
                retry_count += 1
                if retry_count < max_retries:
                    wait_time = 2 ** retry_count
                    print(f"⏳ Network error: {str(e)}. Retrying in {wait_time}s... (attempt {retry_count}/{max_retries})", file=sys.stderr)
                    import time
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"❌ Network error: {str(e)}", file=sys.stderr)
                    sys.exit(1)
        
        if response is None or response.status_code != 200:
            print("❌ Failed to get valid response from API after retries", file=sys.stderr)
            sys.exit(1)
        
        response_json = response.json()
        
        # Extract image from response
        image_saved = False
        
        # Check for finish reason
        if 'candidates' in response_json and response_json['candidates']:
            for candidate in response_json['candidates']:
                finish_reason = candidate.get('finishReason', 'UNKNOWN')
                print(f"📋 Candidate finish reason: {finish_reason}", file=sys.stderr)
                
                if finish_reason == 'NO_IMAGE':
                    print("⚠️  API returned NO_IMAGE - model may have rejected the request", file=sys.stderr)
                    print("   This can happen due to safety filters or model limitations", file=sys.stderr)
                    print(f"   Full response: {json.dumps(response_json, indent=2)}", file=sys.stderr)
                    sys.exit(1)
                
                if 'content' in candidate and 'parts' in candidate['content']:
                    for part in candidate['content']['parts']:
                        if 'inlineData' in part:
                            image_data_b64 = part['inlineData'].get('data')
                            if image_data_b64:
                                # Decode base64 and save
                                image_bytes = base64.standard_b64decode(image_data_b64)
                                with open(output_path, 'wb') as f:
                                    f.write(image_bytes)
                                
                                print(f"✅ Image saved to: {output_path} ({len(image_bytes)} bytes)", file=sys.stderr)
                                image_saved = True
                                break
                        elif 'text' in part:
                            # Sometimes the API returns text instead of image
                            print(f"⚠️  API returned text instead of image: {part['text'][:100]}", file=sys.stderr)
                    if image_saved:
                        break
                if image_saved:
                    break
        
        if not image_saved:
            print("❌ No image data received from Gemini API", file=sys.stderr)
            print(f"   Response: {json.dumps(response_json, indent=2)[:500]}", file=sys.stderr)
            sys.exit(1)

    except requests.exceptions.Timeout:
        print("❌ Request timeout - API took too long to respond", file=sys.stderr)
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}", file=sys.stderr)
        
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
