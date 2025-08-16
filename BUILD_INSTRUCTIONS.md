# EZ Audio Studio - Build Instructions

This guide will help you create desktop executables for the EZ Audio Studio application.

## Prerequisites

- Node.js 18+ and npm
- Git (for cloning the repository)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode (with Electron)
```bash
npm run electron:dev
```
This will start both the Vite dev server and Electron app in development mode.

### 3. Build Executables

#### For All Platforms
```bash
npm run electron:dist
```

#### For Specific Platforms

**Windows:**
```bash
npm run build
npx electron-builder --win
```

**macOS:**
```bash
npm run build
npx electron-builder --mac
```

**Linux:**
```bash
npm run build
npx electron-builder --linux
```

## Build Outputs

After building, you'll find the executables in the `dist-electron` folder:

### Windows
- `EZ Audio Studio Setup.exe` - Installer
- `EZ Audio Studio.exe` - Portable executable

### macOS
- `EZ Audio Studio.dmg` - Disk image
- `EZ Audio Studio.app` - Application bundle

### Linux
- `EZ Audio Studio.AppImage` - AppImage (portable)
- `ez-audio-studio.deb` - Debian package
- `ez-audio-studio.rpm` - RPM package

## Available Scripts

- `npm run dev` - Start Vite dev server only
- `npm run build` - Build the web app
- `npm run electron` - Run Electron with built files
- `npm run electron:dev` - Run Electron in development mode
- `npm run electron:build` - Build and package the app
- `npm run electron:pack` - Build and create unpacked directory
- `npm run electron:dist` - Build and create distributable packages

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

- Use `npm run electron:dev` for development with hot reload
- Check the Electron console for debugging (View > Toggle Developer Tools)
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
