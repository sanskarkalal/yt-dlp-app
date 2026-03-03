# 🎬 Seedhe Download

A cross-platform desktop app to download YouTube videos — built with Electron, React, and yt-dlp.

Supports HD downloads, audio-only export, clip trimming, and age-restricted content via built-in YouTube sign-in.

> ✅ No terminal required for end users. Just install and go.

---

## ✨ Features

- Download YouTube videos in any resolution (up to 4K)
- Audio-only downloads (MP3, M4A, OPUS, WAV)
- Clip trimming — download a specific time range
- Age-restricted video support via embedded Google sign-in
- Download history with Show in Finder / Explorer
- Self-contained — yt-dlp and ffmpeg are bundled
- Works on **Windows** and **macOS**

---

# 📦 Installing the App (End Users)

Download the latest release from the [Releases](../../releases) page.

---

## 🪟 Windows

1. Download the `.exe` installer
2. Double-click and install
3. Open the app — done ✅

No extra steps needed.

---

## 🍎 macOS

1. Download the `.dmg` file
2. Open it and drag the app into `/Applications`
3. **Before opening**, run this command in Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/seedhe download by sanskar.app"
```

4. Open the app — done ✅

> **Why is this needed?**  
> macOS Gatekeeper flags apps that aren't Apple-notarized. This command removes that quarantine flag. The app itself is safe — it's just not signed with an Apple developer certificate.

---

# 🛠 Developer Setup (Run from Source)

Follow these steps if you want to run or build the app yourself.

---

## Prerequisites

- **Node.js v20+** → https://nodejs.org/en/download
- **Git** → https://git-scm.com/downloads

Verify:

```bash
node -v   # Must print v20.x.x or higher
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/sanskarkalal/yt-dlp-app.git
cd yt-dlp-app
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Download Required Binaries

The app bundles `yt-dlp` and `ffmpeg` directly — they must exist in `resources/bin/` before running or building.

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

### 🪟 Windows — Automated

Run this in PowerShell (from project root):

```powershell
npm run setup:win
```

This downloads yt-dlp and ffmpeg, then builds the installer automatically.

### 🍎 macOS — Automated

```bash
npm run setup:mac
```

Same thing — downloads binaries and builds the DMG.

### Manual Binary Download

If you want to download binaries yourself:

**yt-dlp:**
- Windows: https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe
- macOS: https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos

**ffmpeg:**
- Windows: https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip (extract `ffmpeg.exe`)
- macOS: via Homebrew — `brew install ffmpeg`, then copy the binary from `which ffmpeg`

---

## 4. Run in Development Mode

```bash
npm run dev
```

This starts Vite + Electron together. The app window opens automatically.

---

# 🏗 Build a Distributable

Creates a standalone installer — end users don't need Node or terminal.

```bash
# Windows (run on Windows)
npm run dist:win

# macOS (run on Mac)
npm run dist:mac

# Current platform
npm run dist
```

Output goes to the `release/` folder:
- Windows: `release/*Setup*.exe`
- macOS: `release/*.dmg`

---

# 🔐 Age-Restricted Videos

When downloading age-restricted content, the app will show a YouTube sign-in prompt.

- A browser window opens for you to log in
- Cookies are stored in Electron's session
- Future downloads use those cookies automatically

To sign out, click the **Signed in** pill in the top-right of the app.

> **Note:** On Windows, Chrome and Edge cookies can't be accessed by yt-dlp due to app-bound encryption (Chrome 127+). The app uses **Firefox** cookies instead — so sign in via the in-app prompt, not your browser.

---

# 🧯 Troubleshooting

### ❌ App won't open on macOS — "damaged or can't be opened"

Run the quarantine removal command:

```bash
xattr -dr com.apple.quarantine "/Applications/seedhe download by sanskar.app"
```

---

### ❌ yt-dlp or ffmpeg not found

Confirm the binaries exist in the right place:
- Windows → `resources/bin/win/yt-dlp.exe` and `ffmpeg.exe`
- macOS → `resources/bin/mac/yt-dlp` and `ffmpeg`

Re-run `npm run setup:win` or `npm run setup:mac` to re-download them.

---

### ❌ No audio in downloaded video / ffmpeg error

Make sure ffmpeg is present and executable:

```bash
# macOS
chmod +x resources/bin/mac/ffmpeg
```

---

### 🪟 Windows: Antivirus flags the installer

Common false positive for Electron apps bundling yt-dlp. Add an exclusion for the `release/` folder in your antivirus settings.

---

### ❌ Build fails with symlink errors (Windows)

Run PowerShell as Administrator, or enable Developer Mode in Windows Settings.

---

# 📜 License

MIT — use it, modify it, distribute it.