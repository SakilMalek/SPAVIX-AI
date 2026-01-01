#!/usr/bin/env python3
"""
Gemini Shopping List Generator
Generates product recommendations and shopping lists for interior design transformations
"""

import anthropic
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

def generate_shopping_list(
    style,
    room_type,
    budget=None,
    materials=None,
    preferences=None
):
    """
    Generate a shopping list for interior design based on style and preferences
    
    Args:
        style: Design style (e.g., 'modern', 'minimalist', 'bohemian')
        room_type: Type of room (e.g., 'living-room', 'bedroom', 'kitchen')
        budget: Budget in currency (optional)
        materials: Dict of material preferences
        preferences: Additional preferences (optional)
    
    Returns:
        Dict with shopping list items and recommendations
    """
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    config = load_config()
    
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
        
        if materials_list:
            materials_desc = "\n\nMaterial preferences:\n" + "\n".join(materials_list)
    
    # Build budget description
    budget_desc = ""
    if budget:
        budget_desc = f"\n\nBudget: {budget}"
    
    # Build preferences description
    preferences_desc = ""
    if preferences:
        preferences_list = []
        for key, value in preferences.items():
            preferences_list.append(f"{key}: {value}")
        if preferences_list:
            preferences_desc = "\n\nAdditional preferences:\n" + "\n".join(preferences_list)
    
    # Build prompt
    prompt = f"""You are an expert interior designer and shopping assistant. Generate a comprehensive shopping list for transforming a {room_type} into a {style} style space.

Requirements:
- Provide specific product recommendations
- Include furniture, decor, lighting, and accessories
- Suggest products from popular retailers (IKEA, Wayfair, Amazon, local stores)
- Include estimated prices where possible
- Organize items by category
- Provide links or product codes when available{materials_desc}{budget_desc}{preferences_desc}

Format the response as a JSON object with:
{{
  "categories": [
    {{
      "name": "category name",
      "items": [
        {{
          "name": "product name",
          "description": "brief description",
          "estimated_price": "price range",
          "retailer": "store name",
          "link": "product link if available",
          "priority": "high/medium/low"
        }}
      ]
    }}
  ],
  "total_estimated_cost": "total cost range",
  "tips": ["design tip 1", "design tip 2"],
  "alternatives": ["budget alternative 1", "premium alternative 1"]
}}"""
    
    # Call Gemini API
    client = anthropic.Anthropic(api_key=api_key)
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
    )
    
    # Parse response
    response_text = message.content[0].text
    
    # Try to extract JSON from response
    try:
        # Find JSON in response
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        if start_idx != -1 and end_idx > start_idx:
            json_str = response_text[start_idx:end_idx]
            shopping_data = json.loads(json_str)
        else:
            shopping_data = {"raw_response": response_text}
    except json.JSONDecodeError:
        shopping_data = {"raw_response": response_text}
    
    return {
        "success": True,
        "style": style,
        "room_type": room_type,
        "shopping_list": shopping_data,
        "usage": {
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens
        }
    }

def generate_product_recommendations(
    style,
    product_type,
    budget=None,
    color_preference=None
):
    """
    Generate specific product recommendations for a given style and product type
    
    Args:
        style: Design style
        product_type: Type of product (e.g., 'sofa', 'dining table', 'lighting')
        budget: Budget range (optional)
        color_preference: Preferred color (optional)
    
    Returns:
        Dict with product recommendations
    """
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    budget_desc = f" with budget {budget}" if budget else ""
    color_desc = f" in {color_preference} color" if color_preference else ""
    
    prompt = f"""Recommend the best {product_type} options for a {style} interior design{budget_desc}{color_desc}.

Provide recommendations in JSON format:
{{
  "recommendations": [
    {{
      "name": "product name",
      "brand": "brand name",
      "style_fit": "how it fits the style",
      "price_range": "estimated price",
      "description": "brief description",
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1", "con 2"],
      "where_to_buy": "retailer suggestions",
      "rating": "estimated rating out of 5"
    }}
  ],
  "styling_tips": ["tip 1", "tip 2"],
  "color_suggestions": ["color 1", "color 2"]
}}"""
    
    client = anthropic.Anthropic(api_key=api_key)
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
    )
    
    response_text = message.content[0].text
    
    try:
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        if start_idx != -1 and end_idx > start_idx:
            json_str = response_text[start_idx:end_idx]
            recommendations = json.loads(json_str)
        else:
            recommendations = {"raw_response": response_text}
    except json.JSONDecodeError:
        recommendations = {"raw_response": response_text}
    
    return {
        "success": True,
        "style": style,
        "product_type": product_type,
        "recommendations": recommendations,
        "usage": {
            "input_tokens": message.usage.input_tokens,
            "output_tokens": message.usage.output_tokens
        }
    }

def main():
    """CLI interface for shopping list generation"""
    if len(sys.argv) < 3:
        print("Usage: python gemini_shopping_list.py <style> <room_type> [budget] [materials_json]")
        print("\nExample:")
        print('  python gemini_shopping_list.py modern living-room "$5000" \'{"wallColor": "white"}\'')
        sys.exit(1)
    
    style = sys.argv[1]
    room_type = sys.argv[2]
    budget = sys.argv[3] if len(sys.argv) > 3 else None
    materials = None
    
    if len(sys.argv) > 4:
        try:
            materials = json.loads(sys.argv[4])
        except json.JSONDecodeError:
            print("Error: Invalid JSON for materials")
            sys.exit(1)
    
    try:
        result = generate_shopping_list(style, room_type, budget, materials)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
