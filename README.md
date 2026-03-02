# 🎬 YT Downloader

A cross-platform desktop app to download YouTube videos — built with Electron, React, and yt-dlp. Supports HD downloads, audio-only export, clip trimming, and age-restricted content via built-in YouTube sign-in.

> ✅ No terminal required for end users. Just install and go.

---

## ✨ Features

- Download YouTube videos in any resolution (up to 4K)
- Audio-only downloads (MP3, M4A, etc.)
- Clip trimming — download just a specific time range
- Age-restricted video support via embedded Google sign-in
- Self-contained — yt-dlp and ffmpeg are bundled, no PATH setup needed
- Works on **Windows** and **macOS**

---

## 🛠 Prerequisites (for developers / building from source)

Before you begin, make sure you have:

- [Node.js v20](https://nodejs.org/en/download) — **must be v20**, other versions may cause issues
- [Git](https://git-scm.com/downloads)
- npm (comes with Node.js)

To verify your Node version:
```bash
node -v
# Should print v20.x.x
```

---

## 📁 Project Structure (important)

The app bundles yt-dlp and ffmpeg directly. You **must** place the correct binaries in the `resources/bin/` folder before building or running in dev mode.

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

## ⬇️ Step 1 — Get the Binaries

### 🪟 Windows

Open **PowerShell** and run these commands from the root of the project:

```powershell
# Create the folder
New-Item -ItemType Directory -Force -Path "resources\bin\win"

# Download yt-dlp
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "resources\bin\win\yt-dlp.exe"

# Download ffmpeg (static build)
Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile "ffmpeg.zip"

# Extract just ffmpeg.exe
Expand-Archive -Path "ffmpeg.zip" -DestinationPath "ffmpeg_tmp" -Force
Copy-Item "ffmpeg_tmp\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe" "resources\bin\win\ffmpeg.exe"

# Clean up
Remove-Item -Recurse -Force "ffmpeg.zip", "ffmpeg_tmp"
```

Verify it worked:
```powershell
dir resources\bin\win
# Should show: ffmpeg.exe  yt-dlp.exe
```

---

### 🍎 macOS

Open **Terminal** and run from the project root:

```bash
# Create the folder
mkdir -p resources/bin/mac

# Download yt-dlp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o resources/bin/mac/yt-dlp

# Make it executable
chmod +x resources/bin/mac/yt-dlp
```

For **ffmpeg**, the easiest way is via Homebrew:

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install ffmpeg
brew install ffmpeg

# Copy it into the project
cp $(which ffmpeg) resources/bin/mac/ffmpeg
chmod +x resources/bin/mac/ffmpeg
```

Verify:
```bash
ls resources/bin/mac
# Should show: ffmpeg  yt-dlp
```

---

## 📦 Step 2 — Install Node Dependencies

```bash
git clone https://github.com/your-username/yt-dlp-app.git
cd yt-dlp-app
npm install
```

---

## 🚀 Step 3 — Run in Dev Mode

```bash
npm run dev
```

This starts the Vite dev server and launches Electron simultaneously. The app will open automatically.

---

## 🏗 Step 4 — Build the Distributable App

This produces a standalone installer that anyone can use — **no Node.js or terminal required** for the end user.

### Build for Windows (`.exe` installer)

Run this on a Windows machine:

```bash
npm run dist:win
```

Output: `release/YT Downloader Setup x.x.x.exe`

### Build for macOS (`.dmg`)

Run this on a Mac:

```bash
npm run dist:mac
```

Output: `release/YT Downloader-x.x.x.dmg`

### Build for current platform (auto-detect)

```bash
npm run dist
```

> 💡 The final installer is fully self-contained. yt-dlp and ffmpeg are bundled inside — end users just install and run.

---

## 🔐 Age-Restricted Videos

When you try to download an age-restricted video, the app will automatically prompt you to sign in to YouTube. A Google sign-in window will open inside the app — log in normally, and the app will extract your session cookies and save them locally to:
THIS IS NOT YET WORKING ON MAC PROPERLY SO FIXES WILL BE PUSHED SOON
```
~/Documents/yt-dlp-app/cookies.txt
```

You only need to sign in once. After that, downloads will use your saved session automatically.

To sign out / clear cookies, use the **Clear Cookies** option inside the app settings.

---

## 🧯 Troubleshooting

**`yt-dlp not found` or app crashes on launch**
- Make sure `resources/bin/win/yt-dlp.exe` (Windows) or `resources/bin/mac/yt-dlp` (Mac) exists
- Re-run the binary download commands above

**`ffmpeg not found` or video has no audio**
- Same deal — confirm `ffmpeg.exe` / `ffmpeg` is in the correct `resources/bin/` subfolder

**macOS: "App can't be opened because it is from an unidentified developer"**
- Right-click the `.app` or `.dmg` → click **Open** → click **Open** again in the dialog

**macOS: Permission denied when running yt-dlp**
```bash
chmod +x resources/bin/mac/yt-dlp
chmod +x resources/bin/mac/ffmpeg
```

**Windows: Antivirus flags the exe**
- This is a false positive common with Electron apps and yt-dlp. Add an exception in your antivirus or use Windows Defender exclusions for the `release/` folder.

**Age-restricted sign-in not working**
- Make sure you're signing into a Google account that has verified your age on YouTube
- Try clearing cookies in the app and signing in again

**Build fails on Windows with symlink errors**
- Run your terminal as Administrator, or enable Developer Mode in Windows Settings → For Developers

---

## 📜 License

MIT — do whatever you want with it.
