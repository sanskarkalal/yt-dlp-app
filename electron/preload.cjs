const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVideoInfo: (url) => ipcRenderer.invoke("get-video-info", url),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  getDownloadsPath: () => ipcRenderer.invoke("get-downloads-path"),
  download: (opts) => ipcRenderer.invoke("download", opts),
  cancelDownload: () => ipcRenderer.invoke("cancel-download"),
  getCookiesStatus: () => ipcRenderer.invoke("get-cookies-status"),
  openYouTubeLogin: (opts) => ipcRenderer.invoke("open-youtube-login", opts),
  clearCookies: () => ipcRenderer.invoke("clear-cookies"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppUpdateState: () => ipcRenderer.invoke("get-app-update-state"),
  checkForAppUpdate: () => ipcRenderer.invoke("check-for-app-update"),
  installAppUpdate: () => ipcRenderer.invoke("install-app-update"),
  onProgress: (cb) => {
    ipcRenderer.removeAllListeners("download-progress");
    ipcRenderer.on("download-progress", (_, percent) => cb(percent));
  },
  onAppUpdate: (cb) => {
    ipcRenderer.removeAllListeners("app-update");
    ipcRenderer.on("app-update", (_, state) => cb(state));
  },
  onCookiesStatus: (cb) => {
    ipcRenderer.removeAllListeners("cookies-status");
    ipcRenderer.on("cookies-status", (_, ok) => cb(ok));
  },
  downloadThumbnail: (opts) => ipcRenderer.invoke("download-thumbnail", opts),
  getHistory: () => ipcRenderer.invoke("get-history"),
  addHistory: (entry) => ipcRenderer.invoke("add-history", entry),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  deleteHistoryEntry: (id) => ipcRenderer.invoke("delete-history-entry", id),
  showInFolder: (filePath) => ipcRenderer.invoke("show-in-folder", filePath),
  deleteFile: (filePath) => ipcRenderer.invoke("delete-file", filePath),
});
