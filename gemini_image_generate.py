#!/usr/bin/env python3
"""
Gemini Image Generation Module
Handles AI-powered interior design transformations using Google Gemini API
"""

import anthropic
import base64
import json
import os
import sys
from pathlib import Path

def load_config():
    """Load Gemini configuration from config file"""
    config_path = Path(__file__).parent / "gemini_config.json"
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    with open(config_path, 'r') as f:
        return json.load(f)

def encode_image_to_base64(image_path):
    """Encode image file to base64 string"""
    with open(image_path, 'rb') as image_file:
        return base64.standard_b64encode(image_file.read()).decode('utf-8')

def generate_interior_design(
    image_path,
    style,
    room_type,
    materials=None,
    prompt_override=None
):
    """
    Generate an interior design transformation using Gemini API
    
    Args:
        image_path: Path to the input room image
        style: Design style (e.g., 'modern', 'minimalist', 'bohemian')
        room_type: Type of room (e.g., 'living-room', 'bedroom', 'kitchen')
        materials: Dict of material preferences (wall_color, floor_type, etc.)
        prompt_override: Custom prompt for generation
    
    Returns:
        Dict with generated image and metadata
    """
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    config = load_config()
    
    # Encode image
    image_base64 = encode_image_to_base64(image_path)
    
    # Build materials description
    materials_desc = ""
    if materials:
        materials_list = []
        if materials.get('wallColor'):
            materials_list.append(f"wall color: {materials['wallColor']}")
        if materials.get('floorType'):
            materials_list.append(f"floor type: {materials['floorType']}")
        if materials.get('curtainType'):
            materials_list.append(f"curtain type: {materials['curtainType']}")
        if materials.get('lightingMood'):
            materials_list.append(f"lighting mood: {materials['lightingMood']}")
        if materials.get('accentWall'):
            materials_list.append(f"accent wall: {materials['accentWall']}")
        
        if materials_list:
            materials_desc = "\n\nMaterial preferences:\n" + "\n".join(materials_list)
    
    # Build prompt
    if prompt_override:
        prompt = prompt_override
    else:
        prompt = f"""You are an expert interior designer. Transform this {room_type} image into a {style} style design.

Requirements:
- Maintain the room's structure and layout
- Apply the {style} design aesthetic
- Ensure the transformation is realistic and professional
- Keep the same perspective and lighting conditions
- Make the space look inviting and well-designed{materials_desc}

Generate a high-quality, realistic interior design transformation that matches the specified style and preferences."""
    
    # Call Gemini API with vision
    client = anthropic.Anthropic(api_key=api_key)
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ],
            }
        ],
    )
    
    return {
        "success": True,
        "style": style,
        "room_type": room_type,
        "response": message.content[0].text,
        "usage": {
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens
        }
    }

def main():
    """CLI interface for image generation"""
    if len(sys.argv) < 4:
        print("Usage: python gemini_image_generate.py <image_path> <style> <room_type> [materials_json]")
        print("\nExample:")
        print('  python gemini_image_generate.py room.jpg modern living-room \'{"wallColor": "white", "floorType": "oak"}\'')
        sys.exit(1)
    
    image_path = sys.argv[1]
    style = sys.argv[2]
    room_type = sys.argv[3]
    materials = None
    
    if len(sys.argv) > 4:
        try:
            materials = json.loads(sys.argv[4])
        except json.JSONDecodeError:
            print("Error: Invalid JSON for materials")
            sys.exit(1)
    
    try:
        result = generate_interior_design(image_path, style, room_type, materials)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
