#!/usr/bin/env bash
set -u
# Create placeholder icons for development
# This uses ImageMagick to create simple colored squares and macOS iconset -> .icns
#
# Fixes made:
# - Ensure ImageMagick is present and abort with clear errors if not.
# - Generate exact-size PNGs for the macOS iconset using -resize + -background none -gravity center -extent
#   to guarantee the correct pixel dimensions required by iconutil.
# - Check iconutil existence and surface useful errors if missing.
# - Add cleanup trap to remove temporary iconset on error.
# - Use cross-platform safe paths and explicit checks for failures.
#
# Usage: ./create-dev-icons.sh
LOGO_NAME="FullLogo_Transparent.png"
ICON_DIR="desktop/src-tauri/icons"
WEB_PUBLIC_DIR="web/public"
DESKTOP_ASSETS_DIR="desktop/src/assets"

mkdir -p "$ICON_DIR"

# Check ImageMagick convert
if ! command -v convert &> /dev/null; then
	echo "ImageMagick 'convert' not found. Attempting to install via Homebrew..."
	if command -v brew &> /dev/null; then
		brew install imagemagick || {
			echo "Homebrew install of ImageMagick failed. Install manually: https://imagemagick.org"
			exit 1
		}
	else
		echo "Error: ImageMagick not found. Please install it manually:"
		echo "  brew install imagemagick"
		echo "  or visit: https://imagemagick.org/script/download.php"
		exit 1
	fi
fi

# Ensure logo exists
if [[ ! -f "logos/$LOGO_NAME" ]]; then
	echo "Error: source logo 'logos/$LOGO_NAME' not found. Place your logo in logos/ and try again."
	exit 1
fi

echo "Copying icons into web and desktop assets..."
# Ensure destination directories exist
mkdir -p "$WEB_PUBLIC_DIR" "$DESKTOP_ASSETS_DIR"
# For web favicon we create a 64x64 png then convert to .ico
cp "logos/$LOGO_NAME" "$WEB_PUBLIC_DIR/logo.png" || true

# Temporary working file
TMP_SRC="$ICON_DIR/1024x1024.png"
# Use convert to produce a squared 1024 PNG (preserve transparency)
convert "logos/$LOGO_NAME" -resize 1024x1024 -background none -gravity center -extent 1024x1024 "$TMP_SRC" || {
	echo "Failed to create base 1024 PNG"
	exit 1
}

# Create favicon.ico (multiple sizes inside)
convert "$TMP_SRC" -resize 64x64 -background none -gravity center -extent 64x64 "$ICON_DIR/favicon-64.png"
# Create .ico from the 64 version (ImageMagick will pack it)
convert "$ICON_DIR/favicon-64.png" -colors 256 "$ICON_DIR/favicon.ico" || {
	echo "Warning: failed to create favicon.ico, continuing..."
}

# Copy a friendly logo for web usage too
cp "$ICON_DIR/1024x1024.png" "$WEB_PUBLIC_DIR/logo.png" || true

# Also copy a simple app icon for renderer assets
cp "$ICON_DIR/1024x1024.png" "$DESKTOP_ASSETS_DIR/icon.png" || true

echo "Creating placeholder icons..."

# Helper to create exact-sized PNGs (force dimensions)
create_png() {
	local src="$1"
	local w="$2"
	local h="$3"
	local out="$4"
	# Use -resize then -extent to force exact output size while preserving aspect/alpha
	convert "$src" -resize "${w}x${h}" -background none -gravity center -extent "${w}x${h}" "$out" || return 1
	return 0
}

# Generate required sizes in ICON_DIR
create_png "$TMP_SRC" 1024 1024 "$ICON_DIR/1024x1024.png"
create_png "$TMP_SRC" 512 512   "$ICON_DIR/512x512.png"
create_png "$TMP_SRC" 256 256   "$ICON_DIR/256x256.png"
create_png "$TMP_SRC" 128 128   "$ICON_DIR/128x128.png"
create_png "$TMP_SRC" 64 64     "$ICON_DIR/64x64.png"
create_png "$TMP_SRC" 32 32     "$ICON_DIR/32x32.png"
create_png "$TMP_SRC" 16 16     "$ICON_DIR/16x16.png"

