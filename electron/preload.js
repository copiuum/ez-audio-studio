const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('save-file-dialog', defaultName),
  
  // Menu events
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuExportFile: (callback) => ipcRenderer.on('menu-export-file', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Platform info
  platform: process.platform,
  
  // App info
  appVersion: process.env.npm_package_version || '1.0.0'
});
