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

MAC_BIN_DIR="${PROJECT_ROOT}/resources/bin/mac"
mkdir -p "${MAC_BIN_DIR}"

YTDLP_PATH="${MAC_BIN_DIR}/yt-dlp"
if [[ "${FORCE_DOWNLOAD}" -eq 1 || ! -f "${YTDLP_PATH}" ]]; then
  echo "==> Downloading yt-dlp"
  curl -fL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" -o "${YTDLP_PATH}"
  chmod +x "${YTDLP_PATH}"
else
  echo "==> yt-dlp already present, skipping download"
fi

FFMPEG_PATH="${MAC_BIN_DIR}/ffmpeg"
if [[ "${FORCE_DOWNLOAD}" -eq 1 || ! -f "${FFMPEG_PATH}" ]]; then
  echo "==> Downloading ffmpeg"
  ARCH="$(uname -m)"
  if [[ "${ARCH}" == "arm64" ]]; then
    FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-macosarm64-gpl.zip"
  else
    FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-macos64-gpl.zip"
  fi

  TMP_ZIP="$(mktemp -t ffmpeg_zip_XXXXXX).zip"
  TMP_DIR="$(mktemp -d -t ffmpeg_extract_XXXXXX)"
  curl -fL "${FFMPEG_URL}" -o "${TMP_ZIP}"
  unzip -q "${TMP_ZIP}" -d "${TMP_DIR}"

  FOUND_FFMPEG="$(find "${TMP_DIR}" -type f -name ffmpeg | head -n 1 || true)"
  if [[ -z "${FOUND_FFMPEG}" ]]; then
    echo "ffmpeg binary was not found in extracted archive"
    rm -f "${TMP_ZIP}"
    rm -rf "${TMP_DIR}"
    exit 1
  fi

  cp "${FOUND_FFMPEG}" "${FFMPEG_PATH}"
  chmod +x "${FFMPEG_PATH}"
  rm -f "${TMP_ZIP}"
  rm -rf "${TMP_DIR}"
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
