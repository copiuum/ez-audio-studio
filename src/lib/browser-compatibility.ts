// Browser compatibility utilities for EZ Audio Studio

export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isMobile: boolean;
  supportsWebAudio: boolean;
  supportsServiceWorker: boolean;
  supportsPWA: boolean;
  supportsOffline: boolean;
  supportsWebGL: boolean;
  supportsWebAssembly: boolean;
}

// Detect browser information
export function getBrowserInfo(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  let name = 'Unknown';
  let version = '0';
  
  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'Chrome';
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari';
    version = userAgent.match(/Version\/(\d+)/)?.[1] || '0';
  } else if (userAgent.includes('Edg')) {
    name = 'Edge';
    version = userAgent.match(/Edg\/(\d+)/)?.[1] || '0';
  }
  
  return {
    name,
    version,
    isChrome: name === 'Chrome',
    isFirefox: name === 'Firefox',
    isSafari: name === 'Safari',
    isEdge: name === 'Edge',
    isMobile,
    supportsWebAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsPWA: 'serviceWorker' in navigator && 'PushManager' in window,
    supportsOffline: 'ononline' in window && 'onoffline' in window,
    supportsWebGL: !!window.WebGLRenderingContext,
    supportsWebAssembly: typeof WebAssembly === 'object',
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
  
  if (!browser.supportsServiceWorker) {
    issues.push('Service Worker is not supported - offline functionality disabled');
  }
  
  // Check minimum version requirements
  const version = parseInt(browser.version);
  if (browser.isChrome && version < 88) {
    issues.push('Chrome version 88+ recommended for best performance');
  }
  if (browser.isFirefox && version < 85) {
    issues.push('Firefox version 85+ recommended for best performance');
  }
  if (browser.isSafari && version < 14) {
    issues.push('Safari version 14+ recommended for best performance');
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
  return {
    cores: navigator.hardwareConcurrency || 1,
    memory: (navigator as any).deviceMemory || 'unknown',
    connection: (navigator as any).connection?.effectiveType || 'unknown',
    battery: 'getBattery' in navigator,
    vibration: 'vibrate' in navigator,
    geolocation: 'geolocation' in navigator,
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
  };
  
  return optimizations;
}

// Show browser compatibility warning
export function showCompatibilityWarning() {
  const support = checkBrowserSupport();
  
  if (!support.supported) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f44336;
      color: white;
      padding: 10px;
      text-align: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    warning.innerHTML = `
      <strong>Browser Compatibility Warning:</strong> 
      ${support.issues.join(', ')}. 
      Some features may not work properly.
      <button onclick="this.parentElement.remove()" style="margin-left: 10px; padding: 5px 10px; background: white; border: none; border-radius: 3px; cursor: pointer;">Dismiss</button>
    `;
    
    document.body.appendChild(warning);
  }
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
