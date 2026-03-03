import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { spawn } from "node:child_process";
import https from "node:https";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";

function getBinariesDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, "bin");
  return path.join(__dirname, "..", "resources", "bin");
}

function getYtDlpPath() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win", "yt-dlp.exe");
  if (isMac) return path.join(binDir, "mac", "yt-dlp");
  return path.join(binDir, "linux", "yt-dlp");
}

function getFfmpegDir() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win");
  if (isMac) return path.join(binDir, "mac");
  return path.join(binDir, "linux");
}

const LEGACY_COOKIES_PATH = path.join(os.homedir(), "Documents", "yt-dlp-app", "cookies.txt");

function getCookiesPath() {
  return path.join(app.getPath("userData"), "cookies.txt");
}

function getHistoryPath() {
  return path.join(app.getPath("userData"), "history.json");
}

function resolveJsRuntimeArgs() {
  return ["--js-runtimes", "node"];
}

function getRuntimeShimDir() {
  return path.join(app.getPath("userData"), "runtime-shims");
}

function ensureNodeShim() {
  const shimDir = getRuntimeShimDir();
  if (!fs.existsSync(shimDir)) fs.mkdirSync(shimDir, { recursive: true });

  if (isWin) {
    const shimPath = path.join(shimDir, "node.cmd");
    const cmd = ["@echo off", "set ELECTRON_RUN_AS_NODE=1", `"${process.execPath}" %*`, ""].join("\r\n");
    fs.writeFileSync(shimPath, cmd, "utf8");
    return shimDir;
  }

  const shimPath = path.join(shimDir, "node");
  const escapedExecPath = process.execPath.replace(/"/g, '\\"');
  const script = ["#!/bin/sh", `ELECTRON_RUN_AS_NODE=1 exec "${escapedExecPath}" "$@"`, ""].join("\n");
  fs.writeFileSync(shimPath, script, "utf8");
  fs.chmodSync(shimPath, 0o755);
  return shimDir;
}

function getYtDlpEnv() {
  const shimDir = ensureNodeShim();
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    PATH: `${shimDir}${path.delimiter}${process.env.PATH || ""}`,
  };
}

let activeDownload = null;
let mainWindow = null;

function hasValidCookies(cookiePath) {
  if (!fs.existsSync(cookiePath)) return false;
  try {
    const content = fs.readFileSync(cookiePath, "utf8");
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.some((l) => !l.startsWith("#") && l.split("\t").length >= 7);
  } catch { return false; }
}

function hasLikelyYouTubeAuthCookies(cookies) {
  const authCookieNames = new Set(["SAPISID","APISID","SID","HSID","SSID","__Secure-3PSID","__Secure-1PSID"]);
  return cookies.some((c) => authCookieNames.has(c.name));
}

function cookiesExist() {
  return hasValidCookies(getCookiesPath()) || hasValidCookies(LEGACY_COOKIES_PATH);
}

function cookieArgs() {
  if (hasValidCookies(getCookiesPath())) return ["--cookies", getCookiesPath()];
  if (hasValidCookies(LEGACY_COOKIES_PATH)) return ["--cookies", LEGACY_COOKIES_PATH];
  return [];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    title: "Seedhe Download",
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return mainWindow;
}

app.whenReady().then(() => {
  const win = createWindow();
  win.setMenu(null);
  const cookiesDir = path.dirname(getCookiesPath());
  if (!fs.existsSync(cookiesDir)) fs.mkdirSync(cookiesDir, { recursive: true });
  console.log("[bin] yt-dlp path:", getYtDlpPath());
  console.log("[bin] yt-dlp exists:", fs.existsSync(getYtDlpPath()));
});

app.on("window-all-closed", () => { if (!isMac) app.quit(); });

