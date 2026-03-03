import { app, BrowserWindow, ipcMain, dialog } from "electron";
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

// --- Resolve bundled binary paths ---
function getBinariesDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin");
  } else {
    return path.join(__dirname, "..", "resources", "bin");
  }
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

const LEGACY_COOKIES_PATH = path.join(
  os.homedir(),
  "Documents",
  "yt-dlp-app",
  "cookies.txt",
);
function getCookiesPath() {
  // Keep auth state in app-managed storage on mac dist builds (no Documents permission friction).
  return path.join(app.getPath("userData"), "cookies.txt");
}

function resolveJsRuntimeArgs() {
  // yt-dlp expects runtime names here, not binary paths.
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

function cookiesExist() {
  return fs.existsSync(getCookiesPath()) || fs.existsSync(LEGACY_COOKIES_PATH);
}

function cookieArgs() {
  if (fs.existsSync(getCookiesPath())) return ["--cookies", getCookiesPath()];
  if (fs.existsSync(LEGACY_COOKIES_PATH)) return ["--cookies", LEGACY_COOKIES_PATH];
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
  if (!fs.existsSync(cookiesDir)) {
    fs.mkdirSync(cookiesDir, { recursive: true });
  }

  console.log("[bin] yt-dlp path:", getYtDlpPath());
  console.log("[bin] yt-dlp exists:", fs.existsSync(getYtDlpPath()));
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});

// --- YouTube Login Window ---
function openYouTubeLogin() {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 500,
      height: 650,
      title: "Sign in to YouTube",
      parent: mainWindow,
      modal: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
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
      const allSessionCookies = await loginWin.webContents.session.cookies.get(
        {},
      );
      const allCookies = allSessionCookies.filter((c) => {
        const d = c.domain.startsWith(".") ? c.domain : "." + c.domain;
        return d.includes("youtube.com") || d.includes("google.com");
      });
      if (!allCookies.length) return false;

      const cookieLines = [
        "# Netscape HTTP Cookie File",
        "# This file was generated by yt-dlp-app",
        "",
      ];

      for (const cookie of allCookies) {
        if (!cookie.name || cookie.value === undefined) continue;
        const bareDomain = cookie.domain.startsWith(".")
          ? cookie.domain
          : "." + cookie.domain;
        const domain = cookie.httpOnly ? `#HttpOnly_${bareDomain}` : bareDomain;
        const includeSubdomains = bareDomain.startsWith(".") ? "TRUE" : "FALSE";
        const secure = cookie.secure ? "TRUE" : "FALSE";
        const expiry = cookie.expirationDate
          ? Math.floor(cookie.expirationDate)
          : Math.floor(Date.now() / 1000) + 86400 * 365;
        const cookiePath = cookie.path || "/";
        cookieLines.push(
          `${domain}\t${includeSubdomains}\t${cookiePath}\t${secure}\t${expiry}\t${cookie.name}\t${cookie.value}`,
        );
      }

      fs.writeFileSync(getCookiesPath(), cookieLines.join("\n"));
      console.log("[auth] Cookies saved:", allCookies.length, "cookies");
      return true;
    };

    const maybeFinalizeAuth = async (navUrl) => {
      const onGoogleOrYouTube =
        navUrl.includes("youtube.com") || navUrl.includes("google.com");
      const stillOnSignIn = navUrl.includes("accounts.google.com/signin");
      if (!onGoogleOrYouTube || stillOnSignIn) return;
      try {
        const ok = await tryPersistCookies();
        if (ok) {
          loginWin.close();
          finish(true);
        }
      } catch (err) {
        console.error("[auth] Failed to extract cookies:", err);
      }
    };

    loginWin.webContents.on("did-navigate", async (_event, navUrl) => {
      await maybeFinalizeAuth(navUrl);
    });
    loginWin.webContents.on("did-navigate-in-page", async (_event, navUrl) => {
      await maybeFinalizeAuth(navUrl);
    });

    loginWin.on("closed", async () => {
      if (settled) return;
      try {
        const ok = await tryPersistCookies();
        finish(ok);
      } catch {
        finish(false);
      }
    });
  });
}

