// Linux-specific optimizations for EZ Audio Studio

export interface LinuxSystemInfo {
  isLinux: boolean;
  displayServer: 'x11' | 'wayland' | 'unknown';
  desktopEnvironment: string;
  windowManager: string;
  gpuDriver: string;
  audioBackend: string;
  kernelVersion: string;
}

// Detect Linux system information
export function getLinuxSystemInfo(): LinuxSystemInfo {
  const userAgent = navigator.userAgent;
  const isLinux = /Linux/.test(userAgent) && !/Android/.test(userAgent);
  
  if (!isLinux) {
    return {
      isLinux: false,
      displayServer: 'unknown',
      desktopEnvironment: 'unknown',
      windowManager: 'unknown',
      gpuDriver: 'unknown',
      audioBackend: 'unknown',
      kernelVersion: 'unknown',
    };
  }

  // Detect display server
  const detectDisplayServer = (): 'x11' | 'wayland' | 'unknown' => {
    try {
      // Check for Wayland environment variables
      if (typeof window !== 'undefined') {
        // In a real application, you would check environment variables
        // For now, we'll use a heuristic based on user agent and available APIs
        if ((window as any).navigator?.userAgent?.includes('Wayland')) {
          return 'wayland';
        }
        
        // Check for X11-specific features
        if (typeof (window as any).X11 !== 'undefined') {
          return 'x11';
        }
        
        // Default to X11 for Linux (most common)
        return 'x11';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // Detect desktop environment and window manager
  const detectDesktopEnvironment = (): { de: string; wm: string } => {
    try {
      // Common desktop environments
      const desktopEnvironments = [
        'GNOME', 'KDE', 'XFCE', 'MATE', 'Cinnamon', 'Budgie', 'LXQt', 'LXDE'
      ];
      
      const windowManagers = [
        'KWin', 'Mutter', 'Xfwm4', 'Marco', 'Muffin', 'Budgie-wm', 'Openbox', 'i3', 'Sway'
      ];
      
      // This is a simplified detection - in a real app, you'd check environment variables
      return {
        de: 'Unknown',
        wm: 'Unknown'
      };
    } catch {
      return { de: 'Unknown', wm: 'Unknown' };
    }
  };

  const displayServer = detectDisplayServer();
  const { de: desktopEnvironment, wm: windowManager } = detectDesktopEnvironment();

  return {
    isLinux: true,
    displayServer,
    desktopEnvironment,
    windowManager,
    gpuDriver: 'Unknown', // Would be detected via WebGL in a real implementation
    audioBackend: 'PulseAudio', // Default for most Linux systems
    kernelVersion: 'Unknown', // Would be detected via system calls in a real implementation
  };
}

// Optimize for specific Linux display server
export function optimizeForLinuxDisplayServer(displayServer: 'x11' | 'wayland' | 'unknown'): void {
  if (typeof window === 'undefined') return;

  switch (displayServer) {
    case 'wayland':
      optimizeForWayland();
      break;
    case 'x11':
      optimizeForX11();
      break;
    default:
      // Use default optimizations
      break;
  }
}

// Wayland-specific optimizations
function optimizeForWayland(): void {
  if (typeof window === 'undefined') return;

  console.log('🔵 Applying Wayland optimizations');
  
  // Wayland-specific performance optimizations
  document.documentElement.style.setProperty('--wayland-optimized', 'true');
  
  // Enable hardware acceleration hints for Wayland
  if ('navigator' in window && 'gpu' in navigator) {
    try {
      // Request high-performance GPU
      (navigator as any).gpu?.requestAdapter?.({ powerPreference: 'high-performance' });
    } catch (e) {
      // GPU API not available
    }
  }
  
  // Optimize canvas rendering for Wayland
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    (canvas as HTMLCanvasElement).style.imageRendering = 'optimizeSpeed';
    (canvas as HTMLCanvasElement).style.imageRendering = '-webkit-optimize-contrast';
  });
}

// X11-specific optimizations
function optimizeForX11(): void {
  if (typeof window === 'undefined') return;

  console.log('🟢 Applying X11 optimizations');
  
  // X11-specific performance optimizations
  document.documentElement.style.setProperty('--x11-optimized', 'true');
  
  // Enable X11-specific rendering optimizations
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    (canvas as HTMLCanvasElement).style.imageRendering = 'crisp-edges';
    (canvas as HTMLCanvasElement).style.imageRendering = '-moz-crisp-edges';
  });
  
  // Optimize for X11 window management
  if ('navigator' in window) {
    // Set performance hints for X11
    document.documentElement.style.setProperty('--x11-performance', 'true');
  }
}

