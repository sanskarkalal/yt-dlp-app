import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const treeKill = require("tree-kill");
import https from "node:https";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";

// ---------------------------------------------------------------------------
// Binary paths
// ---------------------------------------------------------------------------

function getBinariesDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, "bin");
  return path.join(__dirname, "..", "resources", "bin");
}

// ---------------------------------------------------------------------------
// Helper: ensure a unique file path by appending (1), (2), etc.
// Works for both thumbnails and video/audio files.
// ---------------------------------------------------------------------------
function getUniqueFilePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;
  const ext = path.extname(filePath);
  const base = filePath.slice(0, filePath.length - ext.length);
  let counter = 1;
  let candidate;
  do {
    candidate = `${base}_(${counter})${ext}`;
    counter++;
  } while (fs.existsSync(candidate));
  return candidate;
}

function sanitizeFilename(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();
}

function sanitizeOutputPath(filePath) {
  if (!filePath) return filePath;
  const normalized = path.normalize(filePath.trim());
  const dir = path.dirname(normalized);
  const ext = path.extname(normalized);
  const basename = path.basename(normalized, ext);
  const newName = sanitizeFilename(basename) + ext;
  const newPath = path.join(dir, newName);

  try {
    // Priority 1: fresh download exists at the original unicode/unsanitized path
    // Use readdirSync — fs.existsSync lies with emoji/unicode on macOS
    const dirFiles = fs.readdirSync(dir);
    const originalBasename = path.basename(normalized);
    const freshFile = dirFiles.find((f) => f === originalBasename);
    if (freshFile && path.join(dir, freshFile) !== newPath) {
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(path.join(dir, freshFile), newPath);
      console.log("[sanitize] renamed:", freshFile, "->", newName);
      return newPath;
    }

    // Priority 2: file already exists at the sanitized path (already clean)
    if (fs.existsSync(newPath)) {
      console.log("[sanitize] already clean:", newPath);
      return newPath;
    }

    // Priority 3: scan dir for a match (Windows unicode edge case)
    const actualFile = dirFiles.find((f) => {
      const fExt = path.extname(f);
      const fBase = path.basename(f, fExt);
      return sanitizeFilename(fBase) + fExt === newName;
    });
    if (actualFile) {
      const actualPath = path.join(dir, actualFile);
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(actualPath, newPath);
      console.log("[sanitize] renamed via scan:", actualFile, "->", newName);
    }

    return newPath;
  } catch (err) {
    console.error("[sanitize] failed:", err.message);
    return newPath;
  }
}

/** Path to the yt-dlp binary that ships inside the app bundle */
function getBundledYtDlpPath() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win", "yt-dlp.exe");
  if (isMac) return path.join(binDir, "mac", "yt-dlp");
  return path.join(binDir, "linux", "yt-dlp");
}

function getUpdatedYtDlpPath() {
  const dir = path.join(app.getPath("userData"), "bin");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, isWin ? "yt-dlp.exe" : "yt-dlp");
}

function getYtDlpPath() {
  const updated = getUpdatedYtDlpPath();
  if (fs.existsSync(updated)) return updated;
  return getBundledYtDlpPath();
}

function getFfmpegDir() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win");
  if (isMac) return path.join(binDir, "mac");
  return path.join(binDir, "linux");
}

// ---------------------------------------------------------------------------
// yt-dlp auto-update
// ---------------------------------------------------------------------------

function getUpdateStatePath() {
  return path.join(app.getPath("userData"), "yt-dlp-update-state.json");
}

function readUpdateState() {
  try {
    const raw = fs.readFileSync(getUpdateStatePath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return { lastChecked: 0 };
  }
}

function writeUpdateState(state) {
  try {
    fs.writeFileSync(
      getUpdateStatePath(),
      JSON.stringify(state, null, 2),
      "utf8",
    );
  } catch (err) {
    console.error("[update] Failed to write update state:", err.message);
  }
}

function getYtDlpVersion(binaryPath) {
  try {
    const out = execFileSync(binaryPath, ["--version"], {
      timeout: 10000,
      env: getYtDlpEnv(),
    });
    return out.toString().trim();
  } catch {
    return null;
  }
}

function fetchLatestYtDlpVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.github.com",
      path: "/repos/yt-dlp/yt-dlp/releases/latest",
      headers: { "User-Agent": "seedhe-download-app" },
    };
    const req = https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.tag_name || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = https.get(
      url,
      { headers: { "User-Agent": "seedhe-download-app" } },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          fs.unlink(destPath, () => {});
          return downloadFile(res.headers.location, destPath)
            .then(resolve)
            .catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      },
    );
    request.on("error", (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error("Download timed out"));
    });
  });
}

