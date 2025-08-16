// Security utilities for EZ Audio Studio

// File type validation
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/m4a',
  'audio/aac',
  'audio/webm',
];

export const ALLOWED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.m4a',
  '.aac',
  '.webm',
];

// Validate file type
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 100MB)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 100MB limit' };
  }

  // Check file type
  if (!ALLOWED_AUDIO_TYPES.includes(file.type) && 
      !ALLOWED_AUDIO_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    return { 
      valid: false, 
      error: `Unsupported file type. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}` 
    };
  }

  return { valid: true };
}

// Sanitize filename
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 255); // Limit length
}

// Validate and sanitize user input
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .substring(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ''); // Remove iframes
}

// Validate numeric input
export function validateNumericInput(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

// Generate secure random ID
export function generateSecureId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash sensitive data
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Validate URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Content Security Policy validation
export function validateCSP(csp: string): boolean {
  const requiredDirectives = ['default-src', 'script-src', 'style-src'];
  const directives = csp.split(';').map(d => d.trim().split(' ')[0]);
  
  return requiredDirectives.every(directive => 
    directives.includes(directive)
  );
}

// Rate limiting utility
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, [now]);
      return true;
    }

    const requests = this.requests.get(key)!;
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  clear(): void {
    this.requests.clear();
  }
}

// Audio context security wrapper
export class SecureAudioContext {
  private context: AudioContext | null = null;
  private isInitialized = false;

  async initialize(): Promise<AudioContext | null> {
    if (this.isInitialized) {
      return this.context;
    }

    try {
      // Check if AudioContext is supported
      if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
        throw new Error('AudioContext not supported');
      }

      // Create AudioContext with user gesture
      this.context = new (AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context (required for Chrome)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      this.isInitialized = true;
      return this.context;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      return null;
    }
  }

  getContext(): AudioContext | null {
    return this.context;
  }

  isReady(): boolean {
    return this.isInitialized && this.context?.state === 'running';
  }

  destroy(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.isInitialized = false;
  }
}

// File upload security
export class SecureFileUpload {
  private rateLimiter = new RateLimiter(10, 60000); // 10 uploads per minute

  async validateAndProcessFile(file: File): Promise<{ success: boolean; error?: string; data?: ArrayBuffer }> {
    // Rate limiting
    const uploadKey = 'file-upload';
    if (!this.rateLimiter.isAllowed(uploadKey)) {
      return { success: false, error: 'Upload rate limit exceeded. Please wait before uploading another file.' };
    }

    // File validation
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Read file securely
      const arrayBuffer = await file.arrayBuffer();
      
      // Additional security checks
      if (arrayBuffer.byteLength === 0) {
        return { success: false, error: 'File is empty' };
      }

      if (arrayBuffer.byteLength > 100 * 1024 * 1024) { // 100MB limit
        return { success: false, error: 'File size exceeds limit' };
      }

      return { success: true, data: arrayBuffer };
    } catch (error) {
      return { success: false, error: 'Failed to read file' };
    }
  }
}

// Export security utilities
export const securityUtils = {
  validateAudioFile,
  sanitizeFilename,
  sanitizeInput,
  validateNumericInput,
  generateSecureId,
  hashData,
  isValidUrl,
  validateCSP,
  RateLimiter,
  SecureAudioContext,
  SecureFileUpload,
};
