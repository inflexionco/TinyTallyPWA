#!/bin/bash

# TinyTally - Create Placeholder Icons Script
# This script creates simple placeholder icons for testing purposes

echo "🎨 TinyTally - Creating Placeholder Icons"
echo "=========================================="
echo ""

# Check if icons directory exists
if [ ! -d "public/icons" ]; then
  echo "📁 Creating public/icons directory..."
  mkdir -p public/icons
fi

# Icon sizes needed for PWA
sizes=(72 96 128 144 152 192 384 512)

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
  echo "✅ ImageMagick found - generating colored icons"
  echo ""

  for size in "${sizes[@]}"; do
    echo "   Creating ${size}x${size} icon..."
    convert -size ${size}x${size} \
      -gravity center \
      xc:'#60a5fa' \
      -font Arial \
      -pointsize $((size / 8)) \
      -fill white \
      -annotate +0+0 "TinyTally\n${size}px" \
      public/icons/icon-${size}x${size}.png
  done

  echo ""
  echo "✅ All icons created successfully!"

elif command -v node &> /dev/null; then
  echo "ℹ️  ImageMagick not found, checking for alternative methods..."
  echo ""

  # Check if icon-template.svg exists
  if [ -f "public/icon-template.svg" ]; then
    echo "📝 Found icon-template.svg"
    echo ""
    echo "Please use one of these online tools to generate icons:"
    echo "1. https://realfavicongenerator.net/"
    echo "2. https://www.pwabuilder.com/imageGenerator"
    echo ""
    echo "Upload public/icon-template.svg and download the generated icons."
    echo "Then extract them to public/icons/ directory."
    exit 0
  else
    echo "❌ No icon generation tools found"
    echo ""
    echo "To create placeholder icons, you have these options:"
    echo ""
    echo "Option 1: Install ImageMagick"
    echo "  macOS:   brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/script/download.php"
    echo ""
    echo "Option 2: Use online tools"
    echo "  1. Go to https://realfavicongenerator.net/"
    echo "  2. Upload any square image (512x512 recommended)"
    echo "  3. Download generated icons"
    echo "  4. Extract to public/icons/"
    echo ""
    echo "Option 3: Manual copy (for quick testing only)"
    echo "  Find any square PNG image and run:"
    echo "  for size in 72 96 128 144 152 192 384 512; do"
    echo "    cp your-image.png public/icons/icon-\${size}x\${size}.png"
    echo "  done"
    exit 1
  fi

else
  echo "❌ Node.js not found"
  echo "Please install Node.js to continue"
  exit 1
fi

echo ""
echo "📍 Icons created in: public/icons/"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "Note: These are placeholder icons for testing."
echo "For production, create proper icons using:"
echo "  - https://realfavicongenerator.net/"
echo "  - https://www.pwabuilder.com/imageGenerator"
echo ""
echo "Happy coding! 👶📊"
