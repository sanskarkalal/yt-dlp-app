const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const YTDLP = "/opt/homebrew/bin/yt-dlp";
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const proc = spawn(YTDLP, [
  "--dump-json",
  "--no-playlist",
  "--cookies-from-browser",
  "chrome",
  url,
]);

let activeDownload = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-video-info", async (_, url) => {
  return new Promise((resolve, reject) => {
    let output = "";
    const proc = spawn(YTDLP, ["--dump-json", "--no-playlist", url]);
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => console.error(d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error("Failed to fetch video info"));
      try {
        const data = JSON.parse(output);
        const seen = new Set();
        const formats = [];

        const merged = data.formats
          .filter((f) => f.vcodec !== "none" && f.acodec !== "none" && f.height)
          .sort((a, b) => b.height - a.height);

        for (const f of merged) {
          const key = `${f.height}`;
          if (!seen.has(key)) {
            seen.add(key);
            const vbr = f.vbr
              ? Math.round(f.vbr)
              : f.tbr
                ? Math.round(f.tbr)
                : null;
            const abr = f.abr ? Math.round(f.abr) : null;
            formats.push({
              format_id: f.format_id,
              label:
                `${f.height}p${f.fps >= 60 ? ` ${f.fps}fps` : ""} · ${vbr ? vbr + " kbps" : ""} ${f.ext?.toUpperCase() || ""}`.trim(),
              resolution: `${f.width}×${f.height}`,
              vbitrate: vbr,
              abitrate: abr,
              fps: f.fps,
            });
          }
        }

        const videoOnly = data.formats
          .filter((f) => f.vcodec !== "none" && f.acodec === "none" && f.height)
          .sort((a, b) => b.height - a.height);

        const seenSplit = new Set();
        for (const f of videoOnly) {
          const key = `${f.height}-split`;
          if (!seenSplit.has(key)) {
            seenSplit.add(key);
            const vbr = f.vbr
              ? Math.round(f.vbr)
              : f.tbr
                ? Math.round(f.tbr)
                : null;
            formats.push({
              format_id: `bestvideo[height=${f.height}]+bestaudio`,
              label:
                `${f.height}p${f.fps >= 60 ? ` ${f.fps}fps` : ""} · ${vbr ? vbr + " kbps" : ""} (best quality)`.trim(),
              resolution: `${f.width}×${f.height}`,
              vbitrate: vbr,
              fps: f.fps,
            });
          }
        }

        resolve({
          title: data.title,
          thumbnail: data.thumbnail,
          duration: data.duration,
          uploader: data.uploader,
          formats,
        });
      } catch (e) {
        reject(new Error("Failed to parse video info"));
      }
    });
  });
});

ipcMain.handle("select-folder", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    defaultPath: path.join(os.homedir(), "Downloads"),
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("get-downloads-path", () => {
  return path.join(os.homedir(), "Downloads");
});

ipcMain.handle(
  "download",
  async (event, { url, formatId, container, savePath }) => {
    return new Promise((resolve, reject) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const args = [
        "-f",
        formatId,
        "--merge-output-format",
        container,
        "--ffmpeg-location",
        FFMPEG,
        "--cookies-from-browser",
        "chrome",
        "-o",
        path.join(savePath, "%(title)s.%(ext)s"),
        "--newline",
        url,
      ];
      const proc = spawn(YTDLP, args);
      activeDownload = proc;
      proc.stdout.on("data", (data) => {
        const line = data.toString();
        console.log(line);
        const match = line.match(/\[download\]\s+([\d.]+)%/);
        if (match) {
          const percent = Math.round(parseFloat(match[1]));
          win.webContents.send("download-progress", percent);
        }
      });
      proc.stderr.on("data", (d) => console.error(d.toString()));
      proc.on("close", (code) => {
        activeDownload = null;
        if (code === 0) resolve();
        else reject(new Error(code === null ? "cancel" : "Download failed"));
      });
    });
  },
);

ipcMain.handle("cancel-download", () => {
  if (activeDownload) {
    activeDownload.kill("SIGTERM");
    activeDownload = null;
  }
});
