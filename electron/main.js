import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import electronUpdaterPkg from "electron-updater";
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
const { autoUpdater } = electronUpdaterPkg;
const supportsAppAutoUpdate = isWin || isMac;
const APP_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const YTDLP_UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const GITHUB_OWNER = "sanskarkalal";
const GITHUB_REPO = "yt-dlp-app";
let appUpdateInterval = null;
let ytDlpUpdateInterval = null;
let appUpdateState = {
  status: "idle",
  message: "Not checked yet",
  updateAvailable: false,
  updateDownloaded: false,
  progress: 0,
  version: app.getVersion(),
};
let ytDlpStartupState = {
  active: false,
  message: "",
};
let ytDlpVersionForUi = "";

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
  let s = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_");

  s = s
    .replace(/[^A-Za-z0-9._()\- ]/g, "_")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[. ]+|[. ]+$/g, "")
    .trim();

  if (!s) s = "download";
  const winReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (winReserved.test(s)) s = `_${s}`;
  return s;
}

function sanitizeOutputPath(filePath, saveDir) {
  if (!filePath) return filePath;
  const normalized = path.normalize(filePath.trim());
  const dir = saveDir ? path.normalize(saveDir) : path.dirname(normalized);
  const ext = path.extname(normalized);
  const basename = path.basename(normalized, ext);
  const newName = sanitizeFilename(basename) + ext;
  const newPath = path.join(dir, newName);

  try {
    // Priority 1: fresh download exists at the original unicode/unsanitized path
    // Use readdirSync — fs.existsSync lies with emoji/unicode on macOS
    const dirFiles = fs.readdirSync(dir);
    const originalBasename = path.basename(normalized);

    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9.]/g, "");
    const freshFile = dirFiles.find((f) => {
      const fExt = path.extname(f);
      const fBase = path.basename(f, fExt);
      const fSanitized = sanitizeFilename(fBase) + fExt;
      return (
        f === originalBasename ||
        fSanitized === newName ||
        normalize(fSanitized) === normalize(newName)
      );
    });
    if (freshFile && path.join(dir, freshFile) !== newPath) {
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(path.join(dir, freshFile), newPath);
      return newPath;
    }

    // Priority 2: file already exists at the sanitized path (already clean)
    if (fs.existsSync(newPath)) {
      return newPath;
    }

    // Priority 3: scan dir for a match (Windows unicode edge case)
    // Priority 3: scan dir for a match — compare sanitized versions of both
    const actualFile = dirFiles.find((f) => {
      const fExt = path.extname(f);
      const fBase = path.basename(f, fExt);
      const sanitizedF = sanitizeFilename(fBase) + fExt;
      return sanitizedF === newName;
    });
    if (actualFile) {
      const actualPath = path.join(dir, actualFile);
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
      fs.renameSync(actualPath, newPath);
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

function getFfmpegBin() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win", "ffmpeg.exe");
  if (isMac) return path.join(binDir, "mac", "ffmpeg");
  return path.join(binDir, "linux", "ffmpeg");
}