// --- YouTube Login Window ---
function openYouTubeLogin() {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 500,
      height: 650,
      title: "Sign in to YouTube",
      parent: mainWindow,
      modal: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });

    loginWin.loadURL("https://accounts.google.com/signin/v2/identifier?service=youtube");

    let settled = false;
    const finish = (ok) => { if (settled) return; settled = true; resolve(ok); };

    const tryPersistCookies = async () => {
      console.log("[auth] Attempting to extract cookies...");
      await loginWin.webContents.session.flushStorageData();
      const allSessionCookies = await loginWin.webContents.session.cookies.get({});
      const allCookies = allSessionCookies.filter((c) => {
        const d = c.domain.startsWith(".") ? c.domain : "." + c.domain;
        return d.includes(".google.com") || d.includes(".youtube.com");
      });

      const authenticated = hasLikelyYouTubeAuthCookies(allCookies);

      if (allCookies.length > 0) {
        const lines = ["# Netscape HTTP Cookie File"];
        for (const c of allCookies) {
          const domain = c.domain.startsWith(".") ? c.domain : "." + c.domain;
          const includeSubdomains = domain.startsWith(".") ? "TRUE" : "FALSE";
          const secure = c.secure ? "TRUE" : "FALSE";
          const expiry = c.expirationDate ? Math.floor(c.expirationDate) : 0;
          lines.push([domain, includeSubdomains, c.path || "/", secure, expiry, c.name, c.value].join("\t"));
        }
        fs.writeFileSync(getCookiesPath(), lines.join("\n") + "\n", "utf8");
        console.log(`[auth] Wrote ${allCookies.length} cookies. Authenticated: ${authenticated}`);
      }

      return { authenticated };
    };

    const maybeFinalizeAuth = async (navUrl) => {
      try {
        if (
          navUrl.includes("myaccount.google.com") ||
          navUrl.includes("youtube.com") ||
          navUrl.includes("accounts.google.com/signin/oauth") ||
          navUrl.includes("accounts.google.com/o/oauth2")
        ) {
          const result = await tryPersistCookies();
          if (result.authenticated) { finish(true); loginWin.close(); }
        }
      } catch (err) { console.error("[auth] Failed to extract cookies:", err); }
    };

    loginWin.webContents.on("did-navigate", async (_e, navUrl) => { await maybeFinalizeAuth(navUrl); });
    loginWin.webContents.on("did-navigate-in-page", async (_e, navUrl) => { await maybeFinalizeAuth(navUrl); });
    loginWin.on("closed", async () => {
      if (settled) return;
      try { const result = await tryPersistCookies(); finish(result.authenticated); }
      catch { finish(false); }
    });
  });
}

ipcMain.handle("open-youtube-login", async () => {
  const success = await openYouTubeLogin();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("cookies-status", success);
  return success;
});

ipcMain.handle("get-cookies-status", () => cookiesExist());

ipcMain.handle("clear-cookies", () => {
  const p = getCookiesPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
  if (fs.existsSync(LEGACY_COOKIES_PATH)) fs.unlinkSync(LEGACY_COOKIES_PATH);
  return true;
});