# Also create @2x variants where appropriate (exact pixel sizes)
create_png "$TMP_SRC" 64 64     "$ICON_DIR/32x32@2x.png"
create_png "$TMP_SRC" 256 256   "$ICON_DIR/128x128@2x.png"
create_png "$TMP_SRC" 512 512   "$ICON_DIR/256x256@2x.png"
create_png "$TMP_SRC" 1024 1024 "$ICON_DIR/512x512@2x.png"

# Create icon.ico with multiple sizes (common for Windows)
convert "$ICON_DIR/256x256.png" "$ICON_DIR/128x128.png" "$ICON_DIR/64x64.png" "$ICON_DIR/32x32.png" "$ICON_DIR/16x16.png" -colors 256 "$ICON_DIR/icon.ico" || {
	echo "Warning: failed to create icon.ico"
}

# For macOS .icns (requires iconutil)
if [[ "$OSTYPE" == "darwin"* ]]; then
	ICONSET_DIR="$ICON_DIR/icon.iconset"
	mkdir -p "$ICONSET_DIR"

	# cleanup function
	cleanup() {
		if [[ -d "$ICONSET_DIR" ]]; then
			rm -rf "$ICONSET_DIR"
		fi
	}
	trap cleanup EXIT

	# Generate iconset PNGs with exact names expected by iconutil
	create_png "$TMP_SRC" 16 16   "$ICONSET_DIR/icon_16x16.png"            || { echo "Failed to create icon_16x16.png"; exit 1; }
	create_png "$TMP_SRC" 32 32   "$ICONSET_DIR/icon_16x16@2x.png"         || { echo "Failed to create icon_16x16@2x.png"; exit 1; }
	create_png "$TMP_SRC" 32 32   "$ICONSET_DIR/icon_32x32.png"            || { echo "Failed to create icon_32x32.png"; exit 1; }
	create_png "$TMP_SRC" 64 64   "$ICONSET_DIR/icon_32x32@2x.png"         || { echo "Failed to create icon_32x32@2x.png"; exit 1; }
	create_png "$TMP_SRC" 128 128 "$ICONSET_DIR/icon_128x128.png"          || { echo "Failed to create icon_128x128.png"; exit 1; }
	create_png "$TMP_SRC" 256 256 "$ICONSET_DIR/icon_128x128@2x.png"       || { echo "Failed to create icon_128x128@2x.png"; exit 1; }
	create_png "$TMP_SRC" 256 256 "$ICONSET_DIR/icon_256x256.png"          || { echo "Failed to create icon_256x256.png"; exit 1; }
	create_png "$TMP_SRC" 512 512 "$ICONSET_DIR/icon_256x256@2x.png"       || { echo "Failed to create icon_256x256@2x.png"; exit 1; }
	create_png "$TMP_SRC" 512 512 "$ICONSET_DIR/icon_512x512.png"          || { echo "Failed to create icon_512x512.png"; exit 1; }
	create_png "$TMP_SRC" 1024 1024 "$ICONSET_DIR/icon_512x512@2x.png"     || { echo "Failed to create icon_512x512@2x.png"; exit 1; }

	# Verify iconutil exists
	if ! command -v iconutil &> /dev/null; then
		echo "Error: 'iconutil' not found. iconutil is required to convert an .iconset into .icns (macOS only)."
		exit 1
	fi

	# Create the .icns
	if iconutil -c icns "$ICONSET_DIR" -o "$ICON_DIR/icon.icns"; then
		echo "✓ Created macOS .icns file at $ICON_DIR/icon.icns"
	else
		echo "Error: iconutil failed to create .icns"
		exit 1
	fi

	# cleanup iconset now that icns is created
	rm -rf "$ICONSET_DIR"
	# remove EXIT trap so we don't try to remove again
	trap - EXIT
else
	echo "⚠ Skipping .icns creation (macOS only)"
	# Create a dummy .icns for non-macOS systems (not a real icns, just a fallback)
	cp "$ICON_DIR/icon.ico" "$ICON_DIR/icon.icns" 2>/dev/null || true
fi

echo "✓ Icons created successfully in $ICON_DIR"
echo ""
echo "Generated files:"
ls -lh "$ICON_DIR"