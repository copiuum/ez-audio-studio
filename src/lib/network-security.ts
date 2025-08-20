/**
 * Network Security Utilities
 * Prevents external connections and ensures offline functionality
 */

// List of blocked domains/IPs
const BLOCKED_HOSTS = [
  '185.158.133.2',
  'guns.lol',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'ezaudiostudio.app'
];

// List of allowed local hosts
const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0'
];

/**
 * Check if a URL should be blocked
 */
export function isBlockedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Block specific IP addresses
    if (BLOCKED_HOSTS.includes(hostname)) {
      console.warn(`Blocked connection to: ${hostname}`);
      return true;
    }
    
    // Block external connections (only allow localhost)
    if (!ALLOWED_HOSTS.includes(hostname) && !hostname.startsWith('localhost')) {
      console.warn(`Blocked external connection to: ${hostname}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Invalid URL format:', url);
    return true; // Block invalid URLs
  }
}

/**
 * Intercept fetch requests to block external connections
 */
export function setupNetworkSecurity(): void {
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    
    if (isBlockedUrl(url)) {
      return Promise.reject(new Error(`External connection blocked: ${url}`));
    }
    
    return originalFetch.call(this, input, init);
  };
  
  // Override XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
    if (isBlockedUrl(url)) {
      throw new Error(`External connection blocked: ${url}`);
    }
    return originalXHROpen.call(this, method, url, ...args);
  };
  
  console.log('Network security enabled - external connections blocked');
}

/**
 * Validate that the app is running in offline mode
 */
export function validateOfflineMode(): boolean {
  // Check if we're running on localhost
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '::1';
  
  if (!isLocalhost) {
    console.warn('App should be running on localhost for offline mode');
    return false;
  }
  
  return true;
}

/**
 * Get network security status
 */
export function getNetworkSecurityStatus(): {
  isOfflineMode: boolean;
  blockedHosts: string[];
  allowedHosts: string[];
} {
  return {
    isOfflineMode: validateOfflineMode(),
    blockedHosts: BLOCKED_HOSTS,
    allowedHosts: ALLOWED_HOSTS
  };
}
