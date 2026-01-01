#!/usr/bin/env python3
"""
Gemini Shopping List Generator
Analyzes before/after room images to generate shopping lists
"""

import argparse
import json
import os
import sys
from google import genai
from PIL import Image


def generate_shopping_list(before_image_path: str, after_image_path: str, output_path: str):
    """
    Generate a shopping list by comparing before and after room images
    """
    try:
        # Read API key from config file (priority over environment variable)
        api_key = None
        config_path = os.path.join(os.path.dirname(__file__), "gemini_config.json")
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
                api_key = config.get("GEMINI_API_KEY")
                print(f"[DEBUG] Loaded API key from config file", file=sys.stderr)
        
        # Fallback to environment variable
        if not api_key:
            api_key = os.environ.get("GEMINI_API_KEY")
            print(f"[DEBUG] Loaded API key from environment", file=sys.stderr)
        
        if not api_key:
            print("❌ GEMINI_API_KEY not found in config file or environment", file=sys.stderr)
            sys.exit(1)

        print(f"🚀 Initializing Gemini client...", file=sys.stderr)
        client = genai.Client(api_key=api_key)

        model = "gemini-2.0-flash-exp"
        print(f"📝 Model: {model}", file=sys.stderr)
        print(f"📷 Before image: {before_image_path}", file=sys.stderr)
        print(f"📷 After image: {after_image_path}", file=sys.stderr)

        # Load images
        if not os.path.exists(before_image_path):
            print(f"❌ Before image not found: {before_image_path}", file=sys.stderr)
            sys.exit(1)
        
        if not os.path.exists(after_image_path):
            print(f"❌ After image not found: {after_image_path}", file=sys.stderr)
            sys.exit(1)

        before_image = Image.open(before_image_path)
        after_image = Image.open(after_image_path)
        
        print(f"✅ Loaded images successfully", file=sys.stderr)

        shopping_prompt = """Compare these two room images (before and after) and create a detailed shopping list for the transformation.

ANALYZE:
- What furniture pieces were added or changed?
- What decor items are new?
- What lighting fixtures are different?
- What colors/materials are used for walls, floors, curtains?
- What accessories and styling elements were added?

GENERATE A STRUCTURED SHOPPING LIST with:
1. **Furniture** (sofas, chairs, tables, storage)
   - Item name
   - Estimated price range
   - Priority (Must-have / Nice-to-have)
   - Alternative budget options

2. **Lighting** (ceiling lights, lamps, fixtures)
   - Item name
   - Estimated price range
   - Priority

3. **Decor & Accessories** (artwork, plants, cushions, rugs)
   - Item name
   - Estimated price range
   - Priority

4. **Materials & Finishes** (paint colors, flooring, curtains)
   - Item name
   - Color/material specifications
   - Estimated price range

5. **Total Estimated Budget**
   - Low budget option
   - Medium budget option
   - High budget option

6. **Shopping Recommendations**
   - Where to shop for each category
   - Tips for finding similar items
   - DIY alternatives

Format the response as a practical, actionable shopping guide. Be specific about colors, styles, and materials. Include realistic price estimates in USD."""

        print(f"⏳ Generating shopping list...", file=sys.stderr)

        response = client.models.generate_content(
            model=model,
            contents=[shopping_prompt, before_image, after_image]
        )

        if response and response.text:
            shopping_list = response.text
            
            # Save to JSON file
            result = {
                "shopping_list": shopping_list,
                "before_image": before_image_path,
                "after_image": after_image_path,
                "generated_at": str(os.path.getmtime(after_image_path))
            }
            
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Shopping list saved to: {output_path}", file=sys.stderr)
            print(f"\n{shopping_list}", file=sys.stderr)
            return shopping_list
        else:
            print("❌ No response received", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}", file=sys.stderr)
        
        # Check if it's a quota/rate limit error
        if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            print("⚠️  Gemini API quota exceeded. This happens because:", file=sys.stderr)
            print("   - Free tier has strict rate limits (2-5 requests/minute)", file=sys.stderr)
            print("   - Solution: Wait 60 seconds between requests or upgrade to paid tier", file=sys.stderr)
        
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate shopping list from before/after images")
    parser.add_argument("--before", type=str, required=True, help="Before image path")
    parser.add_argument("--after", type=str, required=True, help="After image path")
    parser.add_argument("--output", type=str, required=True, help="Output JSON path")

    args = parser.parse_args()

    generate_shopping_list(
        before_image_path=args.before,
        after_image_path=args.after,
        output_path=args.output,
    )
