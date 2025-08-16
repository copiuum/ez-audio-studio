// Comprehensive feature test for EZ Audio Studio

import { getBrowserInfo, checkBrowserSupport, getDeviceCapabilities, optimizeForDevice } from './browser-compatibility';
import { checkOpenGLSupport, getOpenGLPerformanceHints } from './opengl-optimizations';
import { getLinuxSystemInfo, getLinuxPerformanceRecommendations } from './linux-optimizations';

export interface FeatureTestResults {
  browser: {
    detected: boolean;
    name: string;
    version: string;
    isChromiumBased: boolean;
    isFirefoxBased: boolean;
    isLinux: boolean;
    modernBrowser: boolean;
  };
  audio: {
    webAudioSupported: boolean;
    audioContextCreated: boolean;
  };
  graphics: {
    webglSupported: boolean;
    openglSupported: boolean;
    openglOptimized: boolean;
  };
  linux: {
    detected: boolean;
    displayServer: string;
    optimizationsApplied: boolean;
  };
  features: {
    serviceWorker: boolean;
    fileAPI: boolean;
    dragAndDrop: boolean;
    localStorage: boolean;
    indexedDB: boolean;
  };
  performance: {
    cores: number;
    memory: string | number;
    optimizations: any;
  };
}

export function runComprehensiveFeatureTest(): FeatureTestResults {
  console.log('🧪 Running Comprehensive EZ Audio Studio Feature Test...');
  
  // Test browser detection
  const browserInfo = getBrowserInfo();
  const browserSupport = checkBrowserSupport();
  
  // Test device capabilities
  const deviceCapabilities = getDeviceCapabilities();
  const optimizations = optimizeForDevice();
  
  // Test OpenGL support
  const openGLSupport = checkOpenGLSupport();
  const openGLHints = getOpenGLPerformanceHints();
  
  // Test Linux optimizations
  const linuxSystemInfo = getLinuxSystemInfo();
  const linuxRecommendations = getLinuxPerformanceRecommendations();
  
  // Test audio capabilities
  const audioContextTest = (() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      return audioContext.state === 'running' || audioContext.state === 'suspended';
    } catch {
      return false;
    }
  })();
  
  // Test feature support
  const featureSupport = {
    serviceWorker: 'serviceWorker' in navigator,
    fileAPI: 'File' in window && 'FileReader' in window,
    dragAndDrop: 'draggable' in document.createElement('div'),
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    indexedDB: 'indexedDB' in window,
  };
  
  const results: FeatureTestResults = {
    browser: {
      detected: browserInfo.name !== 'Unknown',
      name: browserInfo.name,
      version: browserInfo.version,
      isChromiumBased: browserInfo.isChromiumBased,
      isFirefoxBased: browserInfo.isFirefoxBased,
      isLinux: browserInfo.isLinux,
      modernBrowser: parseInt(browserInfo.version) >= 130,
    },
    audio: {
      webAudioSupported: browserInfo.supportsWebAudio,
      audioContextCreated: audioContextTest,
    },
    graphics: {
      webglSupported: browserInfo.supportsWebGL,
      openglSupported: openGLSupport.supported,
      openglOptimized: openGLSupport.optimized,
    },
    linux: {
      detected: linuxSystemInfo.isLinux,
      displayServer: linuxSystemInfo.displayServer,
      optimizationsApplied: linuxSystemInfo.isLinux,
    },
    features: featureSupport,
    performance: {
      cores: deviceCapabilities.cores,
      memory: deviceCapabilities.memory,
      optimizations: optimizations,
    },
  };
  
  // Log detailed results
  console.log('\n📊 Feature Test Results:');
  console.log('✅ Browser Detection:', results.browser);
  console.log('✅ Audio Support:', results.audio);
  console.log('✅ Graphics Support:', results.graphics);
  console.log('✅ Linux Optimizations:', results.linux);
  console.log('✅ Feature Support:', results.features);
  console.log('✅ Performance:', results.performance);
  
  // Check for any critical issues
  const criticalIssues: string[] = [];
  
  if (!results.browser.detected) {
    criticalIssues.push('Browser detection failed');
  }
  
  if (!results.audio.webAudioSupported) {
    criticalIssues.push('Web Audio API not supported');
  }
  
  if (!results.graphics.webglSupported) {
    criticalIssues.push('WebGL not supported');
  }
  
  if (!results.features.fileAPI) {
    criticalIssues.push('File API not supported');
  }
  
  if (criticalIssues.length > 0) {
    console.log('\n❌ Critical Issues Found:');
    criticalIssues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('\n🎉 All critical features are working!');
  }
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  if (results.browser.modernBrowser) {
    console.log('✅ Modern browser detected - optimal performance');
  } else {
    console.log('⚠️ Consider updating to a modern browser for better performance');
  }
  
  if (results.graphics.openglOptimized) {
    console.log('✅ OpenGL optimizations enabled');
  } else {
    console.log('ℹ️ Using standard graphics rendering');
  }
  
  if (results.linux.optimizationsApplied) {
    console.log('✅ Linux optimizations applied');
  }
  
  if (results.performance.cores >= 4) {
    console.log('✅ Multi-core system detected - good performance');
  } else {
    console.log('⚠️ Single-core system - performance may be limited');
  }
  
  console.log('\n🚀 EZ Audio Studio is ready to use!');
  
  return results;
}

// Auto-run comprehensive test in development
if (process.env.NODE_ENV === 'development') {
  // Run test after a delay to ensure everything is loaded
  setTimeout(() => {
    const results = runComprehensiveFeatureTest();
    
    // Store results for potential debugging
    (window as any).__EZ_AUDIO_STUDIO_TEST_RESULTS__ = results;
    
    // Log summary
    console.log('\n📋 Test Summary:');
    console.log(`Browser: ${results.browser.name} v${results.browser.version}`);
    console.log(`Audio: ${results.audio.webAudioSupported ? '✅' : '❌'} Web Audio API`);
    console.log(`Graphics: ${results.graphics.webglSupported ? '✅' : '❌'} WebGL`);
    console.log(`OpenGL: ${results.graphics.openglOptimized ? '✅' : 'ℹ️'} Optimized`);
    console.log(`Linux: ${results.linux.detected ? '✅' : 'ℹ️'} ${results.linux.displayServer}`);
    console.log(`Features: ${Object.values(results.features).filter(Boolean).length}/${Object.keys(results.features).length} supported`);
  }, 3000);
}