// --- IPC: Open YouTube login ---
ipcMain.handle("open-youtube-login", async () => {
  const success = await openYouTubeLogin();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("cookies-status", success);
  }
  return success;
});

// --- Check cookies status ---
ipcMain.handle("get-cookies-status", () => cookiesExist());

// --- Clear cookies ---
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
    proc.on("error", (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        const isAgeRestricted =
          errorOutput.includes("Sign in to confirm your age") ||
          errorOutput.includes("age-restricted") ||
          errorOutput.includes("inappropriate for some users");
        if (isAgeRestricted) return reject(new Error("AGE_RESTRICTED"));
        return reject(new Error(`yt-dlp failed: ${errorOutput.slice(0, 300)}`));
      }
      try {
        const data = JSON.parse(output);

        // Collect every video format with real metadata
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
                : codecFull.startsWith("vp08")
                  ? "VP8"
                  : codecFull.startsWith("av01")
                    ? "AV1"
                    : codecFull.split(".")[0].toUpperCase();
          const vbr = f.vbr ? Math.round(f.vbr) : null;
          const tbr = f.tbr ? Math.round(f.tbr) : null;
          const bitrate = vbr || (f.acodec === "none" ? tbr : null); // tbr on muxed = total, misleading
          const hasMuxedAudio = f.acodec && f.acodec !== "none";

          rawFormats.push({
            format_id: f.format_id,
            // If video-only, tell the download handler to merge with best audio
            download_id: hasMuxedAudio
              ? f.format_id
              : `${f.format_id}+bestaudio`,
            height: f.height,
            width: f.width,
            fps: f.fps || null,
            codec: codecShort,
            bitrate, // null if unknown
            ext: f.ext || "",
            hasMuxedAudio,
          });
        }

        // Keep legacy `formats` for backwards compat (unused by new UI but harmless)
        const formats = [];

        // --- NEW: Extract audio tracks ---
        const audioOnlyRaw = data.formats.filter(
          (f) => f.vcodec === "none" && f.acodec && f.acodec !== "none",
        );
        const seenAudio = new Set();
        const audioTracks = [
          { format_id: "bestaudio/best", label: "Best available" },
        ];
        for (const f of audioOnlyRaw) {
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

        // Derive available containers: native exts + always include mp4 + mkv
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
ipcMain.handle("get-downloads-path", () =>
  path.join(os.homedir(), "Downloads"),
);

// --- Download Thumbnail ---
ipcMain.handle(
  "download-thumbnail",
  async (_, { thumbnailUrl, title, savePath }) => {
    return new Promise((resolve, reject) => {
      const sanitized = title.replace(/[/\\?%*:|"<>]/g, "-").trim();
      const dest = path.join(savePath, `${sanitized}.jpg`);
      const file = fs.createWriteStream(dest);
      const client = thumbnailUrl.startsWith("https") ? https : http;
      client
        .get(thumbnailUrl, (res) => {
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
    });
  },
);

// --- Download ---
ipcMain.handle(
  "download",
  async (
    event,
    {
      url,
      formatId,
      container,
      savePath,
      clipStart,
      clipEnd,
      audioOnly,
      audioQuality,
      audioTrackId, // NEW
      audioContainer, // NEW
    },
  ) => {
    return new Promise((resolve, reject) => {
      const win = BrowserWindow.fromWebContents(event.sender);

      let args;

      if (audioOnly) {
        // Audio-only download
        const quality = audioQuality || "192";
        const trackSelector = audioTrackId || "bestaudio/best"; // NEW
        const outFormat = audioContainer || "mp3"; // NEW
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
            ? [
                "--download-sections",
                `*${clipStart}-${clipEnd}`,
                "--force-keyframes-at-cuts",
              ]
            : []),
          "-o",
          path.join(savePath, "%(title)s.%(ext)s"),
          "--newline",
          url,
        ];
      } else {
        // Video download — unchanged
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
            ? [
                "--download-sections",
                `*${clipStart}-${clipEnd}`,
                "--force-keyframes-at-cuts",
              ]
            : []),
          "-o",
          path.join(savePath, "%(title)s.%(ext)s"),
          "--newline",
          url,
        ];
      }

      const proc = spawn(getYtDlpPath(), args, { env: getYtDlpEnv() });
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
