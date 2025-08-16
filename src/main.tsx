import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeBrowserCompatibility } from './lib/browser-compatibility'

// Initialize browser compatibility checks
initializeBrowserCompatibility();

createRoot(document.getElementById("root")!).render(<App />);