// Linux audio optimizations
export function optimizeLinuxAudio(): void {
  if (typeof window === 'undefined') return;

  const systemInfo = getLinuxSystemInfo();
  
  if (!systemInfo.isLinux) return;

  console.log('🎵 Applying Linux audio optimizations');
  
  // Audio backend specific optimizations
  switch (systemInfo.audioBackend) {
    case 'PulseAudio':
      optimizeForPulseAudio();
      break;
    case 'ALSA':
      optimizeForALSA();
      break;
    case 'PipeWire':
      optimizeForPipeWire();
      break;
    default:
      // Use default audio optimizations
      break;
  }
}

// PulseAudio optimizations
function optimizeForPulseAudio(): void {
  console.log('🔊 Optimizing for PulseAudio');
  
  // Set audio context options for PulseAudio
  if (typeof AudioContext !== 'undefined') {
    // PulseAudio works well with default settings
    document.documentElement.style.setProperty('--audio-backend', 'pulseaudio');
  }
}

// ALSA optimizations
function optimizeForALSA(): void {
  console.log('🔊 Optimizing for ALSA');
  
  // ALSA-specific optimizations
  document.documentElement.style.setProperty('--audio-backend', 'alsa');
  
  // ALSA works better with lower latency settings
  if (typeof AudioContext !== 'undefined') {
    // Request lower latency for ALSA
    document.documentElement.style.setProperty('--audio-latency', 'low');
  }
}

// PipeWire optimizations
function optimizeForPipeWire(): void {
  console.log('🔊 Optimizing for PipeWire');
  
  // PipeWire-specific optimizations
  document.documentElement.style.setProperty('--audio-backend', 'pipewire');
  
  // PipeWire supports modern audio features
  if (typeof AudioContext !== 'undefined') {
    document.documentElement.style.setProperty('--audio-features', 'modern');
  }
}

// Linux-specific performance monitoring
export function monitorLinuxPerformance(): {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage: number;
} {
  // Simplified performance monitoring
  // In a real implementation, you'd use Performance API and other metrics
  
  return {
    fps: 60, // Placeholder
    memoryUsage: 0, // Placeholder
    cpuUsage: 0, // Placeholder
    gpuUsage: 0, // Placeholder
  };
}

// Initialize Linux optimizations
export function initializeLinuxOptimizations(): void {
  if (typeof window === 'undefined') return;

  const systemInfo = getLinuxSystemInfo();
  
  if (!systemInfo.isLinux) {
    console.log('🖥️ Not running on Linux - skipping Linux optimizations');
    return;
  }

  console.log('🐧 Linux system detected:', systemInfo);
  
  // Apply display server optimizations
  optimizeForLinuxDisplayServer(systemInfo.displayServer);
  
  // Apply audio optimizations
  optimizeLinuxAudio();
  
  // Set Linux-specific CSS variables
  document.documentElement.style.setProperty('--linux-optimized', 'true');
  document.documentElement.style.setProperty('--display-server', systemInfo.displayServer);
  document.documentElement.style.setProperty('--desktop-environment', systemInfo.desktopEnvironment);
  
  // Log optimization status
  console.log('✅ Linux optimizations applied:', {
    displayServer: systemInfo.displayServer,
    desktopEnvironment: systemInfo.desktopEnvironment,
    windowManager: systemInfo.windowManager,
    audioBackend: systemInfo.audioBackend,
  });
}

// Get Linux performance recommendations
export function getLinuxPerformanceRecommendations(): string[] {
  const recommendations: string[] = [];
  const systemInfo = getLinuxSystemInfo();
  
  if (!systemInfo.isLinux) return recommendations;
  
  // Display server recommendations
  if (systemInfo.displayServer === 'wayland') {
    recommendations.push('Wayland detected - using modern display server optimizations');
  } else if (systemInfo.displayServer === 'x11') {
    recommendations.push('X11 detected - using traditional display server optimizations');
  }
  
  // Audio backend recommendations
  if (systemInfo.audioBackend === 'PipeWire') {
    recommendations.push('PipeWire detected - modern audio backend with low latency');
  } else if (systemInfo.audioBackend === 'PulseAudio') {
    recommendations.push('PulseAudio detected - stable audio backend');
  } else if (systemInfo.audioBackend === 'ALSA') {
    recommendations.push('ALSA detected - direct audio access for lower latency');
  }
  
  // General Linux recommendations
  recommendations.push('Linux system detected - applying platform-specific optimizations');
  
  return recommendations;
}