async function checkAndUpdateYtDlp() {
  try {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const state = readUpdateState();
    const now = Date.now();

    if (now - state.lastChecked < ONE_DAY_MS) {
      console.log("[update] Skipping check — last checked less than 24h ago");
      return;
    }

    console.log("[update] Checking for yt-dlp update...");

    const currentVersion = getYtDlpVersion(getYtDlpPath());
    console.log(
      "[update] Current yt-dlp version:",
      currentVersion ?? "(unknown)",
    );

    const latestVersion = await fetchLatestYtDlpVersion();
    console.log(
      "[update] Latest yt-dlp version:",
      latestVersion ?? "(could not fetch)",
    );

    if (!latestVersion) {
      console.log(
        "[update] Could not determine latest version — skipping update",
      );
      writeUpdateState({ ...state, lastChecked: now });
      return;
    }

    if (currentVersion && currentVersion === latestVersion) {
      console.log("[update] yt-dlp is already up to date");
      writeUpdateState({ lastChecked: now, currentVersion });
      return;
    }

    let downloadUrl;
    if (isWin) {
      downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${latestVersion}/yt-dlp.exe`;
    } else if (isMac) {
      downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${latestVersion}/yt-dlp_macos`;
    } else {
      downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${latestVersion}/yt-dlp`;
    }

    const destPath = getUpdatedYtDlpPath();
    const tempPath = destPath + ".tmp";

    console.log(`[update] Downloading yt-dlp ${latestVersion}...`);
    await downloadFile(downloadUrl, tempPath);

    if (!isWin) {
      fs.chmodSync(tempPath, 0o755);
    }

    const newVersion = getYtDlpVersion(tempPath);
    if (!newVersion) {
      fs.unlink(tempPath, () => {});
      console.error(
        "[update] Downloaded binary failed version check — aborting update",
      );
      return;
    }

    fs.renameSync(tempPath, destPath);
    console.log(
      `[update] yt-dlp updated successfully: ${currentVersion ?? "?"} → ${newVersion}`,
    );
    writeUpdateState({ lastChecked: now, currentVersion: newVersion });
  } catch (err) {
    console.error("[update] yt-dlp auto-update failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Cookies & auth helpers
// ---------------------------------------------------------------------------

const LEGACY_COOKIES_PATH = path.join(
  os.homedir(),
  "Documents",
  "yt-dlp-app",
  "cookies.txt",
);

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
    const cmd = [
      "@echo off",
      "set ELECTRON_RUN_AS_NODE=1",
      `"${process.execPath}" %*`,
      "",
    ].join("\r\n");
    fs.writeFileSync(shimPath, cmd, "utf8");
    return shimDir;
  }

  const shimPath = path.join(shimDir, "node");
  const escapedExecPath = process.execPath.replace(/"/g, '\\"');
  const script = [
    "#!/bin/sh",
    `ELECTRON_RUN_AS_NODE=1 exec "${escapedExecPath}" "$@"`,
    "",
  ].join("\n");
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
let cancelRequested = false;
let activeDownloadFiles = [];
let activeDownloadSavePath = null;

// ---------------------------------------------------------------------------
// Cleanup helper — called after process is confirmed dead
// ---------------------------------------------------------------------------
function cleanupPartialFiles(filesToDelete, fallbackDir) {
  const dirsToScan = new Set();
  if (fallbackDir) dirsToScan.add(fallbackDir);

  for (const filePath of filesToDelete) {
    for (const p of [filePath, filePath + ".part", filePath + ".ytdl"]) {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
          console.log("[cancel] deleted:", p);
        }
      } catch (e) {
        console.warn("[cancel] could not delete:", p, e.message);
      }
    }
    dirsToScan.add(path.dirname(filePath));
  }

  for (const dir of dirsToScan) {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (
          entry.includes(".part-Frag") ||
          entry.endsWith(".part") ||
          entry.endsWith(".ytdl")
        ) {
          const fragPath = path.join(dir, entry);
          const tryDelete = (retriesLeft) => {
            try {
              fs.unlinkSync(fragPath);
              console.log("[cancel] deleted:", entry);
            } catch (e) {
              if (e.code === "EBUSY" && retriesLeft > 0) {
                setTimeout(() => tryDelete(retriesLeft - 1), 500);
              } else {
                console.warn("[cancel] could not delete:", entry, e.message);
              }
            }
          };
          tryDelete(5);
        }
      }
    } catch (e) {
      console.warn("[cancel] could not scan dir:", dir, e.message);
    }
  }
}

function hasValidCookies(cookiePath) {
  if (!fs.existsSync(cookiePath)) return false;
  try {
    const content = fs.readFileSync(cookiePath, "utf8");
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.some((l) => !l.startsWith("#") && l.split("\t").length >= 7);
  } catch {
    return false;
  }
}

function hasLikelyYouTubeAuthCookies(cookies) {
  const authCookieNames = new Set([
    "SAPISID",
    "APISID",
    "SID",
    "HSID",
    "SSID",
    "__Secure-3PSID",
    "__Secure-1PSID",
  ]);
  return cookies.some((c) => authCookieNames.has(c.name));
}

function cookiesExist() {
  return (
    hasValidCookies(getCookiesPath()) || hasValidCookies(LEGACY_COOKIES_PATH)
  );
}

function cookieArgs() {
  if (hasValidCookies(getCookiesPath())) return ["--cookies", getCookiesPath()];
  if (hasValidCookies(LEGACY_COOKIES_PATH))
    return ["--cookies", LEGACY_COOKIES_PATH];
  return [];
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

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

  checkAndUpdateYtDlp();
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

// ---------------------------------------------------------------------------
// YouTube login window
// ---------------------------------------------------------------------------

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

    loginWin.loadURL(
      "https://accounts.google.com/signin/v2/identifier?service=youtube",
    );

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const tryPersistCookies = async () => {
      console.log("[auth] Attempting to extract cookies...");
      await loginWin.webContents.session.flushStorageData();
      const allSessionCookies = await loginWin.webContents.session.cookies.get(
        {},
      );
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
          lines.push(
            [
              domain,
              includeSubdomains,
              c.path || "/",
              secure,
              expiry,
              c.name,
              c.value,
            ].join("\t"),
          );
        }
        fs.writeFileSync(getCookiesPath(), lines.join("\n") + "\n", "utf8");
        console.log(
          `[auth] Wrote ${allCookies.length} cookies. Authenticated: ${authenticated}`,
        );
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
          if (result.authenticated) {
            finish(true);
            loginWin.close();
          }
        }
      } catch (err) {
        console.error("[auth] Failed to extract cookies:", err);
      }
    };

    loginWin.webContents.on("did-navigate", async (_e, navUrl) => {
      await maybeFinalizeAuth(navUrl);
    });
    loginWin.webContents.on("did-navigate-in-page", async (_e, navUrl) => {
      await maybeFinalizeAuth(navUrl);
    });
    loginWin.on("closed", async () => {
      if (settled) return;
      try {
        const result = await tryPersistCookies();
        finish(result.authenticated);
      } catch {
        finish(false);
      }
    });
  });
}

ipcMain.handle("open-youtube-login", async () => {
  const success = await openYouTubeLogin();
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send("cookies-status", success);
  return success;
});

ipcMain.handle("get-cookies-status", () => cookiesExist());

ipcMain.handle("clear-cookies", () => {
  const p = getCookiesPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
  if (fs.existsSync(LEGACY_COOKIES_PATH)) fs.unlinkSync(LEGACY_COOKIES_PATH);
  return true;
});

// ---------------------------------------------------------------------------
// IPC: Get Video Info
// ---------------------------------------------------------------------------

ipcMain.handle("get-video-info", async (_, url) => {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";
    const args = [
      "--dump-json",
      "--no-playlist",
      ...resolveJsRuntimeArgs(),
      ...cookieArgs(),
      url,
    ];
    const proc = spawn(getYtDlpPath(), args, { env: getYtDlpEnv() });

    proc.stdout.on("data", (d) => (output += d.toString()));
    proc.stderr.on("data", (d) => {
      errorOutput += d.toString();
      console.error(d.toString());
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start yt-dlp: ${err.message}`)),
    );
    proc.on("close", (code) => {
      if (code !== 0) {
        const isAgeRestricted =
          errorOutput.includes("Sign in to confirm your age") ||
          errorOutput.includes("age-restricted") ||
          errorOutput.includes("inappropriate for some users");
        if (isAgeRestricted) return resolve({ ageRestricted: true });
        const isBotDetected =
          errorOutput.includes("Sign in to confirm you") ||
          errorOutput.includes("confirm you're not a bot");
        if (isBotDetected) return resolve({ botDetected: true });
        return reject(new Error(`yt-dlp failed: ${errorOutput.slice(0, 300)}`));
      }
      try {
        const data = JSON.parse(output);
        const rawFormats = [];
        const allVideoFormats = data.formats
          .filter((f) => f.vcodec !== "none" && f.vcodec !== null && f.height)
          .sort(
            (a, b) =>
              b.height - a.height ||
              (b.vbr || b.tbr || 0) - (a.vbr || a.tbr || 0),
          );

        for (const f of allVideoFormats) {
          const codecFull = f.vcodec || "";
          const codecShort = codecFull.startsWith("avc")
            ? "H264"
            : codecFull.startsWith("hvc") || codecFull.startsWith("hev")
              ? "H265"
              : codecFull.startsWith("vp9")
                ? "VP9"
                : codecFull.startsWith("av01")
                  ? "AV1"
                  : codecFull.toUpperCase().slice(0, 6);
          const bitrate = f.vbr
            ? Math.round(f.vbr)
            : f.tbr
              ? Math.round(f.tbr)
              : null;
          const key = `${f.height}-${codecShort}-${bitrate}-${f.format_id}`;
          rawFormats.push({
            format_id: f.format_id,
            height: f.height,
            width: f.width,
            codec: codecShort,
            bitrate,
            fps: f.fps ? Math.round(f.fps) : null,
            ext: f.ext,
            key,
          });
        }

        const formats = [];
        const seen = new Set();
        for (const f of rawFormats) {
          const k = `${f.height}-${f.codec}-${f.bitrate}`;
          if (!seen.has(k)) {
            seen.add(k);
            formats.push(f);
          }
        }

        const audioTracks = [];
        const seenAudio = new Set();
        const allAudioFormats = data.formats.filter(
          (f) => f.acodec !== "none" && f.acodec != null && f.vcodec === "none",
        );

        for (const f of allAudioFormats) {
          const lang = f.language || null;
          const note = f.format_note || "";
          const abr = f.abr ? Math.round(f.abr) : null;
          const key = lang ? `lang:${lang}` : `${note}-${f.acodec}-${abr}`;
          if (!seenAudio.has(key)) {
            seenAudio.add(key);
            let label = "";
            if (lang) {
              try {
                label = new Intl.DisplayNames(["en"], { type: "language" }).of(
                  lang,
                );
              } catch {
                label = lang.toUpperCase();
              }
              if (note && note !== "Default") label += ` (${note})`;
            } else {
              label = note || (f.acodec || "").toUpperCase();
            }
            if (abr) label += ` · ${abr}kbps`;
            audioTracks.push({
              format_id: f.format_id,
              label,
              language: lang,
              abr,
            });
          }
        }

        const nativeExts = [
          ...new Set(rawFormats.map((f) => f.ext).filter(Boolean)),
        ];
        const availableContainers = [
          ...new Set([...nativeExts, "mp4", "mkv"]),
        ].sort();

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
      } catch (e) {
        reject(new Error("Failed to parse video info"));
      }
    });
  });
});

