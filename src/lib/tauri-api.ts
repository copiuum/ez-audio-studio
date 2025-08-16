import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

class TauriAPI {
  private listeners: Map<string, UnlistenFn[]> = new Map();

  async openFileDialog(): Promise<string[]> {
    return await invoke('open_file_dialog');
  }

  async saveFileDialog(defaultName?: string): Promise<string | undefined> {
    const result = await invoke<string | null>('save_file_dialog', { defaultName });
    return result || undefined;
  }

  async onMenuOpenFile(callback: () => void): Promise<void> {
    const unlisten = await listen('menu-open-file', callback);
    this.addListener('menu-open-file', unlisten);
  }

  async onMenuExportFile(callback: () => void): Promise<void> {
    const unlisten = await listen('menu-export-file', callback);
    this.addListener('menu-export-file', unlisten);
  }

  removeAllListeners(channel: string): void {
    const listeners = this.listeners.get(channel);
    if (listeners) {
      listeners.forEach(unlisten => unlisten());
      this.listeners.delete(channel);
    }
  }

  private addListener(channel: string, unlisten: UnlistenFn): void {
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

// Create global instance
const tauriAPI = new TauriAPI();

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).tauriAPI = tauriAPI;
}

export default tauriAPI;