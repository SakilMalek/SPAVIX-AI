import os
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