// ---------------------------------------------------------------------------
// IPC: Folder & paths
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// IPC: Thumbnail download
// ---------------------------------------------------------------------------

ipcMain.handle(
  "download-thumbnail",
  async (_, { thumbnailUrl, title, savePath }) => {
    return new Promise((resolve, reject) => {
      const sanitized = sanitizeFilename(title);
      const dest = getUniqueFilePath(path.join(savePath, `${sanitized}.jpg`));

      const doDownload = (url) => {
        const client = url.startsWith("https") ? https : http;
        const file = fs.createWriteStream(dest);
        client
          .get(url, (res) => {
            if (
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              file.close();
              fs.unlink(dest, () => {});
              return doDownload(res.headers.location);
            }
            res.pipe(file);
            file.on("finish", () => {
              file.close();
              resolve(dest);
            });
          })
          .on("error", (err) => {
            fs.unlink(dest, () => {});
            reject(err);
          });
      };

      doDownload(thumbnailUrl);
    });
  },
);

// ---------------------------------------------------------------------------
// IPC: Download
// ---------------------------------------------------------------------------

ipcMain.handle(
  "download",
  async (
    event,
    {
      url,
      formatId,
      container,
      height,
      savePath,
      clipStart,
      clipEnd,
      audioOnly,
      audioQuality,
      audioTrackId,
      audioContainer,
    },
  ) => {
    return new Promise((resolve, reject) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      let args;

      if (audioOnly) {
        const quality = audioQuality || "192";
        const trackSelector = audioTrackId || "bestaudio/best";
        const outFormat = audioContainer || "mp3";
        const baseName = `%(title)s [audio ${quality}k ${outFormat}].%(ext)s`;
        args = [
          "-f",
          trackSelector,
          "--extract-audio",
          "--audio-format",
          outFormat,
          "--audio-quality",
          `${quality}k`,
          "--ffmpeg-location",
          getFfmpegDir(),
          ...resolveJsRuntimeArgs(),
          ...cookieArgs(),
          ...(clipStart && clipEnd
            ? ["--download-sections", `*${clipStart}-${clipEnd}`]
            : []),
          "-o",
          path.join(savePath, baseName),
          "--newline",
          url,
        ];
      } else {
        args = [
          "-f",
          formatId,
          "--merge-output-format",
          container,
          "--ffmpeg-location",
          getFfmpegDir(),
          ...resolveJsRuntimeArgs(),
          ...cookieArgs(),
          ...(clipStart && clipEnd
            ? ["--download-sections", `*${clipStart}-${clipEnd}`]
            : []),
          "-o",
          path.join(
            savePath,
            clipStart && clipEnd
              ? `%(title)s [clip ${clipStart}-${clipEnd}].%(ext)s`
              : `%(title)s [${height}p ${container}].%(ext)s`,
          ),
          "--newline",
          url,
        ];
      }
      console.log(
        "[download] height:",
        height,
        "container:",
        container,
        "clipStart:",
        clipStart,
      );
      const proc = spawn(getYtDlpPath(), args, { env: getYtDlpEnv() });
      activeDownload = proc;
      activeDownloadSavePath = savePath;

      let downloadPhase = 0;
      let outputFilePath = null;

      proc.stdout.on("data", (data) => {
        const line = data.toString();
        console.log(line);

        const alreadyMatch = line.match(
          /\[download\] (.+) has already been downloaded/,
        );
        if (alreadyMatch)
          outputFilePath = path.normalize(alreadyMatch[1].trim());

        const destMatch = line.match(/\[download\] Destination:\s+(.+)/);
        if (destMatch) {
          outputFilePath = path.normalize(destMatch[1].trim());
          if (!activeDownloadFiles.includes(outputFilePath))
            activeDownloadFiles.push(outputFilePath);
          // pre-track .part variant — ffmpeg writes here before renaming
          const partPath = outputFilePath + ".part";
          if (!activeDownloadFiles.includes(partPath))
            activeDownloadFiles.push(partPath);
        }

        const mergeMatch = line.match(/\[Merger\] Merging formats into "(.+)"/);
        if (mergeMatch) {
          outputFilePath = path.normalize(mergeMatch[1].trim());
          if (!activeDownloadFiles.includes(outputFilePath))
            activeDownloadFiles.push(outputFilePath);
        }

        const audioMatch = line.match(/\[ExtractAudio\] Destination:\s+(.+)/);
        if (audioMatch) {
          outputFilePath = path.normalize(audioMatch[1].trim());
          if (!activeDownloadFiles.includes(outputFilePath))
            activeDownloadFiles.push(outputFilePath);
        }

        if (line.includes("[download] Destination:")) {
          downloadPhase = (downloadPhase || 0) + 1;
        }
        if (line.includes("[Merger]") || line.includes("[ExtractAudio]")) {
          win.webContents.send("download-progress", 95);
        }

        const match = line.match(/\[download\]\s+([\d.]+)%/);
        if (match) {
          const pct = parseFloat(match[1]);
          let scaled;
          if (downloadPhase <= 1) {
            scaled = Math.round(pct * 0.5);
          } else {
            scaled = Math.round(50 + pct * 0.45);
          }
          win.webContents.send("download-progress", scaled);
        }
      });

      proc.stderr.on("data", (d) => console.error(d.toString()));

      proc.on("error", (err) => {
        activeDownload = null;
        activeDownloadFiles = [];
        activeDownloadSavePath = null;
        cancelRequested = false;
        reject(new Error(`Failed to start yt-dlp: ${err.message}`));
      });

      proc.on("close", (code) => {
        activeDownload = null;
        console.log(
          "[download] proc closed, code:",
          code,
          "cancelRequested:",
          cancelRequested,
        );
        console.log("[download] final outputFilePath:", outputFilePath);

        if (code === 0 && !cancelRequested) {
          // Success path
          if (!outputFilePath) {
            try {
              const files = fs
                .readdirSync(savePath)
                .map((f) => ({
                  name: f,
                  t: fs.statSync(path.join(savePath, f)).mtimeMs,
                }))
                .sort((a, b) => b.t - a.t);
              if (files.length > 0)
                outputFilePath = path.join(savePath, files[0].name);
            } catch {}
          }
          activeDownloadFiles = [];
          activeDownloadSavePath = null;
          outputFilePath = sanitizeOutputPath(outputFilePath);
          resolve({ filePath: outputFilePath });
        } else if (cancelRequested || code === null) {
          // Cancel path — process is fully dead, safe to delete files now
          cancelRequested = false;
          const filesToDelete = [...activeDownloadFiles];
          activeDownloadFiles = [];
          const savePathForCleanup = activeDownloadSavePath;
          activeDownloadSavePath = null;
          cleanupPartialFiles(filesToDelete, savePathForCleanup);
          resolve({ cancelled: true });
        } else {
          // Error path
          cancelRequested = false;
          activeDownloadFiles = [];
          activeDownloadSavePath = null;
          reject(new Error("Download failed"));
        }
      });
    });
  },
);

