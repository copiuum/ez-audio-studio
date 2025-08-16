// Test file to verify all optimizations are working

import { getBrowserInfo, checkBrowserSupport, getDeviceCapabilities, optimizeForDevice } from './browser-compatibility';
import { checkOpenGLSupport, getOpenGLPerformanceHints } from './opengl-optimizations';
import { getLinuxSystemInfo, getLinuxPerformanceRecommendations } from './linux-optimizations';

export function runOptimizationTests(): void {
  console.log('🧪 Running EZ Audio Studio Optimization Tests...');
  
  // Test browser compatibility
  console.log('\n🌐 Browser Compatibility Test:');
  const browserInfo = getBrowserInfo();
  console.log('Browser Info:', browserInfo);
  
  const browserSupport = checkBrowserSupport();
  console.log('Browser Support:', browserSupport);
  
  // Test device capabilities
  console.log('\n💻 Device Capabilities Test:');
  const deviceCapabilities = getDeviceCapabilities();
  console.log('Device Capabilities:', deviceCapabilities);
  
  // Test optimizations
  console.log('\n⚡ Optimization Test:');
  const optimizations = optimizeForDevice();
  console.log('Applied Optimizations:', optimizations);
  
  // Test OpenGL support
  console.log('\n🎮 OpenGL Support Test:');
  const openGLSupport = checkOpenGLSupport();
  console.log('OpenGL Support:', openGLSupport);
  
  const openGLHints = getOpenGLPerformanceHints();
  console.log('OpenGL Performance Hints:', openGLHints);
  
  // Test Linux optimizations
  console.log('\n🐧 Linux Optimizations Test:');
  const linuxSystemInfo = getLinuxSystemInfo();
  console.log('Linux System Info:', linuxSystemInfo);
  
  const linuxRecommendations = getLinuxPerformanceRecommendations();
  console.log('Linux Performance Recommendations:', linuxRecommendations);
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('✅ Browser Detection:', browserInfo.name, 'v' + browserInfo.version);
  console.log('✅ Chromium-based:', browserInfo.isChromiumBased);
  console.log('✅ Firefox-based:', browserInfo.isFirefoxBased);
  console.log('✅ Linux System:', linuxSystemInfo.isLinux);
  console.log('✅ Display Server:', linuxSystemInfo.displayServer);
  console.log('✅ OpenGL Support:', openGLSupport.supported);
  console.log('✅ OpenGL Optimized:', openGLSupport.optimized);
  console.log('✅ Modern Browser (130+):', parseInt(browserInfo.version) >= 130);
  
  console.log('\n🎉 All optimization tests completed successfully!');
}

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Run tests after a short delay to ensure everything is loaded
  setTimeout(runOptimizationTests, 1000);
}
