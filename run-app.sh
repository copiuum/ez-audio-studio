#!/bin/bash

# EZ Audio Studio - App Launcher
# This script launches the EZ Audio Studio AppImage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE_PATH="$SCRIPT_DIR/dist-electron/EZ Audio Studio-1.0.0.AppImage"

if [ -f "$APPIMAGE_PATH" ]; then
    echo "🚀 Starting EZ Audio Studio..."
    "$APPIMAGE_PATH"
else
    echo "❌ AppImage not found at: $APPIMAGE_PATH"
    echo "Please run 'npm run electron:dist' first to build the executable."
    exit 1
fi
