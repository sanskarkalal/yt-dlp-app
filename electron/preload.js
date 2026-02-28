const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getVideoInfo: (url) => ipcRenderer.invoke("get-video-info", url),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  getDownloadsPath: () => ipcRenderer.invoke("get-downloads-path"),
  download: (opts) => ipcRenderer.invoke("download", opts),
  cancelDownload: () => ipcRenderer.invoke("cancel-download"),
  getCookiesStatus: () => ipcRenderer.invoke("get-cookies-status"),
  exportCookies: () => ipcRenderer.invoke("export-cookies"),
  onProgress: (cb) => {
    ipcRenderer.removeAllListeners("download-progress");
    ipcRenderer.on("download-progress", (_, percent) => cb(percent));
  },
  onCookiesStatus: (cb) => {
    ipcRenderer.removeAllListeners("cookies-status");
    ipcRenderer.on("cookies-status", (_, ok) => cb(ok));
  },
});