function getFfprobeBin() {
  const binDir = getBinariesDir();
  if (isWin) return path.join(binDir, "win", "ffprobe.exe");
  if (isMac) return path.join(binDir, "mac", "ffprobe");
  return path.join(binDir, "linux", "ffprobe");
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

function setYtDlpVersionForUi(version) {
  const normalized = String(version || "").trim();
  if (normalized) ytDlpVersionForUi = normalized;
}

function getYtDlpVersionForUi() {
  if (ytDlpVersionForUi) return ytDlpVersionForUi;
  const cached = String(readUpdateState()?.currentVersion || "").trim();
  if (cached) {
    ytDlpVersionForUi = cached;
    return cached;
  }
  return null;
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

function fetchGitHubReleaseByTag(tag) {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`,
      headers: { "User-Agent": "seedhe-download-app" },
    };
    const req = https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) return resolve(null);
        try {
          resolve(JSON.parse(data));
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

function pickMacDmgAsset(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const dmgAssets = assets.filter(
    (a) =>
      typeof a?.name === "string" &&
      a.name.toLowerCase().endsWith(".dmg") &&
      typeof a?.browser_download_url === "string",
  );
  if (!dmgAssets.length) return null;

  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return (
    dmgAssets.find((a) => a.name.toLowerCase().includes(arch)) ||
    (arch === "arm64"
      ? dmgAssets.find((a) => a.name.toLowerCase().includes("universal"))
      : null) ||
    dmgAssets[0]
  );
}

function getMacInstallerScript() {
  return `#!/usr/bin/env bash
set -euo pipefail

DMG_PATH="$1"
APP_DEST="$2"
APP_PID="$3"
MOUNT_POINT="$(mktemp -d /tmp/seedhe-update-mount.XXXXXX)"

cleanup() {
  hdiutil detach "$MOUNT_POINT" -quiet >/dev/null 2>&1 || true
  rmdir "$MOUNT_POINT" >/dev/null 2>&1 || true
}
trap cleanup EXIT

while kill -0 "$APP_PID" >/dev/null 2>&1; do
  sleep 1
done

hdiutil attach "$DMG_PATH" -nobrowse -mountpoint "$MOUNT_POINT" -quiet
APP_SRC="$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" -print -quit)"
if [[ -z "\${APP_SRC:-}" ]]; then
  echo "No .app bundle found in DMG"
  exit 1
fi

if rm -rf "$APP_DEST" && ditto "$APP_SRC" "$APP_DEST"; then
  true
else
  osascript <<'APPLESCRIPT' "$APP_SRC" "$APP_DEST"
on run argv
  set appSrc to item 1 of argv
  set appDst to item 2 of argv
  set cmd to "rm -rf " & quoted form of appDst & " && ditto " & quoted form of appSrc & " " & quoted form of appDst
  do shell script cmd with administrator privileges
end run
APPLESCRIPT
fi

xattr -dr com.apple.quarantine "$APP_DEST" || true
open -n "$APP_DEST"
`;
}

async function installDownloadedMacUpdate(version) {
  const releaseVersion = String(version || "").trim();
  if (!releaseVersion) throw new Error("Missing update version");

  pushAppUpdateState({
    status: "installing",
    message: "Preparing macOS installer...",
  });

  const release = await fetchGitHubReleaseByTag(`v${releaseVersion}`);
  if (!release) {
    throw new Error(`Could not fetch release metadata for v${releaseVersion}`);
  }

  const dmgAsset = pickMacDmgAsset(release);
  if (!dmgAsset) throw new Error("No macOS DMG asset found for this release");

  const tempDir = path.join(app.getPath("temp"), "seedhe-updater");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const dmgPath = path.join(tempDir, String(dmgAsset.name).replace(/\s+/g, "-"));

  pushAppUpdateState({
    status: "installing",
    message: `Downloading installer ${releaseVersion}...`,
  });
  await downloadFile(dmgAsset.browser_download_url, dmgPath);

  const scriptPath = path.join(tempDir, "install-mac-update.sh");
  fs.writeFileSync(scriptPath, getMacInstallerScript(), "utf8");
  fs.chmodSync(scriptPath, 0o755);

  const appBundlePath = path.resolve(process.execPath, "../../..");
  const appBundleName = path.basename(appBundlePath);
  const targetAppPath = path.join("/Applications", appBundleName);

  spawn("bash", [scriptPath, dmgPath, targetAppPath, String(process.pid)], {
    detached: true,
    stdio: "ignore",
  }).unref();

  pushAppUpdateState({
    status: "installing",
    message: "Installing update and restarting...",
  });
  app.quit();
}

function buildRequestHeaders(url, isImage = false) {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = "";
  }
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  };
  if (isImage) headers.Accept = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";

  const needsYouTubeReferer =
    host.includes("ytimg.com") ||
    host.includes("youtube.com") ||
    host.includes("googlevideo.com") ||
    host.includes("ggpht.com");
  if (needsYouTubeReferer) headers.Referer = "https://www.youtube.com/";
  return headers;
}

function extFromContentType(contentType) {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("bmp")) return ".bmp";
  if (ct.includes("avif")) return ".avif";
  return ".jpg";
}

function fetchImageBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const client = String(url || "").startsWith("https") ? https : http;
    const req = client.get(
      url,
      { headers: buildRequestHeaders(url, true) },
      (res) => {
        const statusCode = Number(res.statusCode || 0);
        const location = res.headers.location;
        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          location &&
          redirectsLeft > 0
        ) {
          res.resume();
          const nextUrl = new URL(location, url).toString();
          return fetchImageBuffer(nextUrl, redirectsLeft - 1)
            .then(resolve)
            .catch(reject);
        }
        if (statusCode !== 200) {
          res.resume();
          return reject(new Error(`Thumbnail HTTP ${statusCode}`));
        }

        const contentType = String(res.headers["content-type"] || "");
        if (!contentType.toLowerCase().startsWith("image/")) {
          res.resume();
          return reject(new Error(`Thumbnail is not an image (${contentType || "unknown"})`));
        }

        const chunks = [];
        let totalBytes = 0;
        const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
        res.on("data", (chunk) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_IMAGE_BYTES) {
            req.destroy(new Error("Thumbnail too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            buffer: Buffer.concat(chunks),
            contentType,
          }),
        );
      },
    );
    req.on("error", reject);
    req.setTimeout(30000, () => req.destroy(new Error("Thumbnail download timed out")));
  });
}

async function checkAndUpdateYtDlp() {
  try {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const state = readUpdateState();
    const now = Date.now();
    setYtDlpVersionForUi(state.currentVersion);

    if (now - state.lastChecked < ONE_DAY_MS) {
      console.log("[update] Skipping check — last checked less than 24h ago");
      return;
    }

    console.log("[update] Checking for yt-dlp update...");

    const currentVersion = getYtDlpVersion(getYtDlpPath());
    setYtDlpVersionForUi(currentVersion);
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
      setYtDlpVersionForUi(currentVersion);
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
    setYtDlpVersionForUi(newVersion);
  } catch (err) {
    console.error("[update] yt-dlp auto-update failed:", err.message);
  }
}

function pushAppUpdateState(next) {
  appUpdateState = { ...appUpdateState, ...next };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app-update", appUpdateState);
  }
}

function pushYtDlpStartupState(next) {
  ytDlpStartupState = { ...ytDlpStartupState, ...next };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("yt-dlp-startup-status", ytDlpStartupState);
  }
}

async function checkForAppUpdate() {
  if (!supportsAppAutoUpdate || !app.isPackaged) {
    return {
      ok: false,
      reason: "App updates are only available in packaged macOS/Windows builds.",
    };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    pushAppUpdateState({
      status: "error",
      message: err?.message || "Failed to check for app updates",
    });
    return { ok: false, reason: err?.message || "Update check failed" };
  }
}

function initAppAutoUpdater() {
  if (!supportsAppAutoUpdate) {
    pushAppUpdateState({
      status: "unsupported",
      message: "Auto-update is only supported on macOS and Windows.",
    });
    return;
  }

  if (!app.isPackaged) {
    pushAppUpdateState({
      status: "development",
      message: "Auto-update is disabled in development builds.",
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.setFeedURL({
    provider: "github",
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  });

  autoUpdater.on("checking-for-update", () => {
    pushAppUpdateState({
      status: "checking",
      message: "Checking for updates...",
      progress: 0,
    });
  });

  autoUpdater.on("update-available", (info) => {
    pushAppUpdateState({
      status: "downloading",
      message: `Downloading version ${info?.version || "latest"}...`,
      updateAvailable: true,
      updateDownloaded: false,
      version: info?.version || app.getVersion(),
      progress: 0,
    });
  });

  autoUpdater.on("download-progress", (progressObj) => {
    pushAppUpdateState({
      status: "downloading",
      message: `Downloading update... ${Math.round(progressObj.percent || 0)}%`,
      progress: Number(progressObj.percent || 0),
    });
  });

  autoUpdater.on("update-not-available", () => {
    pushAppUpdateState({
      status: "up-to-date",
      message: "You are on the latest version.",
      updateAvailable: false,
      updateDownloaded: false,
      progress: 100,
      version: app.getVersion(),
    });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const nextVersion = info?.version || app.getVersion();
    pushAppUpdateState({
      status: "downloaded",
      message: `Version ${nextVersion} is ready. Restart to install.`,
      updateAvailable: true,
      updateDownloaded: true,
      progress: 100,
      version: nextVersion,
    });
  });

  autoUpdater.on("error", (err) => {
    pushAppUpdateState({
      status: "error",
      message: err?.message || "Auto-update error",
    });
  });

  checkForAppUpdate();
  appUpdateInterval = setInterval(
    checkForAppUpdate,
    APP_UPDATE_CHECK_INTERVAL_MS,
  );
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
  // Prepend bundled ffmpeg dir so yt-dlp always resolves ffmpeg from our
  // bundle — never from the system PATH. shimDir comes first for the node shim.
  const ffmpegDir = path.dirname(getFfmpegBin());
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    PATH: `${shimDir}${path.delimiter}${ffmpegDir}${path.delimiter}${process.env.PATH || ""}`,
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

function isLikelyIntermediateYtDlpFile(filePath) {
  const name = path.basename(String(filePath || ""));
  if (!name) return false;
  if (name.endsWith(".part") || name.endsWith(".ytdl")) return true;
  // yt-dlp temporary stream files often include stream ids like ".f137."
  return /\.f\d+\./i.test(name);
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

function normalizePathForShell(filePath) {
  if (!filePath || typeof filePath !== "string") return "";
  // Strip wrapping quotes + invisible/control characters that can break Explorer.
  const cleaned = filePath
    .replace(/^"(.*)"$/, "$1")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")
    .trim()
    .normalize("NFC");
  return path.normalize(cleaned);
}

function siteArgs(url) {
  const u = String(url || "").toLowerCase();

  // Some sites (notably PornHub) are strict about request headers for m3u8/API fetches.
  if (u.includes("pornhub.com")) {
    return [
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
      "--add-header",
      "Referer: https://www.pornhub.com/",
      "--add-header",
      "Origin: https://www.pornhub.com",
      "--extractor-retries",
      "5",
    ];
  }

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

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("app-update", appUpdateState);
    mainWindow.webContents.send("yt-dlp-startup-status", ytDlpStartupState);
  });

  // Some thumbnail CDNs block requests without browser-like headers.
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["http://*/*", "https://*/*"] },
    (details, callback) => {
      const reqHeaders = { ...(details.requestHeaders || {}) };
      if (details.resourceType === "image") {
        if (!reqHeaders["User-Agent"] && !reqHeaders["user-agent"]) {
          reqHeaders["User-Agent"] = buildRequestHeaders(details.url)["User-Agent"];
        }
        if (!reqHeaders.Referer && !reqHeaders.referer) {
          const referer = buildRequestHeaders(details.url).Referer;
          if (referer) reqHeaders.Referer = referer;
        }
      }
      callback({ requestHeaders: reqHeaders });
    },
  );

  return mainWindow;
}

app.whenReady().then(async () => {
  // Ensure bundled ffmpeg and ffprobe are executable
  if (!isWin) {
    for (const bin of [getFfmpegBin(), getFfprobeBin()]) {
      try {
        if (fs.existsSync(bin)) fs.chmodSync(bin, 0o755);
      } catch (e) {
        console.warn("[bin] could not chmod:", bin, e.message);
      }
    }
  }
  const win = createWindow();
  win.setMenu(null);

  const cookiesDir = path.dirname(getCookiesPath());
  if (!fs.existsSync(cookiesDir)) fs.mkdirSync(cookiesDir, { recursive: true });

  console.log("[bin] yt-dlp path:", getYtDlpPath());
  console.log("[bin] yt-dlp exists:", fs.existsSync(getYtDlpPath()));

  initAppAutoUpdater();
  const YTDLP_UPDATE_WAIT_MS = 12000;
  let startupWaitTimer = null;
  pushYtDlpStartupState({
    active: true,
    message: "Checking yt-dlp updates...",
  });
  try {
    await Promise.race([
      checkAndUpdateYtDlp().finally(() => {
        if (startupWaitTimer) clearTimeout(startupWaitTimer);
      }),
      new Promise((resolve) => {
        startupWaitTimer = setTimeout(() => {
          console.log(
            `[update] Continuing startup after ${YTDLP_UPDATE_WAIT_MS}ms timeout`,
          );
          resolve();
        }, YTDLP_UPDATE_WAIT_MS);
      }),
    ]);
  } catch (err) {
    console.warn("[update] Startup wait failed:", err?.message || err);
  } finally {
    pushYtDlpStartupState({ active: false, message: "" });
  }

  if (ytDlpUpdateInterval) clearInterval(ytDlpUpdateInterval);
  ytDlpUpdateInterval = setInterval(() => {
    checkAndUpdateYtDlp().catch((err) => {
      console.warn("[update] Scheduled yt-dlp check failed:", err?.message || err);
    });
  }, YTDLP_UPDATE_CHECK_INTERVAL_MS);
});

app.on("window-all-closed", () => {
  if (appUpdateInterval) {
    clearInterval(appUpdateInterval);
    appUpdateInterval = null;
  }
  if (ytDlpUpdateInterval) {
    clearInterval(ytDlpUpdateInterval);
    ytDlpUpdateInterval = null;
  }
  if (!isMac) app.quit();
});

// ---------------------------------------------------------------------------
// YouTube login window
// ---------------------------------------------------------------------------

function openYouTubeLogin(options = {}) {
  const fresh = Boolean(options?.fresh);
  return new Promise((resolve) => {
    if (fresh) {
      const p = getCookiesPath();
      if (fs.existsSync(p)) fs.unlinkSync(p);
      if (fs.existsSync(LEGACY_COOKIES_PATH)) fs.unlinkSync(LEGACY_COOKIES_PATH);
    }

    const partition = fresh
      ? `signin-${Date.now()}-${Math.random().toString(36).slice(2)}`
      : undefined;
    const loginWin = new BrowserWindow({
      width: 500,
      height: 650,
      title: "Sign in to YouTube",
      parent: mainWindow,
      modal: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        ...(partition ? { partition } : {}),
      },
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

ipcMain.handle("open-youtube-login", async (_event, options = {}) => {
  const success = await openYouTubeLogin(options);
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

ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-yt-dlp-version", () => getYtDlpVersionForUi());

ipcMain.handle("get-app-update-state", () => appUpdateState);
ipcMain.handle("get-yt-dlp-startup-state", () => ytDlpStartupState);

ipcMain.handle("check-for-app-update", async () => checkForAppUpdate());

ipcMain.handle("install-app-update", () => {
  if (!appUpdateState.updateDownloaded) return false;
  pushAppUpdateState({
    status: "installing",
    message: "Installing update and restarting...",
  });
  if (isMac) {
    installDownloadedMacUpdate(appUpdateState.version).catch((err) => {
      pushAppUpdateState({
        status: "error",
        message:
          err?.message ||
          "Install failed. Open the latest release and install manually.",
      });
    });
    return true;
  }
  autoUpdater.quitAndInstall(false, true);
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
      ...siteArgs(url),
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
          errorOutput.includes("confirm you're not a bot") ||
          errorOutput.includes("The page needs to be reloaded");
        if (isBotDetected) return resolve({ botDetected: true });
        return reject(new Error(`yt-dlp failed: ${errorOutput.slice(0, 300)}`));
      }
        try {
          const data = JSON.parse(output);
          const normalizeThumbUrl = (u) => {
            if (!u || typeof u !== "string") return null;
            const s = u.replace(/&amp;/g, "&").trim();
            if (!s) return null;
            if (s.startsWith("//")) return `https:${s}`;
            if (s.startsWith("http://")) return s.replace(/^http:\/\//i, "https://");
            return s;
          };
        const thumbs = Array.isArray(data.thumbnails) ? data.thumbnails : [];
        const bestThumb =
          thumbs
            .filter((t) => t?.url)
            .sort(
              (a, b) =>
                (b.width || 0) * (b.height || 0) -
                (a.width || 0) * (a.height || 0),
            )[0]?.url || null;
        const thumbnail = normalizeThumbUrl(data.thumbnail) || normalizeThumbUrl(bestThumb);
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
            hasMuxedAudio: f.acodec && f.acodec !== "none",
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
          const key = `${lang || "und"}-${note}-${f.acodec || "unknown"}-${abr || "na"}`;
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
              note,
              acodec: f.acodec || null,
              ext: f.ext || null,
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
          thumbnail,
          thumbnails: thumbs,
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
    if (!thumbnailUrl) throw new Error("No thumbnail URL");
    if (!savePath || !fs.existsSync(savePath))
      throw new Error("Save path does not exist");

    const { buffer, contentType } = await fetchImageBuffer(thumbnailUrl);
    const sanitized = sanitizeFilename(title);
    const ext = extFromContentType(contentType);
    const dest = getUniqueFilePath(path.join(savePath, `${sanitized}${ext}`));
    const tempDest = `${dest}.tmp`;

    fs.writeFileSync(tempDest, buffer);
    fs.renameSync(tempDest, dest);
    return dest;
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
      videoAudioTag,
      audioTrackTag,
      audioOnly,
      audioQuality,
      audioTrackId,
      audioContainer,
      hasMuxedAudio,
    },
  ) => {
    return new Promise((resolve, reject) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      let args;

      if (audioOnly) {
        const quality = audioQuality || "192";
        const trackSelector = audioTrackId || "bestaudio/best";
        const outFormat = audioContainer || "mp3";
        const safeTrackTag = audioTrackTag ? ` [${audioTrackTag}]` : "";
        const baseName =
          clipStart && clipEnd
            ? `%(title)s [audio ${quality}k ${outFormat}]${safeTrackTag} [clip ${clipStart.replace(/:/g, ".")}-${clipEnd.replace(/:/g, ".")}].%(ext)s`
            : `%(title)s [audio ${quality}k ${outFormat}]${safeTrackTag}.%(ext)s`;
        args = [
          "-f",
          trackSelector,
          "--extract-audio",
          "--audio-format",
          outFormat,
          "--audio-quality",
          `${quality}k`,
          "--ffmpeg-location",
          getFfmpegBin(),
          "--postprocessor-args",
          "ffmpeg:-y",
          ...resolveJsRuntimeArgs(),
          ...cookieArgs(),
          ...siteArgs(url),
          ...(clipStart && clipEnd
            ? ["--download-sections", `*${clipStart}-${clipEnd}`]
            : []),
          "-o",
          path.join(savePath, baseName),
          "--newline",
          url,
        ];
      } else {
        const safeAudioTag = videoAudioTag ? ` [${videoAudioTag}]` : "";
        args = [
          "-f",
          formatId,
          "--merge-output-format",
          container,
          "--remux-video",
          container,
          "--ffmpeg-location",
          getFfmpegBin(),
          "--postprocessor-args",
          "ffmpeg:-y",
          ...resolveJsRuntimeArgs(),
          ...cookieArgs(),
          ...siteArgs(url),
          ...(clipStart && clipEnd
            ? ["--download-sections", `*${clipStart}-${clipEnd}`]
            : []),
          "-o",
          path.join(
            savePath,
            clipStart && clipEnd
              ? `%(title)s [${height}p ${container}]${safeAudioTag} [clip ${clipStart.replace(/:/g, ".")}-${clipEnd.replace(/:/g, ".")}].%(ext)s`
              : `%(title)s [${height}p ${container}]${safeAudioTag}.%(ext)s`,
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
      console.log("[download] ffmpeg path:", getFfmpegBin());
      console.log("[download] ffmpeg exists:", fs.existsSync(getFfmpegBin()));

      const proc = spawn(getYtDlpPath(), args, { env: getYtDlpEnv() });
      activeDownload = proc;
      activeDownloadSavePath = savePath;
      let stderrOutput = "";

      let downloadPhase = 0;
      let outputFilePath = null;

      // Determine expected phases upfront for accurate progress scaling:
      // - audioOnly: 1 download phase + ExtractAudio conversion
      // - video muxed (audio+video in one stream): 1 download phase, no Merger
      // - video (no clip): 2 download phases (video stream + audio stream) + Merger
      // - video clip: 2 download phases + ffmpeg trim
      // - audio clip: 1 download phase + ExtractAudio + ffmpeg trim
      let expectedPhases = audioOnly || hasMuxedAudio ? 1 : 2;
      // phaseSize is recalculated dynamically in case expectedPhases gets adjusted

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

        // When --remux-video is used, final file path may differ after merge.
        const remuxToQuoted = line.match(/\[VideoRemuxer\].* to "(.+)"/);
        if (remuxToQuoted) {
          outputFilePath = path.normalize(remuxToQuoted[1].trim());
          if (!activeDownloadFiles.includes(outputFilePath))
            activeDownloadFiles.push(outputFilePath);
        }
        const remuxDest = line.match(/\[VideoRemuxer\] Destination:\s+(.+)/);
        if (remuxDest) {
          outputFilePath = path.normalize(remuxDest[1].trim());
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
          const actualPhase = (downloadPhase || 0) + 1;
          downloadPhase = actualPhase;
          // Dynamically grow expectedPhases if reality has more phases than predicted
          if (actualPhase > expectedPhases) expectedPhases = actualPhase;
          // Reset per-phase HLS state when a new download phase begins
          hlsTotalSegs[downloadPhase - 1] = null;
          hlsDoneSegs[downloadPhase - 1] = 0;
        }

        // ffmpeg/merge phase started — bump to 88% to show work is happening
        if (
          line.includes("[Merger]") ||
          line.includes("[ExtractAudio]") ||
          line.includes("[ffmpeg]")
        ) {
          win.webContents.send("download-progress", 88);
        }

        const match = line.match(/\[download\]\s+([\d.]+)%/);
        if (match) {
          const pct = parseFloat(match[1]);
          const phaseIndex = Math.max(0, downloadPhase - 1);
          const scaled = Math.round(
            phaseIndex * (85 / expectedPhases) +
              (pct / 100) * (85 / expectedPhases),
          );
          win.webContents.send("download-progress", Math.min(scaled, 85));
        }
      });

      // HLS segment tracking state — grows dynamically if phases exceed prediction
      const hlsTotalSegs = [];
      const hlsDoneSegs = [];

      // Regex matching any HLS/DASH segment file yt-dlp opens for reading
      // Covers: .ts, .m4s, .fmp4, .mp4, .aac, .m4a, .webm segments
      const segReadRe =
        /Opening '.*\.(ts|m4s|fmp4|mp4|aac|m4a|webm).*' for reading/;

      proc.stderr.on("data", (d) => {
        const line = d.toString();
        stderrOutput += line;
        console.error(line);
        const phaseIndex = Math.max(0, downloadPhase - 1);

        // Extract total segment count from URL params:
        // gosq/NNN (YouTube HLS) or nsegs=NNN or EXT-X-MEDIA-SEQUENCE patterns
        if (hlsTotalSegs[phaseIndex] === null) {
          const gosqMatch = line.match(/gosq[/=](\d+)/);
          if (gosqMatch) {
            hlsTotalSegs[phaseIndex] = parseInt(gosqMatch[1], 10);
          }
        }

        // Count each fetched segment — fires for any container type
        if (segReadRe.test(line)) {
          hlsDoneSegs[phaseIndex]++;
          const total = hlsTotalSegs[phaseIndex];
          if (total && total > 0) {
            const pct = hlsDoneSegs[phaseIndex] / total;
            const scaled = Math.round(
              phaseIndex * (85 / expectedPhases) + pct * (85 / expectedPhases),
            );
            win.webContents.send("download-progress", Math.min(scaled, 85));
          }
        }
      });

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
          outputFilePath = sanitizeOutputPath(outputFilePath, savePath);
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
          const isChallenge =
            stderrOutput.includes("confirm you're not a bot") ||
            stderrOutput.includes("Sign in to confirm you") ||
            stderrOutput.includes("The page needs to be reloaded");
          const isAgeRestricted =
            stderrOutput.includes("Sign in to confirm your age") ||
            stderrOutput.includes("age-restricted") ||
            stderrOutput.includes("inappropriate for some users");
          const filesToDelete = activeDownloadFiles.filter(
            isLikelyIntermediateYtDlpFile,
          );
          cleanupPartialFiles(filesToDelete, savePath);
          cancelRequested = false;
          activeDownloadFiles = [];
          activeDownloadSavePath = null;
          if (isAgeRestricted) {
            return reject(
              new Error(
                "Download blocked by YouTube age restriction. Sign in and try again.",
              ),
            );
          }
          if (isChallenge) {
            return reject(
              new Error(
                "YouTube challenge detected (reload/bot check). Re-authenticate or retry later.",
              ),
            );
          }
          const msg = (stderrOutput || "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(-6)
            .join(" | ")
            .slice(0, 600);
          reject(new Error(msg ? `Download failed: ${msg}` : "Download failed"));
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

ipcMain.handle("open-external", async (_, rawUrl) => {
  try {
    const u = new URL(String(rawUrl || ""));
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    await shell.openExternal(u.toString());
    return true;
  } catch {
    return false;
  }
});

// ---------------------------------------------------------------------------
// IPC: File system helpers
// ---------------------------------------------------------------------------

ipcMain.handle("show-in-folder", async (_, filePath) => {
  try {
    if (!filePath) {
      const res = await shell.openPath(os.homedir());
      if (res) console.error("[show-in-folder] openPath(home) error:", res);
      return !res;
    }

    const requested = normalizePathForShell(filePath);
    const dir = path.dirname(requested);
    const resolved = sanitizeOutputPath(requested, dir);
    const targetFile = fs.existsSync(resolved) ? resolved : requested;

    console.log("[show-in-folder] requested:", requested);
    console.log("[show-in-folder] resolved:", targetFile);
    console.log("[show-in-folder] exists:", fs.existsSync(targetFile));

    if (fs.existsSync(targetFile)) {
      if (isWin) {
        try {
          const fileForExplorer = targetFile.replace(/\//g, "\\");
          const proc = spawn("explorer.exe", [`/select,${fileForExplorer}`], {
            detached: true,
            stdio: "ignore",
          });
          proc.unref();
          return true;
        } catch (err) {
          console.error("[show-in-folder] explorer /select form1 error:", err.message);
        }
        try {
          const fileForExplorer = targetFile.replace(/\//g, "\\");
          const proc = spawn("explorer.exe", ["/select,", fileForExplorer], {
            detached: true,
            stdio: "ignore",
          });
          proc.unref();
          return true;
        } catch (err) {
          console.error("[show-in-folder] explorer /select form2 error:", err.message);
        }
      }
      shell.showItemInFolder(targetFile);
      return true;
    }

    const targetDir = fs.existsSync(dir) ? dir : os.homedir();
    const res = await shell.openPath(targetDir);
    if (res) console.error("[show-in-folder] openPath(dir) error:", res);
    return !res;
  } catch (err) {
    console.error("[show-in-folder] Error:", err);
    const res = await shell.openPath(os.homedir());
    if (res) console.error("[show-in-folder] openPath(catch) error:", res);
    return false;
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
