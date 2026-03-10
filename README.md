# Seedhe Download

Cross-platform desktop app to download videos using Electron, React, and yt-dlp.

This app is built for end users (no terminal needed after install) and supports:
- video downloads up to the best available quality
- audio-only downloads
- clip trimming (start/end range)
- thumbnail saving
- multi-audio track selection
- age-restricted and bot-check flows via in-app YouTube sign-in
- local download history
- app auto-updates (packaged Windows/macOS builds)
- yt-dlp self-update in the background

## Supported platforms

- Windows
- macOS

## Install (end users)

Download the latest installer from [Releases](../../releases).

- Windows: use the `*Setup*.exe` installer
- macOS: use the `.dmg` installer

If macOS blocks launch for an unsigned/local build, run:

```bash
xattr -dr com.apple.quarantine "/Applications/seedhe download by sanskar.app"
```

## Run from source (developers)

### Prerequisites

- Node.js 20+
- npm
- Git

Check Node version:

```bash
node -v
```

### 1) Clone and install

```bash
git clone https://github.com/sanskarkalal/yt-dlp-app.git
cd yt-dlp-app
npm install
```

### 2) Provide binaries

The app expects platform binaries inside `resources/bin`:

```
resources/bin/
  win/
    yt-dlp.exe
    ffmpeg.exe
  mac/
    yt-dlp
    ffmpeg
```

Use setup scripts to provision binaries automatically:

- Windows:
  ```powershell
  npm run setup:win
  ```
- macOS:
  ```bash
  npm run setup:mac
  ```

### 3) Start development mode

```bash
npm run dev
```

This starts Vite and Electron together.

## Build installers

```bash
# current platform
npm run dist

# Windows
npm run dist:win

# macOS
npm run dist:mac
```

Build output is written to `release/`.

## Publish release artifacts

Publishing uses `electron-builder` GitHub provider.

Set:

```bash
export GH_TOKEN=your_github_token
```

For macOS notarized builds, also set:

```bash
export APPLE_ID=your_apple_id@example.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=YOUR_TEAM_ID
```

Then run:

```bash
npm run publish:win
npm run publish:mac
```

## Common scripts

- `npm run dev` - Vite + Electron dev run
- `npm run build` - front-end production build
- `npm run dist` - package app for current OS
- `npm run dist:win` - package Windows installer
- `npm run dist:mac` - package macOS DMG/ZIP
- `npm run setup:win` - install deps, fetch Windows binaries, build installer
- `npm run setup:mac` - install deps, fetch macOS binaries, build installer

## Notes on sign-in and restricted videos

When a video requires authentication (age-restricted or bot-check), the app opens an in-app Google/YouTube sign-in window and saves usable cookies for yt-dlp.

You can clear saved sign-in state from the app UI (signed-in pill).

## Troubleshooting

### App does not launch on macOS (Gatekeeper warning)

For unsigned local builds:

```bash
xattr -dr com.apple.quarantine "/Applications/seedhe download by sanskar.app"
```

### Missing yt-dlp or ffmpeg

Re-run setup script for your OS:

- `npm run setup:win`
- `npm run setup:mac`

### Antivirus flags Windows installer

Electron + media tooling bundles can trigger false positives. Verify build source and add an exclusion for `release/` if needed.

## License

MIT
