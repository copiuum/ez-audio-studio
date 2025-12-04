// Browser compatibility utilities for EZ Audio Studio

export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isBrave: boolean;
  isEdge: boolean;
  isChromiumBased: boolean;
  isFirefoxBased: boolean;
  isMobile: boolean;
  isLinux: boolean;
  displayServer: 'x11' | 'wayland' | 'unknown';
  supportsWebAudio: boolean;
  supportsServiceWorker: boolean;
  supportsPWA: boolean;
  supportsOffline: boolean;
  supportsWebGL: boolean;
  supportsWebAssembly: boolean;
  supportsOpenGL: boolean;
}

// Detect browser information
export function getBrowserInfo(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isLinux = /Linux/.test(userAgent) && !/Android/.test(userAgent);
  
  let name = 'Unknown';
  let version = '0';
  
  // Detect browser with modern Chromium and Firefox support
  if (userAgent.includes('Brave')) {
    name = 'Brave';
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'Chrome';
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Edg')) {
    name = 'Edge';
    version = userAgent.match(/Edg\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Chromium')) {
    name = 'Chromium';
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('LibreWolf')) {
    name = 'LibreWolf';
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Waterfox')) {
    name = 'Waterfox';
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
  }
  
  // Detect Chromium-based browsers
  const isChromiumBased = /Chrome|Chromium|Brave|Edge|Opera|Vivaldi|Arc|Thorium/.test(userAgent);
  
  // Detect Firefox-based browsers
  const isFirefoxBased = /Firefox|LibreWolf|Waterfox|Pale Moon|SeaMonkey/.test(userAgent);
  
  // Detect Linux display server
  const detectDisplayServer = (): 'x11' | 'wayland' | 'unknown' => {
    if (!isLinux) return 'unknown';
    
    try {
      // Check for Wayland environment variables
      if (typeof window !== 'undefined' && (window as any).navigator?.userAgent?.includes('Wayland')) {
        return 'wayland';
      }
      
      // Check for X11 environment variables (fallback)
      if (typeof window !== 'undefined') {
        // This is a simplified check - in a real app, you'd check environment variables
        // For now, we'll assume X11 as default for Linux
        return 'x11';
      }
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  };
  
  // Check for OpenGL support
  const supportsOpenGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          return renderer && renderer.toLowerCase().includes('opengl');
        }
      }
      return false;
    } catch {
      return false;
    }
  })();
  
  return {
    name,
    version,
    isChrome: name === 'Chrome',
    isFirefox: name === 'Firefox',
    isBrave: name === 'Brave',
    isEdge: name === 'Edge',
    isChromiumBased,
    isFirefoxBased,
    isMobile,
    isLinux,
    displayServer: detectDisplayServer(),
    supportsWebAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    supportsServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    supportsPWA: 'serviceWorker' in navigator && 'PushManager' in window,
    supportsOffline: 'ononline' in window && 'onoffline' in window,
    supportsWebGL: !!window.WebGLRenderingContext,
    supportsWebAssembly: typeof WebAssembly === 'object',
    supportsOpenGL,
  };
}

// Check if browser supports required features
export function checkBrowserSupport(): { supported: boolean; issues: string[] } {
  const browser = getBrowserInfo();
  const issues: string[] = [];
  
  if (!browser.supportsWebAudio) {
    issues.push('Web Audio API is not supported');
  }
  
  if (!browser.supportsWebGL) {
    issues.push('WebGL is not supported - audio visualization may not work');
  }
  

  
  // Linux-specific checks
  if (browser.isLinux) {
    if (browser.displayServer === 'unknown') {
      issues.push('Linux display server not detected - using default optimizations');
    } else if (browser.displayServer === 'wayland') {
      console.log('✅ Wayland detected - using modern display server optimizations');
    } else if (browser.displayServer === 'x11') {
      console.log('✅ X11 detected - using traditional display server optimizations');
    }
  }
  
  if (!browser.supportsServiceWorker) {
    issues.push('Service Worker is not supported - offline functionality disabled. Some features may not work properly.');
  }
  
  // Check minimum version requirements for modern browsers
  const version = parseInt(browser.version);
  
  // Chromium-based browsers (Chrome, Edge, Brave, etc.)
  if (browser.isChromiumBased && version < 88) {
    issues.push(`${browser.name} version 88+ required for Web Audio API and Service Worker support`);
  } else if (browser.isChromiumBased && version < 100) {
    console.warn(`⚠️ ${browser.name} version ${version} detected. Version 100+ recommended for optimal performance`);
  }
  
  // Firefox-based browsers
  if (browser.isFirefoxBased && version < 85) {
    issues.push(`${browser.name} version 85+ required for Web Audio API and Service Worker support`);
  } else if (browser.isFirefoxBased && version < 100) {
    console.warn(`⚠️ ${browser.name} version ${version} detected. Version 100+ recommended for optimal performance`);
  }
  
  // Safari (WebKit-based)
  if (browser.isSafari && version < 14) {
    issues.push('Safari version 14+ required for Web Audio API support');
  }
  
  return {
    supported: issues.length === 0,
    issues,
  };
}

