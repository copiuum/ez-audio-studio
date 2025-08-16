#!/bin/bash

# EZ Audio Studio - App Launcher
# This script launches the EZ Audio Studio AppImage

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE_PATH="$SCRIPT_DIR/src-tauri/target/release/bundle/appimage/ez-audio-studio_1.0.0_amd64.AppImage"

if [ -f "$APPIMAGE_PATH" ]; then
    echo "🚀 Starting EZ Audio Studio..."
    "$APPIMAGE_PATH"
else
    echo "❌ AppImage not found at: $APPIMAGE_PATH"
    echo "Please run 'npm run tauri build' first to build the executable."
    exit 1
fi
