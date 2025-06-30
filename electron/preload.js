const { contextBridge, ipcRenderer } = require('electron');

// Expose OAuth functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // OAuth methods
  async oauthLogin() {
    return await ipcRenderer.invoke('oauth-login');
  },

  async oauthLogout() {
    return await ipcRenderer.invoke('oauth-logout');
  },

  async oauthStatus() {
    return await ipcRenderer.invoke('oauth-status');
  },

  async getOAuthToken() {
    return await ipcRenderer.invoke('get-oauth-token');
  },

  async setOAuthConfig(clientId, clientSecret) {
    return await ipcRenderer.invoke('set-oauth-config', { clientId, clientSecret });
  },

  async getOAuthConfig() {
    return await ipcRenderer.invoke('get-oauth-config');
  },

  // Listen for OAuth success
  onOAuthSuccess(callback) {
    ipcRenderer.on('oauth-success', (event, data) => {
      callback(data);
    });
  },

  // Remove OAuth success listener
  removeOAuthSuccess(callback) {
    ipcRenderer.removeListener('oauth-success', callback);
  },

  // Utility methods
  isElectron: true,
  platform: process.platform
}); 