// Performance optimization utilities for EZ Audio Studio

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

// Performance monitoring
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  mark(name: string): void {
    if (performance && performance.mark) {
      performance.mark(name);
      this.marks.set(name, performance.now());
    }
  }

  measure(name: string, startMark: string, endMark: string): number | null {
    if (performance && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        const duration = measure.duration;
        this.measures.set(name, duration);
        return duration;
      } catch (error) {
        console.warn('Performance measure failed:', error);
        return null;
      }
    }
    return null;
  }

  getMeasure(name: string): number | undefined {
    return this.measures.get(name);
  }

  clear(): void {
    if (performance && performance.clearMarks) {
      performance.clearMarks();
      performance.clearMeasures();
    }
    this.marks.clear();
    this.measures.clear();
  }
}

// Memory management
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryUsage: number[] = [];
  private maxMemoryUsage = 100; // Keep last 100 measurements

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as PerformanceWithMemory).memory;
      if (memory) {
        this.memoryUsage.push(memory.usedJSHeapSize);
      }
      
      if (this.memoryUsage.length > this.maxMemoryUsage) {
        this.memoryUsage.shift();
      }
    }
  }

  getAverageMemoryUsage(): number {
    if (this.memoryUsage.length === 0) return 0;
    return this.memoryUsage.reduce((a, b) => a + b, 0) / this.memoryUsage.length;
  }

  getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as PerformanceWithMemory).memory;
      return memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  isMemoryUsageHigh(): boolean {
    const current = this.getCurrentMemoryUsage();
    const average = this.getAverageMemoryUsage();
    return current > average * 1.5; // 50% above average
  }
}

// Web Worker manager for heavy computations
export class WorkerManager {
  private workers: Map<string, Worker> = new Map();
  private maxWorkers = navigator.hardwareConcurrency || 4;

  createWorker(name: string, script: string): Worker | null {
    if (this.workers.size >= this.maxWorkers) {
      console.warn('Maximum number of workers reached');
      return null;
    }

    try {
      const worker = new Worker(script, { type: 'module' });
      this.workers.set(name, worker);
      return worker;
    } catch (error) {
      console.error('Failed to create worker:', error);
      return null;
    }
  }

  getWorker(name: string): Worker | undefined {
    return this.workers.get(name);
  }

  terminateWorker(name: string): void {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
    }
  }

  terminateAll(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
  }
}

// Audio processing optimization
export class AudioProcessorOptimizer {
  private static instance: AudioProcessorOptimizer;
  private frameRate = 60;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;

  static getInstance(): AudioProcessorOptimizer {
    if (!AudioProcessorOptimizer.instance) {
      AudioProcessorOptimizer.instance = new AudioProcessorOptimizer();
    }
    return AudioProcessorOptimizer.instance;
  }

  // Optimize frame rate for audio processing
  shouldProcessFrame(currentTime: number): boolean {
    const frameInterval = 1000 / this.frameRate;
    
    if (currentTime - this.lastFrameTime >= frameInterval) {
      this.lastFrameTime = currentTime;
      this.frameCount++;
      
      // Calculate FPS every second
      if (this.frameCount % this.frameRate === 0) {
        this.fps = this.frameCount;
      }
      
      return true;
    }
    
    return false;
  }

  getFPS(): number {
    return this.fps;
  }

  // Optimize audio buffer processing
  optimizeBufferSize(sampleRate: number): number {
    // Use power of 2 buffer sizes for better performance
    const targetBufferSize = sampleRate / 60; // 60 FPS
    return Math.pow(2, Math.round(Math.log2(targetBufferSize)));
  }

  // Optimize FFT size for visualization
  optimizeFFTSize(): number {
    const memoryUsage = MemoryManager.getInstance().getCurrentMemoryUsage();
    
    // Use smaller FFT size on low-end devices
    if (memoryUsage > 50 * 1024 * 1024) { // 50MB
      return 256;
    } else if (memoryUsage > 25 * 1024 * 1024) { // 25MB
      return 512;
    } else {
      return 1024;
    }
  }
}

// Cache management for local storage
export class CacheManager {
  private static readonly CACHE_PREFIX = 'ez_audio_';
  private static readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

  static set(key: string, value: unknown, ttl: number = 3600000): void { // 1 hour default
    try {
      const item = {
        value,
        timestamp: Date.now(),
        ttl,
      };
      
      localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(item));
      this.cleanup();
    } catch (error) {
      console.warn('Failed to cache item:', error);
    }
  }

  static get(key: string): unknown {
    try {
      const item = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();
      
      if (now - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(this.CACHE_PREFIX + key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.warn('Failed to retrieve cached item:', error);
      return null;
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(this.CACHE_PREFIX + key);
  }

  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  private static cleanup(): void {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
    
    // Remove expired items
    cacheKeys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          const now = Date.now();
          
          if (now - parsed.timestamp > parsed.ttl) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    });

    // Check cache size
    let totalSize = 0;
    cacheKeys.forEach(key => {
      totalSize += localStorage.getItem(key)?.length || 0;
    });

    if (totalSize > this.MAX_CACHE_SIZE) {
      // Remove oldest items
      const items = cacheKeys.map(key => ({
        key,
        timestamp: JSON.parse(localStorage.getItem(key) || '{}').timestamp || 0,
      })).sort((a, b) => a.timestamp - b.timestamp);

      while (totalSize > this.MAX_CACHE_SIZE && items.length > 0) {
        const item = items.shift();
        if (item) {
          const size = localStorage.getItem(item.key)?.length || 0;
          localStorage.removeItem(item.key);
          totalSize -= size;
        }
      }
    }
  }
}

// Debounce utility for performance
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request animation frame wrapper
export function requestAnimationFrameOptimized(callback: FrameRequestCallback): number {
  return requestAnimationFrame((timestamp) => {
    const optimizer = AudioProcessorOptimizer.getInstance();
    if (optimizer.shouldProcessFrame(timestamp)) {
      callback(timestamp);
    }
  });
}

// Export performance utilities
export const performanceUtils = {
  PerformanceMonitor,
  MemoryManager,
  WorkerManager,
  AudioProcessorOptimizer,
  CacheManager,
  debounce,
  throttle,
  requestAnimationFrameOptimized,
};