// Audio context compatibility wrapper
export function createAudioContext(): AudioContext | null {
  try {
    // Try standard AudioContext first
    if (typeof AudioContext !== 'undefined') {
      return new AudioContext();
    }
    
    // Fallback to webkit prefix for older browsers
    if (typeof (window as any).webkitAudioContext !== 'undefined') {
      return new (window as any).webkitAudioContext();
    }
    
    return null;
  } catch (error) {
    console.error('Failed to create AudioContext:', error);
    return null;
  }
}

// File API compatibility
export function supportsFileAPI(): boolean {
  return 'File' in window && 'FileReader' in window && 'FileList' in window;
}

// Drag and Drop compatibility
export function supportsDragAndDrop(): boolean {
  return 'draggable' in document.createElement('div');
}

// Local storage compatibility
export function supportsLocalStorage(): boolean {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// IndexedDB compatibility
export function supportsIndexedDB(): boolean {
  return 'indexedDB' in window;
}

// Performance API compatibility
export function supportsPerformanceAPI(): boolean {
  return 'performance' in window && 'now' in performance;
}

// Request Animation Frame compatibility
export function supportsRequestAnimationFrame(): boolean {
  return 'requestAnimationFrame' in window;
}

// Web Workers compatibility
export function supportsWebWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

// Get device capabilities
export function getDeviceCapabilities() {
  const browser = getBrowserInfo();
  
  return {
    cores: navigator.hardwareConcurrency || 1,
    memory: (navigator as any).deviceMemory || 'unknown',
    connection: (navigator as any).connection?.effectiveType || 'unknown',
    battery: 'getBattery' in navigator,
    vibration: 'vibrate' in navigator,
    geolocation: 'geolocation' in navigator,
    // Linux-specific capabilities
    isLinux: browser.isLinux,
    displayServer: browser.displayServer,
    isChromiumBased: browser.isChromiumBased,
    isFirefoxBased: browser.isFirefoxBased,
  };
}

// Optimize for device capabilities
export function optimizeForDevice() {
  const capabilities = getDeviceCapabilities();
  const browser = getBrowserInfo();
  
  // Adjust performance based on device capabilities
  const optimizations = {
    useWebWorkers: capabilities.cores > 1 && browser.supportsWebAssembly,
    useOfflineCache: browser.supportsServiceWorker && capabilities.connection !== 'slow-2g',
    useHighQualityAudio: capabilities.cores >= 4,
    useRealTimeEffects: capabilities.cores >= 2,
    useAdvancedVisualization: browser.supportsWebGL && capabilities.cores >= 2,
    // Linux-specific optimizations
    useLinuxOptimizations: capabilities.isLinux,
    useWaylandOptimizations: capabilities.displayServer === 'wayland',
    useX11Optimizations: capabilities.displayServer === 'x11',
    useModernBrowserFeatures: capabilities.isChromiumBased || capabilities.isFirefoxBased,
  };
  
  return optimizations;
}

// Show browser compatibility warning (deprecated - use SystemStatus component instead)
export function showCompatibilityWarning() {
  // This function is deprecated in favor of the SystemStatus component
  // which provides a much better user experience
}

// Initialize browser compatibility checks
export function initializeBrowserCompatibility() {
  // Show warnings if needed
  showCompatibilityWarning();
  
  // Log browser info for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Browser Info:', getBrowserInfo());
    console.log('Device Capabilities:', getDeviceCapabilities());
    console.log('Optimizations:', optimizeForDevice());
  }
}
