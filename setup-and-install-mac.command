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

# ── ffmpeg (universal binary via lipo) ───────────────────────────────────────
FFMPEG_PATH="${MAC_BIN_DIR}/ffmpeg"

download_ffmpeg_arch() {
  local urls=("${@:1:$#-1}")
  local out="${@: -1}"
  for url in "${urls[@]}"; do
    local tmp_zip tmp_dir found
    tmp_zip="$(mktemp -t ffmpeg_zip_XXXXXX).zip"
    tmp_dir="$(mktemp -d -t ffmpeg_extract_XXXXXX)"
    if curl -fL "${url}" -o "${tmp_zip}" 2>/dev/null; then
      unzip -q "${tmp_zip}" -d "${tmp_dir}" 2>/dev/null || true
      found="$(find "${tmp_dir}" -type f -name ffmpeg | head -n 1 || true)"
      if [[ -n "${found}" ]]; then
        cp "${found}" "${out}"
        chmod +x "${out}"
        rm -f "${tmp_zip}"
        rm -rf "${tmp_dir}"
        return 0
      fi
    fi
    rm -f "${tmp_zip}"
    rm -rf "${tmp_dir}"
  done
  return 1
}

if [[ "${FORCE_DOWNLOAD}" -eq 1 || ! -f "${FFMPEG_PATH}" ]]; then
  echo "==> Downloading ffmpeg (universal binary for arm64 + x86_64)"

  ARM64_URLS=(
    "https://www.osxexperts.net/ffmpeg7arm.zip"
  )
  X86_URLS=(
    "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip"
  )

  TMP_ARM64="$(mktemp -t ffmpeg_arm64_XXXXXX)"
  TMP_X86="$(mktemp -t ffmpeg_x86_XXXXXX)"

  ARM_OK=0
  X86_OK=0

  echo "==> Fetching arm64 ffmpeg..."
  if download_ffmpeg_arch "${ARM64_URLS[@]}" "${TMP_ARM64}"; then
    ARM_OK=1
    echo "==> arm64 ffmpeg downloaded"
  else
    echo "==> arm64 ffmpeg download failed"
  fi

  echo "==> Fetching x86_64 ffmpeg..."
  if download_ffmpeg_arch "${X86_URLS[@]}" "${TMP_X86}"; then
    X86_OK=1
    echo "==> x86_64 ffmpeg downloaded"
  else
    echo "==> x86_64 ffmpeg download failed"
  fi

  if [[ "${ARM_OK}" -eq 1 && "${X86_OK}" -eq 1 ]]; then
    echo "==> Building universal binary with lipo"
    lipo -create -output "${FFMPEG_PATH}" "${TMP_ARM64}" "${TMP_X86}"
    chmod +x "${FFMPEG_PATH}"
    echo "==> Universal ffmpeg created: $(file "${FFMPEG_PATH}")"
  elif [[ "${ARM_OK}" -eq 1 ]]; then
    echo "==> Warning: only arm64 available, using arm64-only binary"
    cp "${TMP_ARM64}" "${FFMPEG_PATH}"
    chmod +x "${FFMPEG_PATH}"
  elif [[ "${X86_OK}" -eq 1 ]]; then
    echo "==> Warning: only x86_64 available, using x86_64-only binary"
    cp "${TMP_X86}" "${FFMPEG_PATH}"
    chmod +x "${FFMPEG_PATH}"
  else
    echo "==> All download sources failed, checking local/Homebrew ffmpeg"
    if ! copy_local_ffmpeg_if_available "${FFMPEG_PATH}"; then
      if command -v brew >/dev/null 2>&1; then
        echo "==> Installing ffmpeg with Homebrew"
        brew install ffmpeg
        copy_local_ffmpeg_if_available "${FFMPEG_PATH}" || true
      fi
    fi
  fi

  rm -f "${TMP_ARM64}" "${TMP_X86}"

  if [[ ! -f "${FFMPEG_PATH}" ]]; then
    echo "Could not provision ffmpeg automatically."
    echo "Install ffmpeg manually (brew install ffmpeg), then rerun."
    exit 1
  fi
else
  echo "==> ffmpeg already present, skipping download (use --force-download to rebuild universal binary)"
fi

# ── ffprobe (universal binary via lipo) ──────────────────────────────────────
FFPROBE_PATH="${MAC_BIN_DIR}/ffprobe"