// --- Get Video Info ---
ipcMain.handle("get-video-info", async (_, url) => {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";
    const args = ["--dump-json", "--no-playlist", ...resolveJsRuntimeArgs(), ...cookieArgs(), url];
    const proc = spawn(getYtDlpPath(), args, { env: getYtDlpEnv() });

    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => { errorOutput += d.toString(); console.error(d.toString()); });
    proc.on("error", (err) => reject(new Error(`Failed to start yt-dlp: ${err.message}`)));
    proc.on("close", (code) => {
      if (code !== 0) {
        const isAgeRestricted =
          errorOutput.includes("Sign in to confirm your age") ||
          errorOutput.includes("age-restricted") ||
          errorOutput.includes("inappropriate for some users");
        if (isAgeRestricted) return resolve({ ageRestricted: true });
        return reject(new Error(`yt-dlp failed: ${errorOutput.slice(0, 300)}`));
      }
      try {
        const data = JSON.parse(output);
        const rawFormats = [];
        const allVideoFormats = data.formats
          .filter((f) => f.vcodec !== "none" && f.vcodec !== null && f.height)
          .sort((a, b) => b.height - a.height || (b.vbr || b.tbr || 0) - (a.vbr || a.tbr || 0));

        for (const f of allVideoFormats) {
          const codecFull = f.vcodec || "";
          const codecShort = codecFull.startsWith("avc") ? "H264"
            : codecFull.startsWith("hvc") || codecFull.startsWith("hev") ? "H265"
            : codecFull.startsWith("vp9") ? "VP9"
            : codecFull.startsWith("av01") ? "AV1"
            : codecFull.toUpperCase().slice(0, 6);
          const bitrate = f.vbr ? Math.round(f.vbr) : f.tbr ? Math.round(f.tbr) : null;
          const key = `${f.height}-${codecShort}-${bitrate}-${f.format_id}`;
          rawFormats.push({ format_id: f.format_id, height: f.height, width: f.width, codec: codecShort, bitrate, fps: f.fps ? Math.round(f.fps) : null, ext: f.ext, key });
        }

        const formats = [];
        const seen = new Set();
        for (const f of rawFormats) {
          const k = `${f.height}-${f.codec}-${f.bitrate}`;
          if (!seen.has(k)) { seen.add(k); formats.push(f); }
        }

        const audioTracks = [];
        const seenAudio = new Set();
        const allAudioFormats = data.formats.filter((f) => f.acodec !== "none" && f.acodec != null && f.vcodec === "none");

        for (const f of allAudioFormats) {
          const lang = f.language || null;
          const note = f.format_note || "";
          const abr = f.abr ? Math.round(f.abr) : null;
          const key = lang ? `lang:${lang}` : `${note}-${f.acodec}-${abr}`;
          if (!seenAudio.has(key)) {
            seenAudio.add(key);
            let label = "";
            if (lang) {
              try { label = new Intl.DisplayNames(["en"], { type: "language" }).of(lang); }
              catch { label = lang.toUpperCase(); }
              if (note && note !== "Default") label += ` (${note})`;
            } else { label = note || (f.acodec || "").toUpperCase(); }
            if (abr) label += ` · ${abr}kbps`;
            audioTracks.push({ format_id: f.format_id, label, language: lang, abr });
          }
        }

        const nativeExts = [...new Set(rawFormats.map((f) => f.ext).filter(Boolean))];
        const availableContainers = [...new Set([...nativeExts, "mp4", "mkv"])].sort();

        resolve({
          title: data.title,
          thumbnail: data.thumbnail,
          thumbnails: data.thumbnails || [],
          duration: data.duration,
          uploader: data.uploader,
          formats,
          rawFormats,
          audioTracks,
          availableContainers,
        });
      } catch (e) { reject(new Error("Failed to parse video info")); }
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

ipcMain.handle("get-downloads-path", () => path.join(os.homedir(), "Downloads"));

// --- Download Thumbnail ---
ipcMain.handle("download-thumbnail", async (_, { thumbnailUrl, title, savePath }) => {
  return new Promise((resolve, reject) => {
    const sanitized = title.replace(/[/\\?%*:|"<>]/g, "-").trim();
    const dest = path.join(savePath, `${sanitized}.jpg`);
    const file = fs.createWriteStream(dest);
    const client = thumbnailUrl.startsWith("https") ? https : http;
    client.get(thumbnailUrl, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(dest); });
    }).on("error", (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
});

// --- Download ---
ipcMain.handle("download", async (event, { url, formatId, container, savePath, clipStart, clipEnd, audioOnly, audioQuality, audioTrackId, audioContainer }) => {
  return new Promise((resolve, reject) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    let args;

    if (audioOnly) {
      const quality = audioQuality || "192";
      const trackSelector = audioTrackId || "bestaudio/best";
      const outFormat = audioContainer || "mp3";
      args = [
        "-f", trackSelector,
        "--extract-audio",
        "--audio-format", outFormat,
        "--audio-quality", `${quality}k`,
        "--ffmpeg-location", getFfmpegDir(),
        ...resolveJsRuntimeArgs(),
        ...cookieArgs(),
        ...(clipStart && clipEnd ? ["--download-sections", `*${clipStart}-${clipEnd}`, "--force-keyframes-at-cuts"] : []),
        "-o", path.join(savePath, "%(title)s.%(ext)s"),
        "--newline", url,
      ];
    } else {
      args = [
        "-f", formatId,
        "--merge-output-format", container,
        "--ffmpeg-location", getFfmpegDir(),
        ...resolveJsRuntimeArgs(),
        ...cookieArgs(),
        ...(clipStart && clipEnd ? ["--download-sections", `*${clipStart}-${clipEnd}`, "--force-keyframes-at-cuts"] : []),
        "-o", path.join(savePath, "%(title)s.%(ext)s"),
        "--newline", url,
      ];
    }

    const proc = spawn(getYtDlpPath(), args, { env: getYtDlpEnv() });
    activeDownload = proc;

    let outputFilePath = null;

    proc.stdout.on("data", (data) => {
      const line = data.toString();
      console.log(line);

      const destMatch = line.match(/\[download\] Destination:\s+(.+)/);
      if (destMatch) outputFilePath = destMatch[1].trim();

      const mergeMatch = line.match(/\[Merger\] Merging formats into "(.+)"/);
      if (mergeMatch) outputFilePath = mergeMatch[1].trim();

      const audioMatch = line.match(/\[ExtractAudio\] Destination:\s+(.+)/);
      if (audioMatch) outputFilePath = audioMatch[1].trim();

      const match = line.match(/\[download\]\s+([\d.]+)%/);
      if (match) {
        const percent = Math.round(parseFloat(match[1]));
        win.webContents.send("download-progress", percent);
      }
    });

    proc.stderr.on("data", (d) => console.error(d.toString()));
    proc.on("error", (err) => { activeDownload = null; reject(new Error(`Failed to start yt-dlp: ${err.message}`)); });
    proc.on("close", (code) => {
      activeDownload = null;
      if (code === 0) resolve({ filePath: outputFilePath });
      else reject(new Error(code === null ? "cancel" : "Download failed"));
    });
  });
});

ipcMain.handle("cancel-download", () => {
  if (activeDownload) { activeDownload.kill("SIGTERM"); activeDownload = null; }
});

// --- History: Get ---
ipcMain.handle("get-history", () => {
  const p = getHistoryPath();
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
});

// --- History: Add ---
ipcMain.handle("add-history", (_, entry) => {
  const p = getHistoryPath();
  let history = [];
  if (fs.existsSync(p)) { try { history = JSON.parse(fs.readFileSync(p, "utf8")); } catch {} }
  history.unshift({ ...entry, id: Date.now() });
  if (history.length > 200) history = history.slice(0, 200);
  fs.writeFileSync(p, JSON.stringify(history, null, 2), "utf8");
  return true;
});

// --- History: Delete single entry ---
ipcMain.handle("delete-history-entry", (_, id) => {
  const p = getHistoryPath();
  if (!fs.existsSync(p)) return true;
  try {
    let history = JSON.parse(fs.readFileSync(p, "utf8"));
    history = history.filter((e) => e.id !== id);
    fs.writeFileSync(p, JSON.stringify(history, null, 2), "utf8");
  } catch {}
  return true;
});

// --- History: Clear all ---
ipcMain.handle("clear-history", () => {
  const p = getHistoryPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
  return true;
});

// --- Show file in Finder/Explorer ---
ipcMain.handle("show-in-folder", (_, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    shell.openPath(filePath ? path.dirname(filePath) : os.homedir());
  }
  return true;
});

// --- Delete file from disk ---
ipcMain.handle("delete-file", (_, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      shell.trashItem(filePath); // moves to trash, not permanent delete
    }
  } catch (err) {
    console.error("[delete-file] Error:", err);
  }
  return true;
});