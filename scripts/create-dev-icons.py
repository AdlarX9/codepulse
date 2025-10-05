#!/usr/bin/env python3
"""
Create placeholder icons for development using PIL/Pillow
No external dependencies except Pillow
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is required. Install it with:")
    print("  pip install Pillow")
    sys.exit(1)

def create_icon(size, output_path, text="CP", bg_color="#3B82F6", text_color="white"):
    """Create a simple colored icon with text"""
    # Create image
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a nice font, fall back to default
    try:
        font_size = int(size * 0.4)
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.4))
        except:
            font = ImageFont.load_default()
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center text
    x = (size - text_width) / 2
    y = (size - text_height) / 2 - bbox[1]
    
    # Draw text
    draw.text((x, y), text, fill=text_color, font=font)
    
    # Save
    img.save(output_path, quality=95)
    print(f"✓ Created {output_path}")

def main():
    # Get icon directory
    script_dir = Path(__file__).parent
    icon_dir = script_dir.parent / "apps" / "desktop" / "src-tauri" / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    
    print("Creating placeholder icons...")
    
    # Create base 1024x1024 icon
    base_icon = icon_dir / "FullLogo.png"
    create_icon(1024, base_icon)
    
    # Generate required sizes
    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
    }
    
    for filename, size in sizes.items():
        output_path = icon_dir / filename
        create_icon(size, output_path)
    
    # Create .ico (Windows icon)
    ico_path = icon_dir / "icon.ico"
    img = Image.open(base_icon)
    img.save(ico_path, format='ICO', sizes=[(256, 256)])
    print(f"✓ Created {ico_path}")
    
    # For .icns, we need to use macOS tools or just copy .ico as placeholder
    icns_path = icon_dir / "icon.icns"
    if sys.platform == "darwin":
        print("⚠ For .icns, run: iconutil -c icns icon.iconset")
        print("  Or use the shell script: bash scripts/create-dev-icons.sh")
    
    # Create a placeholder .icns (just copy the ico for now)
    with open(ico_path, 'rb') as f:
        with open(icns_path, 'wb') as out:
            out.write(f.read())
    print(f"✓ Created placeholder {icns_path}")
    
    print("\n✅ Icons created successfully!")
    print(f"📁 Location: {icon_dir}")
    print("\nYou can now run: pnpm dev:desktop")

if __name__ == "__main__":
    main()
