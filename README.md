# EZ Audio Studio

A professional audio studio application with real-time effects and advanced processing capabilities.

## Project Overview

This project is a personal imagination of what slowedreverb.studio could have been if it was free without paywall. It provides a comprehensive audio processing suite with both basic and advanced features.

## How can I edit this code?

There are several ways of editing your application:

**Use any code editor or IDE**

Changes made via Cursor or any code editor can be committed to this repo.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Web Audio API
- Tauri (for desktop app)

## Features

### Basic Studio
- Real-time audio effects (Reverb, Bass Boost, Tempo, Volume)
- Audio visualization
- MP3 export functionality
- Smooth performance optimizations

### Advanced Studio
- 5-band parametric equalizer
- Professional limiter with threshold and release controls
- Attenuator with gain control
- Audio processing toggle
- Enhanced visualization
- Cross-browser optimizations

## How can I deploy this project?

### Web Version
```bash
npm run build
npm run preview
```

### Desktop Version
```bash
npm run tauri:build
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run Tauri desktop app
npm run tauri:dev
```

## License

This project is open source and available under the MIT License.
