import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeBrowserCompatibility } from './lib/browser-compatibility'
import { initializeOpenGLOptimizations } from './lib/opengl-optimizations'
import { initializeLinuxOptimizations } from './lib/linux-optimizations'
import { runOptimizationTests } from './lib/test-optimizations'
import { runComprehensiveFeatureTest } from './lib/feature-test'
import { verifyAllFeatures } from './lib/verification'
import { setupNetworkSecurity } from './lib/network-security'

// Initialize network security (block external connections)
setupNetworkSecurity();

// Initialize browser compatibility checks
initializeBrowserCompatibility();

// Initialize OpenGL optimizations
initializeOpenGLOptimizations();

// Initialize Linux optimizations
initializeLinuxOptimizations();

// Run comprehensive feature tests and verification in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    runOptimizationTests();
    runComprehensiveFeatureTest();
    verifyAllFeatures();
  }, 2000);
}

createRoot(document.getElementById("root")!).render(<App />);