// ---------------------------------------------------------------------------
// IPC: Cancel download
// ---------------------------------------------------------------------------

ipcMain.handle("cancel-download", () => {
  console.log("[cancel] handler called, activeDownload:", !!activeDownload);
  if (activeDownload) {
    cancelRequested = true;
    const pid = activeDownload.pid;
    activeDownload = null;
    console.log("[cancel] killing pid:", pid);
    // treeKill handles both macOS and Windows — kills entire process tree
    treeKill(pid, "SIGKILL", (err) => {
      if (err) console.warn("[cancel] treeKill error:", err.message);
      else console.log("[cancel] process tree killed");
    });
    // Cleanup happens in proc.on("close") once the process is confirmed dead
  }
});

// ---------------------------------------------------------------------------
// IPC: History
// ---------------------------------------------------------------------------

ipcMain.handle("get-history", () => {
  const p = getHistoryPath();
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return [];
  }
});

ipcMain.handle("add-history", (_, entry) => {
  const p = getHistoryPath();
  let history = [];
  if (fs.existsSync(p)) {
    try {
      history = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {}
  }
  history.unshift({ ...entry, id: Date.now() });
  if (history.length > 200) history = history.slice(0, 200);
  fs.writeFileSync(p, JSON.stringify(history, null, 2), "utf8");
  return true;
});

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

ipcMain.handle("clear-history", () => {
  const p = getHistoryPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
  return true;
});

// ---------------------------------------------------------------------------
// IPC: File system helpers
// ---------------------------------------------------------------------------

ipcMain.handle("show-in-folder", (_, filePath) => {
  try {
    if (!filePath) {
      shell.openPath(os.homedir());
      return true;
    }

    const normalized = path.normalize(filePath.trim());
    console.log("[show-in-folder] path:", normalized);
    console.log("[show-in-folder] exists:", fs.existsSync(normalized));

    if (fs.existsSync(normalized)) {
      if (isWin) {
        try {
          const proc = spawn("explorer.exe", [`/select,${normalized}`], {
            detached: true,
            stdio: "ignore",
          });
          proc.unref();
        } catch (err) {
          console.error("[show-in-folder] spawn error:", err.message);
          shell.openPath(path.dirname(normalized));
        }
      } else {
        shell.showItemInFolder(normalized);
      }
    } else {
      const dir = path.dirname(normalized);
      shell.openPath(fs.existsSync(dir) ? dir : os.homedir());
    }
  } catch (err) {
    console.error("[show-in-folder] Error:", err);
    shell.openPath(os.homedir());
  }
  return true;
});

ipcMain.handle("delete-file", (_, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      shell.trashItem(filePath);
    }
  } catch (err) {
    console.error("[delete-file] Error:", err);
  }
  return true;
});
