#!/usr/bin/env node

/**
 * Generate a simple placeholder icon for development
 * This creates a basic SVG that can be converted to PNG
 */

const fs = require('fs')
const path = require('path')

const iconDir = path.join(__dirname, '../apps/desktop/src/assets')
const svgPath = path.join(iconDir, 'icon.svg')

// Create assets directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
	fs.mkdirSync(iconDir, { recursive: true })
}

// Simple SVG icon (1024x1024)
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" fill="#3B82F6" rx="180"/>
  
  <!-- Code brackets -->
  <g fill="white" opacity="0.95">
    <!-- Left bracket -->
    <path d="M 350 256 L 250 256 L 250 768 L 350 768 L 350 720 L 310 720 L 310 304 L 350 304 Z" />
    
    <!-- Right bracket -->
    <path d="M 674 256 L 774 256 L 774 768 L 674 768 L 674 720 L 714 720 L 714 304 L 674 304 Z" />
    
    <!-- Pulse line (like a heartbeat) -->
    <path d="M 380 512 L 450 512 L 480 400 L 510 624 L 540 512 L 644 512" 
          stroke="white" 
          stroke-width="24" 
          fill="none" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
  </g>
  
  <!-- CP text -->
  <text x="512" y="880" 
        font-family="Arial, sans-serif" 
        font-size="120" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">CP</text>
</svg>`

fs.writeFileSync(svgPath, svg)
console.log('✓ Created placeholder icon at:', svgPath)
console.log('\nNext steps:')
console.log('1. Convert SVG to 1024x1024 PNG (use online converter or ImageMagick)')
console.log('2. Run: cd apps/desktop && pnpm tauri icon src/assets/icon.png')
console.log('\nOr use your own custom icon (must be square, 1024x1024 recommended)')
