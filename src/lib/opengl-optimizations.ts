// OpenGL optimizations for EZ Audio Studio

export interface OpenGLContext {
  gl: WebGLRenderingContext | null;
  canvas: HTMLCanvasElement;
  isOpenGL: boolean;
  renderer: string;
  vendor: string;
  version: string;
}

// Create optimized WebGL context with OpenGL preferences
export function createOptimizedWebGLContext(
  canvas: HTMLCanvasElement,
  options: WebGLContextAttributes = {}
): OpenGLContext {
  // Enhanced context attributes for OpenGL optimization
  const enhancedOptions: WebGLContextAttributes = {
    alpha: false, // Disable alpha for better performance
    antialias: false, // Disable antialiasing for performance
    depth: false, // Disable depth buffer for 2D rendering
    failIfMajorPerformanceCaveat: false, // Allow software rendering fallback
    powerPreference: 'high-performance', // Prefer dedicated GPU
    premultipliedAlpha: false,
    preserveDrawingBuffer: false, // Better performance
    stencil: false, // Disable stencil buffer
    ...options,
  };

  // Try to get WebGL context
  const gl = (canvas.getContext('webgl', enhancedOptions) || 
             canvas.getContext('experimental-webgl', enhancedOptions)) as WebGLRenderingContext | null;

  if (!gl) {
    return {
      gl: null,
      canvas,
      isOpenGL: false,
      renderer: 'Unknown',
      vendor: 'Unknown',
      version: 'Unknown',
    };
  }

  // Get OpenGL information
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  let renderer = 'Unknown';
  let vendor = 'Unknown';
  let version = 'Unknown';
  let isOpenGL = false;

  if (debugInfo) {
    renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
    vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
    version = gl.getParameter(gl.VERSION) || 'Unknown';
    isOpenGL = renderer.toLowerCase().includes('opengl');
  }

  // Apply OpenGL-specific optimizations
  if (isOpenGL) {
    // Enable extensions for better performance
    const extensions = [
      'OES_standard_derivatives',
      'OES_element_index_uint',
      'WEBGL_depth_texture',
      'WEBGL_draw_buffers',
      'WEBGL_lose_context',
    ];

    extensions.forEach(ext => {
      try {
        gl.getExtension(ext);
      } catch (e) {
        // Extension not supported, continue
      }
    });

    // Set OpenGL-specific hints
    gl.hint(gl.GENERATE_MIPMAP_HINT, gl.FASTEST);
    // Note: FRAGMENT_SHADER_DERIVATIVE_HINT is not available in WebGL 1.0
  }

  return {
    gl,
    canvas,
    isOpenGL,
    renderer,
    vendor,
    version,
  };
}

// Optimize canvas for OpenGL rendering
export function optimizeCanvasForOpenGL(canvas: HTMLCanvasElement): void {
  // Set canvas attributes for better OpenGL performance
  canvas.style.imageRendering = 'optimizeSpeed';
  canvas.style.imageRendering = '-moz-crisp-edges';
  canvas.style.imageRendering = '-webkit-optimize-contrast';
  canvas.style.imageRendering = 'optimize-contrast';
  // Note: msInterpolationMode is deprecated, using modern alternatives

  // Set canvas size for optimal performance
  const devicePixelRatio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  
  // Scale the drawing context so everything draws at the correct size
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
}

// Check if OpenGL is available and optimized
export function checkOpenGLSupport(): {
  supported: boolean;
  optimized: boolean;
  renderer: string;
  vendor: string;
  version: string;
} {
  const canvas = document.createElement('canvas');
  const context = createOptimizedWebGLContext(canvas);
  
  return {
    supported: !!context.gl,
    optimized: context.isOpenGL,
    renderer: context.renderer,
    vendor: context.vendor,
    version: context.version,
  };
}

// Initialize OpenGL optimizations
export function initializeOpenGLOptimizations(): void {
  if (typeof window === 'undefined') return;

  // Check OpenGL support
  const openGLInfo = checkOpenGLSupport();
  
  if (openGLInfo.supported) {
    console.log('WebGL Support:', {
      renderer: openGLInfo.renderer,
      vendor: openGLInfo.vendor,
      version: openGLInfo.version,
      optimized: openGLInfo.optimized,
    });

    if (openGLInfo.optimized) {
      console.log('✅ OpenGL optimizations enabled');
      
      // Set global flag for OpenGL optimizations
      (window as any).__OPENGL_OPTIMIZED__ = true;
      
      // Apply performance optimizations
      document.documentElement.style.setProperty('--opengl-optimized', 'true');
    } else {
      console.log('⚠️ WebGL available but not OpenGL optimized');
    }
  } else {
    console.warn('❌ WebGL not supported - falling back to software rendering');
  }
}

// Get OpenGL performance hints
export function getOpenGLPerformanceHints(): string[] {
  const hints: string[] = [];
  const openGLInfo = checkOpenGLSupport();

  if (!openGLInfo.supported) {
    hints.push('WebGL not supported - audio visualization may be limited');
    return hints;
  }

  if (!openGLInfo.optimized) {
    hints.push('OpenGL not detected - using software rendering');
  }

  // Check for common performance issues
  if (openGLInfo.renderer.includes('Software')) {
    hints.push('Software rendering detected - performance may be limited');
  }

  if (openGLInfo.renderer.includes('Intel')) {
    hints.push('Intel graphics detected - consider using dedicated GPU for better performance');
  }

  return hints;
}
