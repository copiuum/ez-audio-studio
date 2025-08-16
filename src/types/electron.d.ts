declare global {
  interface Window {
    electronAPI: {
      // File operations
      openFileDialog: () => Promise<string[]>;
      saveFileDialog: (defaultName?: string) => Promise<string | undefined>;
      
      // Menu events
      onMenuOpenFile: (callback: () => void) => void;
      onMenuExportFile: (callback: () => void) => void;
      
      // Remove listeners
      removeAllListeners: (channel: string) => void;
      
      // Platform info
      platform: string;
      
      // App info
      appVersion: string;
    };
  }
}

export {};
