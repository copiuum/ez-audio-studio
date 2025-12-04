// Tauri API wrapper that gracefully handles browser and Tauri environments

interface TauriCore {
  invoke: <T = unknown>(command: string, args?: Record<string, unknown>) => Promise<T>;
}

interface TauriEvent {
  listen: (event: string, handler: (event: unknown) => void) => Promise<() => void>;
}

type EventListener = (event: unknown) => void;

class TauriAPI {
  private listeners: Map<string, EventListener[]> = new Map();
  private isReady = false;
  private tauriCore: TauriCore | null = null;
  private tauriEvent: TauriEvent | null = null;

  private async ensureReady() {
    if (this.isReady) return;
    
    try {
      // Only import Tauri APIs when actually needed and if available
      if (typeof window !== 'undefined' && (window as { __TAURI__?: unknown }).__TAURI__) {
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

  async invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
    await this.ensureReady();
    if (!this.isReady || !this.tauriCore) {
      throw new Error('Tauri APIs not available in browser mode');
    }
    
    try {
      return await this.tauriCore.invoke(command, args);
    } catch (error) {
      console.error(`Failed to invoke Tauri command ${command}:`, error);
      throw error;
    }
  }

  async openFileDialog(): Promise<string[]> {
    return this.invoke('open_file_dialog');
  }

  async saveFileDialog(defaultName?: string): Promise<string | undefined> {
    return this.invoke('save_file_dialog', { defaultName });
  }

  async onMenuOpenFile(callback: () => void): Promise<void> {
    await this.ensureReady();
    if (!this.isReady || !this.tauriEvent) return;
    
    const unlisten = await this.tauriEvent.listen('menu-open-file', callback);
    this.addListener('menu-open-file', unlisten);
  }

  async onMenuExportFile(callback: () => void): Promise<void> {
    await this.ensureReady();
    if (!this.isReady || !this.tauriEvent) return;
    
    const unlisten = await this.tauriEvent.listen('menu-export-file', callback);
    this.addListener('menu-export-file', unlisten);
  }

  removeAllListeners(channel: string): void {
    const listeners = this.listeners.get(channel);
    if (listeners) {
      listeners.forEach(unlisten => unlisten());
      this.listeners.delete(channel);
    }
  }

  private addListener(channel: string, unlisten: () => void): void {
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

let tauriAPIInstance: TauriAPI | null = null;

export const getTauriAPI = (): TauriAPI => {
  if (!tauriAPIInstance) {
    tauriAPIInstance = new TauriAPI();
    if (typeof window !== 'undefined') {
      (window as { tauriAPI?: TauriAPI }).tauriAPI = tauriAPIInstance;
    }
  }
  return tauriAPIInstance;
};

export default getTauriAPI();
