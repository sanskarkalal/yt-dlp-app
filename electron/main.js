const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");

// --- Cross-platform binary detection ---
function findBinary(name) {
  const isWin = process.platform === "win32";
  const candidates = isWin
    ? [
        `C:\\yt-dlp\\${name}.exe`,
        path.join(
          os.homedir(),
          `AppData\\Local\\Programs\\${name}\\${name}.exe`,
        ),
        `C:\\Program Files\\${name}\\${name}.exe`,
        path.join(os.homedir(), `scoop\\shims\\${name}.exe`),
        `C:\\ProgramData\\chocolatey\\bin\\${name}.exe`,
        `${name}.exe`,
      ]
    : [
        `/opt/homebrew/bin/${name}`,
        `/usr/local/bin/${name}`,
        `/usr/bin/${name}`,
        name,
      ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return isWin ? `${name}.exe` : name;
}

const YTDLP = findBinary("yt-dlp");
const FFMPEG_DIR = path.dirname(findBinary("ffmpeg"));
const COOKIES_PATH = path.join(
  os.homedir(),
  "Documents",
  "yt-dlp-app",
  "cookies.txt",
);

console.log("[paths] yt-dlp:", YTDLP);
console.log("[paths] ffmpeg dir:", FFMPEG_DIR);

let activeDownload = null;

function cookiesExist() {
  return fs.existsSync(COOKIES_PATH);
}

function cookieArgs() {
  return cookiesExist() ? ["--cookies", COOKIES_PATH] : [];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
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

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  if (!cookiesExist()) exportCookies(win);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- Export Cookies ---
function exportCookies(win) {
  return new Promise((resolve) => {
    console.log("[cookies] Exporting cookies from Chrome...");
    const proc = spawn(YTDLP, [
      "--cookies-from-browser",
      "chrome",
      "--cookies",
      COOKIES_PATH,
      "--skip-download",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ]);
    proc.stderr.on("data", (d) => console.error("[cookies]", d.toString()));
    proc.on("close", (code) => {
      const success = code === 0 && cookiesExist();
      console.log("[cookies] Export", success ? "succeeded" : "failed");
      if (win && !win.isDestroyed())
        win.webContents.send("cookies-status", success);
      resolve(success);
    });
  });
}

ipcMain.handle("get-cookies-status", () => cookiesExist());

ipcMain.handle("export-cookies", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return exportCookies(win);
});

// --- Get Video Info ---
ipcMain.handle("get-video-info", async (_, url) => {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";
    const proc = spawn(YTDLP, [
      "--dump-json",
      "--no-playlist",
      ...cookieArgs(),
      url,
    ]);
    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => {
      errorOutput += d.toString();
      console.error(d.toString());
    });
    proc.on("close", (code) => {
      if (code !== 0)
        return reject(new Error(`yt-dlp failed: ${errorOutput.slice(0, 300)}`));
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

// --- Select Folder ---
ipcMain.handle("select-folder", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
    defaultPath: path.join(os.homedir(), "Downloads"),
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("get-downloads-path", () =>
  path.join(os.homedir(), "Downloads"),
);

// --- Download ---
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
        FFMPEG_DIR,
        ...cookieArgs(),
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
        if (match)
          win.webContents.send(
            "download-progress",
            Math.round(parseFloat(match[1])),
          );
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

// --- Cancel Download ---
ipcMain.handle("cancel-download", () => {
  if (activeDownload) {
    activeDownload.kill("SIGTERM");
    activeDownload = null;
  }
});
