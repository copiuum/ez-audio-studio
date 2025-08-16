# EZ Audio Studio - Build Instructions

This guide will help you create desktop executables for the EZ Audio Studio application using Tauri (Rust backend).

## Prerequisites

- Node.js 18+ and npm
- Rust (install from https://rustup.rs/)
- Git (for cloning the repository)

### Platform-Specific Prerequisites

**Windows:**
- Microsoft C++ Build Tools
- WebView2 (usually already installed)

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux:**
- webkit2gtk: `sudo apt-get install webkit2gtk-4.0-dev`
- Additional deps: `sudo apt-get install build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run tauri dev
```
This will start both the Vite dev server and Tauri app in development mode.

### 3. Build Executables

#### For Current Platform
```bash
npm run tauri build
```

#### For Specific Platforms (Cross-compilation)
```bash
# Windows (from any platform with proper toolchain)
npm run tauri build --target x86_64-pc-windows-msvc

# macOS (from macOS only)
npm run tauri build --target x86_64-apple-darwin
npm run tauri build --target aarch64-apple-darwin

# Linux
npm run tauri build --target x86_64-unknown-linux-gnu
```

## Build Outputs

After building, you'll find the executables in the `src-tauri/target/release/bundle` folder:

### Windows
- `ez-audio-studio_1.0.0_x64-setup.exe` - Installer (NSIS)
- `ez-audio-studio_1.0.0_x64.msi` - MSI installer

### macOS
- `EZ Audio Studio.app` - Application bundle
- `EZ Audio Studio.dmg` - Disk image

### Linux
- `ez-audio-studio_1.0.0_amd64.deb` - Debian package
- `ez-audio-studio_1.0.0_amd64.AppImage` - AppImage (portable)

## Available Scripts

- `npm run dev` - Start Vite dev server only
- `npm run build` - Build the web app
- `npm run tauri dev` - Run Tauri in development mode
- `npm run tauri build` - Build and create distributable packages

## Features

### Desktop Integration
- Native file dialogs for audio import/export
- System menu integration
- Keyboard shortcuts (Ctrl+O for open, Ctrl+S for save)
- Proper window management
- Cross-platform compatibility

### Audio Processing
- Real-time audio effects
- Advanced studio with experimental features
- MP3 export capability
- Professional audio visualization

## Troubleshooting

### Common Issues

1. **Build fails on Linux**
   - Install required dependencies: `sudo apt-get install rpm`
   - For AppImage: `sudo apt-get install appimagetool`

2. **Build fails on macOS**
   - Ensure you have Xcode Command Line Tools installed
   - Run: `xcode-select --install`

3. **Build fails on Windows**
   - Install Visual Studio Build Tools
   - Ensure Python is available in PATH

### Development Tips

- Use `npm run tauri dev` for development with hot reload
- Check the browser console for debugging (right-click > Inspect Element)
- The app runs on `http://localhost:8080` in development mode

## Distribution

### Code Signing (Recommended for Production)

For production distribution, consider code signing your applications:

**Windows:**
- Purchase a code signing certificate
- Add certificate details to electron-builder config

**macOS:**
- Join Apple Developer Program
- Configure code signing in Xcode

**Linux:**
- GPG signing for packages

### Auto-Updates

For automatic updates, consider implementing:
- electron-updater for automatic updates
- GitHub releases for distribution
- Squirrel.Windows for Windows updates

## License

This project is licensed under the MIT License - see the LICENSE file for details.
