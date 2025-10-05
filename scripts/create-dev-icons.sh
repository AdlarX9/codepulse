#!/bin/bash

# Create placeholder icons for development
# This uses ImageMagick to create simple colored squares

ICON_DIR="apps/desktop/src-tauri/icons"
mkdir -p "$ICON_DIR"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install imagemagick
    else
        echo "Error: Please install ImageMagick manually:"
        echo "  brew install imagemagick"
        echo "  or visit: https://imagemagick.org/script/download.php"
        exit 1
    fi
fi

echo "Creating placeholder icons..."

# Create base 1024x1024 icon
convert -size 1024x1024 xc:"#3B82F6" \
    -gravity center \
    -pointsize 400 \
    -fill white \
    -annotate +0+0 "CP" \
    "$ICON_DIR/icon-1024.png"

# Generate required sizes
convert "$ICON_DIR/icon-1024.png" -resize 32x32 "$ICON_DIR/32x32.png"
convert "$ICON_DIR/icon-1024.png" -resize 128x128 "$ICON_DIR/128x128.png"
convert "$ICON_DIR/icon-1024.png" -resize 256x256 "$ICON_DIR/128x128@2x.png"
convert "$ICON_DIR/icon-1024.png" -resize 256x256 "$ICON_DIR/icon.ico"

# For macOS .icns (requires iconutil on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    ICONSET_DIR="$ICON_DIR/icon.iconset"
    mkdir -p "$ICONSET_DIR"
    
    convert "$ICON_DIR/icon-1024.png" -resize 16x16 "$ICONSET_DIR/icon_16x16.png"
    convert "$ICON_DIR/icon-1024.png" -resize 32x32 "$ICONSET_DIR/icon_16x16@2x.png"
    convert "$ICON_DIR/icon-1024.png" -resize 32x32 "$ICONSET_DIR/icon_32x32.png"
    convert "$ICON_DIR/icon-1024.png" -resize 64x64 "$ICONSET_DIR/icon_32x32@2x.png"
    convert "$ICON_DIR/icon-1024.png" -resize 128x128 "$ICONSET_DIR/icon_128x128.png"
    convert "$ICON_DIR/icon-1024.png" -resize 256x256 "$ICONSET_DIR/icon_128x128@2x.png"
    convert "$ICON_DIR/icon-1024.png" -resize 256x256 "$ICONSET_DIR/icon_256x256.png"
    convert "$ICON_DIR/icon-1024.png" -resize 512x512 "$ICONSET_DIR/icon_256x256@2x.png"
    convert "$ICON_DIR/icon-1024.png" -resize 512x512 "$ICONSET_DIR/icon_512x512.png"
    convert "$ICON_DIR/icon-1024.png" -resize 1024x1024 "$ICONSET_DIR/icon_512x512@2x.png"
    
    iconutil -c icns "$ICONSET_DIR" -o "$ICON_DIR/icon.icns"
    rm -rf "$ICONSET_DIR"
    
    echo "✓ Created macOS .icns file"
else
    echo "⚠ Skipping .icns creation (macOS only)"
    # Create a dummy .icns for non-macOS systems
    cp "$ICON_DIR/icon.ico" "$ICON_DIR/icon.icns"
fi

echo "✓ Icons created successfully in $ICON_DIR"
echo ""
echo "Generated files:"
ls -lh "$ICON_DIR"
