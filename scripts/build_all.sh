#!/bin/bash
set -e

echo "📦 Building all packages..."
pnpm -w build

echo "✅ All packages built successfully!"
