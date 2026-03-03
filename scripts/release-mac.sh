#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

YTDLP_PATH="resources/bin/mac/yt-dlp"
FFMPEG_PATH="resources/bin/mac/ffmpeg"

if [[ ! -f "$YTDLP_PATH" || ! -f "$FFMPEG_PATH" ]]; then
  echo "Missing required mac binaries in resources/bin/mac"
  echo "Expected:"
  echo "  - $YTDLP_PATH"
  echo "  - $FFMPEG_PATH"
  exit 1
fi

chmod +x "$YTDLP_PATH" "$FFMPEG_PATH"

rm -rf release

npm run build
npx electron-builder --mac dmg

find release -mindepth 1 ! -name "*.dmg" -exec rm -rf {} +

echo "DMG ready:"
ls -1 release/*.dmg