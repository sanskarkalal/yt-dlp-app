````md
# 🎬 YT Downloader

A cross-platform desktop app to download YouTube videos — built with Electron, React, and yt-dlp.

Supports HD downloads, audio-only export, clip trimming, and age-restricted content via built-in YouTube sign-in.

> ✅ No terminal required for end users. Just install and go.

---

## ✨ Features

- Download YouTube videos in any resolution (up to 4K)
- Audio-only downloads (MP3, M4A, etc.)
- Clip trimming — download a specific time range
- Age-restricted video support via embedded Google sign-in
- Self-contained — yt-dlp and ffmpeg are bundled
- Works on **Windows** and **macOS**

---

## 🛠 Prerequisites (For Developers)

Before building from source, install:

- **Node.js v20** (required)  
  https://nodejs.org/en/download  
- **Git**  
  https://git-scm.com/downloads  

Verify Node version:

```bash
node -v
# Must print v20.x.x
````

Other Node versions may cause build or Electron issues.

---

# 🚀 Setup Guide (From Source)

Follow these steps in order.

---

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/sanskarkalal/yt-dlp-app.git
cd yt-dlp-app
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Create Required Binary Folders

The app bundles `yt-dlp` and `ffmpeg` manually.
They **must** exist inside `resources/bin/` before running or building.

Required structure:

```
resources/
  bin/
    win/
      yt-dlp.exe
      ffmpeg.exe
    mac/
      yt-dlp
      ffmpeg
```

---

## 4️⃣ Download Required Binaries

### 🪟 Windows

Open PowerShell in the project root:

```powershell
# Create folder
New-Item -ItemType Directory -Force -Path "resources\bin\win"

# Download yt-dlp
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "resources\bin\win\yt-dlp.exe"

# Download ffmpeg static build
Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile "ffmpeg.zip"

# Extract ffmpeg.exe
Expand-Archive -Path "ffmpeg.zip" -DestinationPath "ffmpeg_tmp" -Force
Copy-Item "ffmpeg_tmp\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe" "resources\bin\win\ffmpeg.exe"

# Cleanup
Remove-Item -Recurse -Force "ffmpeg.zip", "ffmpeg_tmp"
```

Verify:

```powershell
dir resources\bin\win
# Should show: yt-dlp.exe  ffmpeg.exe
```

---

### 🍎 macOS

Open Terminal in project root:

```bash
mkdir -p resources/bin/mac

# Download yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o resources/bin/mac/yt-dlp
chmod +x resources/bin/mac/yt-dlp
```

Install ffmpeg (recommended via Homebrew):

```bash
brew install ffmpeg
cp $(which ffmpeg) resources/bin/mac/ffmpeg
chmod +x resources/bin/mac/ffmpeg
```

Verify:

```bash
ls resources/bin/mac
# Should show: yt-dlp  ffmpeg
```

---

# 🧪 Run in Development Mode

```bash
npm run dev
```

This:

* Starts Vite
* Launches Electron
* Opens the app automatically

If the app crashes at launch, confirm binaries exist in `resources/bin/`.

---

# 🏗 Build Distributable App

This creates a standalone installer. End users do **not** need Node or terminal.

---

## Build for Windows

Run on Windows:

```bash
npm run dist:win
```

Output:

```
release/YT Downloader Setup x.x.x.exe
```

---

## Build for macOS

Run on Mac:

```bash
npm run dist:mac
```

Output:

```
release/YT Downloader-x.x.x.dmg
```

---

## Build for Current Platform

```bash
npm run dist
```

---

# 🔐 Age-Restricted Videos

When downloading age-restricted content:

* The app opens a Google sign-in window.
* You log in normally.
* Electron stores cookies in its session.
* The app uses those cookies for future downloads.

If your implementation exports cookies to a `cookies.txt` file, it will typically be stored in:

```
~/Documents/yt-dlp-app/
```

If not exported manually, cookies remain inside Electron’s internal session storage.

To sign out:
Use **Clear Cookies** inside app settings.

---

# 🧯 Troubleshooting

### ❌ yt-dlp not found

* Confirm correct file exists:

  * Windows → `resources/bin/win/yt-dlp.exe`
  * macOS → `resources/bin/mac/yt-dlp`
* Re-run binary download steps

---

### ❌ ffmpeg not found / no audio

* Confirm ffmpeg exists in correct folder
* Ensure file is executable (macOS)

```bash
chmod +x resources/bin/mac/ffmpeg
```

---

### 🍎 macOS: “App is damaged” / can’t open

This is Gatekeeper quarantine on unsigned apps. On the target Mac:

```bash
xattr -dr com.apple.quarantine "/Applications/seedhe download by sanskar.app"
```

Then open the app again.

---

### 🍎 macOS: `Permission denied` for ffmpeg or yt-dlp

If this appears on an older build:

```bash
chmod +x "/Applications/seedhe download by sanskar.app/Contents/Resources/bin/mac/ffmpeg"
chmod +x "/Applications/seedhe download by sanskar.app/Contents/Resources/bin/mac/yt-dlp"
```

Newer mac builds use an `afterPack` hook to set these permissions during packaging.

---

### 🪟 Windows: Antivirus flags installer

Common false positive for Electron apps using yt-dlp.
Add an exclusion for the `release/` folder.

---

### ❌ Build fails with symlink errors (Windows)

Run terminal as Administrator
OR enable Developer Mode in Windows Settings

---

## Windows one-click setup

From project root, double-click `setup-and-install.bat` (or run it in terminal).

CLI alternative:

```powershell
npm run setup:win
```

## macOS one-click setup

From project root on macOS:

```bash
npm run setup:mac
```

If you prefer Finder double-click, first make launchers executable once:

```bash
chmod +x setup-and-install-mac.command scripts/setup-and-install-mac.sh
./setup-and-install-mac.command
```

## Clean macOS release build

Build a fresh mac release and keep only `.dmg` in `release/`:

```bash
npm run release:mac
```

# 📜 License

MIT — use it, modify it, distribute it.