download_ffprobe_arch() {
  local urls=("${@:1:$#-1}")
  local out="${@: -1}"
  for url in "${urls[@]}"; do
    local tmp_zip tmp_dir found
    tmp_zip="$(mktemp -t ffprobe_zip_XXXXXX).zip"
    tmp_dir="$(mktemp -d -t ffprobe_extract_XXXXXX)"
    if curl -fL "${url}" -o "${tmp_zip}" 2>/dev/null; then
      unzip -q "${tmp_zip}" -d "${tmp_dir}" 2>/dev/null || true
      found="$(find "${tmp_dir}" -type f -name ffprobe | head -n 1 || true)"
      if [[ -n "${found}" ]]; then
        cp "${found}" "${out}"
        chmod +x "${out}"
        rm -f "${tmp_zip}"
        rm -rf "${tmp_dir}"
        return 0
      fi
    fi
    rm -f "${tmp_zip}"
    rm -rf "${tmp_dir}"
  done
  return 1
}

copy_local_ffprobe_if_available() {
  local target_path="$1"
  if command -v ffprobe >/dev/null 2>&1; then
    local local_ffprobe
    local_ffprobe="$(command -v ffprobe)"
    cp "${local_ffprobe}" "${target_path}"
    chmod +x "${target_path}"
    echo "==> Using local ffprobe from PATH: ${local_ffprobe}"
    return 0
  fi
  return 1
}

if [[ "${FORCE_DOWNLOAD}" -eq 1 || ! -f "${FFPROBE_PATH}" ]]; then
  echo "==> Downloading ffprobe (universal binary for arm64 + x86_64)"

  ARM64_FFPROBE_URLS=(
    "https://www.osxexperts.net/ffprobe7arm.zip"
  )
  X86_FFPROBE_URLS=(
    "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip"
  )

  TMP_ARM64_P="$(mktemp -t ffprobe_arm64_XXXXXX)"
  TMP_X86_P="$(mktemp -t ffprobe_x86_XXXXXX)"

  ARM_P_OK=0
  X86_P_OK=0

  echo "==> Fetching arm64 ffprobe..."
  if download_ffprobe_arch "${ARM64_FFPROBE_URLS[@]}" "${TMP_ARM64_P}"; then
    ARM_P_OK=1
    echo "==> arm64 ffprobe downloaded"
  else
    echo "==> arm64 ffprobe download failed"
  fi

  echo "==> Fetching x86_64 ffprobe..."
  if download_ffprobe_arch "${X86_FFPROBE_URLS[@]}" "${TMP_X86_P}"; then
    X86_P_OK=1
    echo "==> x86_64 ffprobe downloaded"
  else
    echo "==> x86_64 ffprobe download failed"
  fi

  if [[ "${ARM_P_OK}" -eq 1 && "${X86_P_OK}" -eq 1 ]]; then
    echo "==> Building universal ffprobe binary with lipo"
    lipo -create -output "${FFPROBE_PATH}" "${TMP_ARM64_P}" "${TMP_X86_P}"
    chmod +x "${FFPROBE_PATH}"
    echo "==> Universal ffprobe created: $(file "${FFPROBE_PATH}")"
  elif [[ "${ARM_P_OK}" -eq 1 ]]; then
    echo "==> Warning: only arm64 ffprobe available, using arm64-only binary"
    cp "${TMP_ARM64_P}" "${FFPROBE_PATH}"
    chmod +x "${FFPROBE_PATH}"
  elif [[ "${X86_P_OK}" -eq 1 ]]; then
    echo "==> Warning: only x86_64 ffprobe available, using x86_64-only binary"
    cp "${TMP_X86_P}" "${FFPROBE_PATH}"
    chmod +x "${FFPROBE_PATH}"
  else
    echo "==> All ffprobe download sources failed, checking local/Homebrew"
    if ! copy_local_ffprobe_if_available "${FFPROBE_PATH}"; then
      if command -v brew >/dev/null 2>&1; then
        echo "==> Installing ffmpeg (includes ffprobe) with Homebrew"
        brew install ffmpeg
        copy_local_ffprobe_if_available "${FFPROBE_PATH}" || true
      fi
    fi
  fi

  rm -f "${TMP_ARM64_P}" "${TMP_X86_P}"

  if [[ ! -f "${FFPROBE_PATH}" ]]; then
    echo "Could not provision ffprobe automatically."
    echo "Install ffmpeg manually (brew install ffmpeg), then rerun."
    exit 1
  fi
else
  echo "==> ffprobe already present, skipping download (use --force-download to rebuild)"
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