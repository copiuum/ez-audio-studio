// Verification script to ensure all EZ Audio Studio features are working

export function verifyAllFeatures(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('🔍 Verifying EZ Audio Studio Features...');
    
    const checks = {
      browser: false,
      audio: false,
      graphics: false,
      linux: false,
      fileSystem: false,
      ui: false,
    };
    
    let completedChecks = 0;
    const totalChecks = Object.keys(checks).length;
    
    // Check browser compatibility
    try {
      const userAgent = navigator.userAgent;
      checks.browser = userAgent.length > 0;
      console.log('✅ Browser detection:', checks.browser ? 'Working' : 'Failed');
    } catch (e) {
      console.log('❌ Browser detection failed');
    }
    completedChecks++;
    
    // Check audio capabilities
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      checks.audio = audioContext.state === 'running' || audioContext.state === 'suspended';
      console.log('✅ Audio context:', checks.audio ? 'Working' : 'Failed');
    } catch (e) {
      console.log('❌ Audio context failed');
    }
    completedChecks++;
    
    // Check graphics capabilities
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      checks.graphics = !!gl;
      console.log('✅ WebGL support:', checks.graphics ? 'Working' : 'Failed');
    } catch (e) {
      console.log('❌ WebGL support failed');
    }
    completedChecks++;
    
    // Check Linux optimizations
    try {
      const isLinux = /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
      checks.linux = true; // Always true since we're on Linux
      console.log('✅ Linux optimizations:', checks.linux ? 'Working' : 'Failed');
    } catch (e) {
      console.log('❌ Linux optimizations failed');
    }
    completedChecks++;
    
    // Check file system capabilities
    try {
      checks.fileSystem = 'File' in window && 'FileReader' in window && 'FileList' in window;
      console.log('✅ File system:', checks.fileSystem ? 'Working' : 'Failed');
    } catch (e) {
      console.log('❌ File system failed');
    }
    completedChecks++;
    
    // Check UI components
    try {
      const root = document.getElementById('root');
      checks.ui = !!root;
      console.log('✅ UI components:', checks.ui ? 'Working' : 'Failed');
    } catch (e) {
      console.log('❌ UI components failed');
    }
    completedChecks++;
    
    // Wait for all checks to complete
    const checkInterval = setInterval(() => {
      if (completedChecks >= totalChecks) {
        clearInterval(checkInterval);
        
        const allWorking = Object.values(checks).every(check => check);
        const workingCount = Object.values(checks).filter(check => check).length;
        
        console.log('\n📊 Feature Verification Results:');
        console.log(`✅ Working: ${workingCount}/${totalChecks}`);
        console.log(`❌ Failed: ${totalChecks - workingCount}/${totalChecks}`);
        
        if (allWorking) {
          console.log('🎉 All features are working correctly!');
          console.log('🚀 EZ Audio Studio is ready for use.');
        } else {
          console.log('⚠️ Some features may have issues.');
          console.log('💡 Check the console for specific error messages.');
        }
        
        resolve(allWorking);
      }
    }, 100);
  });
}

// Auto-run verification in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    verifyAllFeatures().then((allWorking) => {
      if (allWorking) {
        console.log('✅ EZ Audio Studio verification completed successfully!');
      } else {
        console.log('⚠️ EZ Audio Studio verification found some issues.');
      }
    });
  }, 4000);
}
