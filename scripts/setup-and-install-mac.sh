#!/usr/bin/env bash
set -euo pipefail

SKIP_INSTALLER_LAUNCH=0
FORCE_DOWNLOAD=0

for arg in "$@"; do
  case "$arg" in
    --skip-installer-launch) SKIP_INSTALLER_LAUNCH=1 ;;
    --force-download) FORCE_DOWNLOAD=1 ;;
    *)
      echo "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' was not found in PATH."
    exit 1
  fi
}

copy_local_ffmpeg_if_available() {
  local target_path="$1"
  if command -v ffmpeg >/dev/null 2>&1; then
    local local_ffmpeg
    local_ffmpeg="$(command -v ffmpeg)"
    cp "${local_ffmpeg}" "${target_path}"
    chmod +x "${target_path}"
    echo "==> Using local ffmpeg from PATH: ${local_ffmpeg}"
    return 0
  fi
  return 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must be run on macOS."
  exit 1
fi

echo "==> Checking prerequisites"
require_command node
require_command npm
require_command curl
require_command unzip

NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [[ -z "${NODE_MAJOR}" || "${NODE_MAJOR}" -lt 20 ]]; then
  echo "Node.js v20+ is required. Detected: $(node -v)"
  exit 1
fi

echo "==> Installing npm dependencies"
npm install

echo "==> Ensuring tree-kill is installed"
if ! node -e "require('tree-kill')" 2>/dev/null; then
  npm install tree-kill --save
fi

MAC_BIN_DIR="${PROJECT_ROOT}/resources/bin/mac"
mkdir -p "${MAC_BIN_DIR}"

# ── yt-dlp ──────────────────────────────────────────────────────────────────
YTDLP_PATH="${MAC_BIN_DIR}/yt-dlp"
LATEST_YTDLP="$(curl -fsSL https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest \
  | grep '"tag_name"' \
  | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
CURRENT_YTDLP=""
if [[ -f "${YTDLP_PATH}" ]]; then
  CURRENT_YTDLP="$("${YTDLP_PATH}" --version 2>/dev/null || true)"
fi

if [[ "${FORCE_DOWNLOAD}" -eq 1 || ! -f "${YTDLP_PATH}" || "${CURRENT_YTDLP}" != "${LATEST_YTDLP}" ]]; then
  echo "==> Downloading yt-dlp (latest: ${LATEST_YTDLP}, current: ${CURRENT_YTDLP:-none})"
  curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" -o "${YTDLP_PATH}"
  chmod +x "${YTDLP_PATH}"
else
  echo "==> yt-dlp already up to date (${CURRENT_YTDLP})"
fi

# ── ffmpeg ───────────────────────────────────────────────────────────────────
FFMPEG_PATH="${MAC_BIN_DIR}/ffmpeg"
if [[ "${FORCE_DOWNLOAD}" -eq 1 || ! -f "${FFMPEG_PATH}" ]]; then
  echo "==> Downloading ffmpeg"
  ARCH="$(uname -m)"
  if [[ "${ARCH}" == "arm64" ]]; then
    FFMPEG_URLS=(
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-macosarm64-gpl.zip"
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-macosarm64-lgpl.zip"
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-macosarm64-gpl-7.1.zip"
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-macosarm64-lgpl-7.1.zip"
    )
  else
    FFMPEG_URLS=(
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-macos64-gpl.zip"
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-macos64-lgpl.zip"
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-macos64-gpl-7.1.zip"
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n7.1-latest-macos64-lgpl-7.1.zip"
    )
  fi

  DOWNLOAD_OK=0
  for FFMPEG_URL in "${FFMPEG_URLS[@]}"; do
    TMP_ZIP="$(mktemp -t ffmpeg_zip_XXXXXX).zip"
    TMP_DIR="$(mktemp -d -t ffmpeg_extract_XXXXXX)"
    if curl -fL "${FFMPEG_URL}" -o "${TMP_ZIP}"; then
      unzip -q "${TMP_ZIP}" -d "${TMP_DIR}" || true
      FOUND_FFMPEG="$(find "${TMP_DIR}" -type f -name ffmpeg | head -n 1 || true)"
      if [[ -n "${FOUND_FFMPEG}" ]]; then
        cp "${FOUND_FFMPEG}" "${FFMPEG_PATH}"
        chmod +x "${FFMPEG_PATH}"
        DOWNLOAD_OK=1
        rm -f "${TMP_ZIP}"
        rm -rf "${TMP_DIR}"
        break
      fi
    fi
    rm -f "${TMP_ZIP}"
    rm -rf "${TMP_DIR}"
  done

  if [[ "${DOWNLOAD_OK}" -eq 0 ]]; then
    echo "==> Download sources failed, checking local/Homebrew ffmpeg"
    if ! copy_local_ffmpeg_if_available "${FFMPEG_PATH}"; then
      if command -v brew >/dev/null 2>&1; then
        echo "==> Installing ffmpeg with Homebrew"
        brew install ffmpeg
        copy_local_ffmpeg_if_available "${FFMPEG_PATH}" || true
      fi
    fi
  fi

  if [[ ! -f "${FFMPEG_PATH}" ]]; then
    echo "Could not provision ffmpeg automatically."
    echo "Tried URLs:"
    for FFMPEG_URL in "${FFMPEG_URLS[@]}"; do
      echo "  - ${FFMPEG_URL}"
    done
    echo "Install ffmpeg manually (brew install ffmpeg), then rerun."
    exit 1
  fi
else
  echo "==> ffmpeg already present, skipping download"
fi

echo "==> Building macOS installer"
npm run dist:mac

INSTALLER_PATH="$(ls -t "${PROJECT_ROOT}"/release/*.dmg 2>/dev/null | head -n 1 || true)"
if [[ -z "${INSTALLER_PATH}" ]]; then
  echo "Installer .dmg was not found in release folder"
  exit 1
fi

echo "==> Installer created: ${INSTALLER_PATH}"

if [[ "${SKIP_INSTALLER_LAUNCH}" -eq 0 ]]; then
  echo "==> Launching installer"
  open "${INSTALLER_PATH}"
fi

echo "==> Done"