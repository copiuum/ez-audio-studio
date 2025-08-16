// Tauri API wrapper that gracefully handles browser and Tauri environments
class TauriAPI {
  private listeners: Map<string, any[]> = new Map();
  private isReady = false;
  private tauriCore: any = null;
  private tauriEvent: any = null;

  private async ensureReady() {
    if (this.isReady) return;
    
    try {
      // Only import Tauri APIs when actually needed and if available
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const { listen } = await import('@tauri-apps/api/event');
        this.tauriCore = { invoke };
        this.tauriEvent = { listen };
        this.isReady = true;
      }
    } catch (error) {
      console.warn('Tauri APIs not available, running in browser mode');
    }
  }

  async openFileDialog(): Promise<string[]> {
    await this.ensureReady();
    if (!this.isReady || !this.tauriCore) {
      console.warn('File dialog not available in browser mode');
      return [];
    }
    
    try {
      return await this.tauriCore.invoke('open_file_dialog');
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      return [];
    }
  }

  async saveFileDialog(defaultName?: string): Promise<string | undefined> {
    await this.ensureReady();
    if (!this.isReady || !this.tauriCore) {
      console.warn('Save dialog not available in browser mode');
      return undefined;
    }
    
    try {
      const result = await this.tauriCore.invoke('save_file_dialog', { defaultName });
      return result || undefined;
    } catch (error) {
      console.error('Failed to open save dialog:', error);
      return undefined;
    }
  }

  async onMenuOpenFile(callback: () => void): Promise<void> {
    await this.ensureReady();
    if (!this.isReady || !this.tauriEvent) {
      console.warn('Menu events not available in browser mode');
      return;
    }
    
    try {
      const unlisten = await this.tauriEvent.listen('menu-open-file', callback);
      this.addListener('menu-open-file', unlisten);
    } catch (error) {
      console.error('Failed to listen for menu open event:', error);
    }
  }

  async onMenuExportFile(callback: () => void): Promise<void> {
    await this.ensureReady();
    if (!this.isReady || !this.tauriEvent) {
      console.warn('Menu events not available in browser mode');
      return;
    }
    
    try {
      const unlisten = await this.tauriEvent.listen('menu-export-file', callback);
      this.addListener('menu-export-file', unlisten);
    } catch (error) {
      console.error('Failed to listen for menu export event:', error);
    }
  }

  removeAllListeners(channel: string): void {
    const listeners = this.listeners.get(channel);
    if (listeners) {
      listeners.forEach(unlisten => {
        try {
          unlisten();
        } catch (error) {
          console.error('Failed to remove listener:', error);
        }
      });
      this.listeners.delete(channel);
    }
  }

  private addListener(channel: string, unlisten: any): void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)!.push(unlisten);
  }

  get platform(): string {
    return navigator.platform;
  }

  get appVersion(): string {
    return '1.0.0';
  }
}

// Create singleton instance
let tauriAPIInstance: TauriAPI | null = null;

export const getTauriAPI = (): TauriAPI => {
  if (!tauriAPIInstance) {
    tauriAPIInstance = new TauriAPI();
    
    // Make it available globally for backward compatibility
    if (typeof window !== 'undefined') {
      (window as any).tauriAPI = tauriAPIInstance;
    }
  }
  return tauriAPIInstance;
};

export default getTauriAPI();