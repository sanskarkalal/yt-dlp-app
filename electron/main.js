const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";

// --- Resolve bundled binary paths ---
function getBinariesDir() {
  if (app.isPackaged) {
    // In packaged app, resources are in process.resourcesPath
    return path.join(process.resourcesPath, "bin");
  } else {
    // In dev mode, use the resources folder in the project root
    return path.join(__dirname, "..", "resources", "bin");
  }
}

function getYtDlpPath() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win", "yt-dlp.exe");
  if (isMac) return path.join(binDir, "mac", "yt-dlp");
  return path.join(binDir, "linux", "yt-dlp"); // future-proofing
}

function getFfmpegDir() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win");
  if (isMac) return path.join(binDir, "mac");
  return path.join(binDir, "linux");
}

const COOKIES_PATH = path.join(
  os.homedir(),
  "Documents",
  "yt-dlp-app",
  "cookies.txt",
);

let activeDownload = null;

function cookiesExist() {
  return fs.existsSync(COOKIES_PATH);
}

function cookieArgs() {
  return cookiesExist() ? ["--cookies", COOKIES_PATH] : [];
}

// --- Detect which browser to use for cookies ---
function detectBrowser() {
  if (!isWin) return "chrome"; // On Mac, always use chrome

  const localAppData = process.env.LOCALAPPDATA || "";

  const browsers = [
    {
      name: "chrome",
      path: path.join(localAppData, "Google", "Chrome", "User Data"),
    },
    {
      name: "brave",
      path: path.join(
        localAppData,
        "BraveSoftware",
        "Brave-Browser",
        "User Data",
      ),
    },
    {
      name: "edge",
      path: path.join(localAppData, "Microsoft", "Edge", "User Data"),
    },
  ];

  for (const browser of browsers) {
    if (fs.existsSync(browser.path)) {
      console.log(`[cookies] Detected browser: ${browser.name}`);
      return browser.name;
    }
  }

  console.log("[cookies] No browser detected, defaulting to chrome");
  return "chrome";
}

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

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();

  // Ensure cookies directory exists
  const cookiesDir = path.dirname(COOKIES_PATH);
  if (!fs.existsSync(cookiesDir)) {
    fs.mkdirSync(cookiesDir, { recursive: true });
  }

  // Log binary paths for debugging
  console.log("[bin] yt-dlp path:", getYtDlpPath());
  console.log("[bin] ffmpeg dir:", getFfmpegDir());
  console.log("[bin] yt-dlp exists:", fs.existsSync(getYtDlpPath()));

  // Auto-export cookies on first launch
  if (!cookiesExist()) {
    exportCookies(win);
  }
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

// --- Export Cookies ---
function exportCookies(win) {
  return new Promise((resolve) => {
    const browser = detectBrowser();
    const ytDlp = getYtDlpPath();
    console.log(`[cookies] Exporting cookies from ${browser}...`);
    console.log(`[cookies] Using yt-dlp at: ${ytDlp}`);

    const proc = spawn(ytDlp, [
      "--cookies-from-browser",
      browser,
      "--cookies",
      COOKIES_PATH,
      "--skip-download",
      "https://www.youtube.com/robots.txt",
    ]);

    let stderrOutput = "";
    proc.stderr.on("data", (d) => {
      const msg = d.toString();
      stderrOutput += msg;
      console.error("[cookies]", msg);
    });

    proc.on("error", (err) => {
      console.error("[cookies] Failed to start yt-dlp:", err.message);
      if (win && !win.isDestroyed()) {
        win.webContents.send("cookies-status", false);
      }
      resolve(false);
    });

    proc.on("close", (code) => {
      const success = code === 0 && cookiesExist();
      console.log(
        "[cookies] Export",
        success ? "succeeded" : "failed",
        "code:",
        code,
      );
      if (!success) {
        console.error("[cookies] stderr:", stderrOutput.slice(0, 500));
      }
      if (win && !win.isDestroyed()) {
        win.webContents.send("cookies-status", success);
      }
      resolve(success);
    });
  });
}

// --- Check cookies status ---
ipcMain.handle("get-cookies-status", () => cookiesExist());

// --- Refresh cookies (user triggered) ---
ipcMain.handle("export-cookies", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return exportCookies(win);
});

// --- Get Video Info ---
ipcMain.handle("get-video-info", async (_, url) => {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";
    const args = ["--dump-json", "--no-playlist", ...cookieArgs(), url];
    const proc = spawn(getYtDlpPath(), args);

    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => {
      errorOutput += d.toString();
      console.error(d.toString());
    });
    proc.on("error", (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
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

// --- Get Downloads Path ---
ipcMain.handle("get-downloads-path", () => {
  return path.join(os.homedir(), "Downloads");
});

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
        getFfmpegDir(),
        ...cookieArgs(),
        "-o",
        path.join(savePath, "%(title)s.%(ext)s"),
        "--newline",
        url,
      ];

      const proc = spawn(getYtDlpPath(), args);
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

      proc.on("error", (err) => {
        activeDownload = null;
        reject(new Error(`Failed to start yt-dlp: ${err.message}`));
      });

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
