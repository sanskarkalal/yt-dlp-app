param(
  [switch]$SkipInstallerLaunch,
  [switch]$ForceDownload
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Download-File {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$OutFile
  )
  Invoke-WebRequest -Uri $Url -OutFile $OutFile
}

function Get-NodeMajorVersion {
  $versionText = node -v
  if ($versionText -match "^v(\d+)\.") {
    return [int]$Matches[1]
  }
  throw "Unable to parse Node.js version: $versionText"
}

Set-Location (Join-Path $PSScriptRoot "..")
$projectRoot = Get-Location

Write-Host "==> Checking prerequisites"
Require-Command "node"
Require-Command "npm"

$nodeMajor = Get-NodeMajorVersion
if ($nodeMajor -lt 20) {
  throw "Node.js v20+ is required. Detected: v$nodeMajor"
}

Write-Host "==> Installing npm dependencies"
npm install
if ($LASTEXITCODE -ne 0) {
  throw "npm install failed"
}

$winBinDir = Join-Path $projectRoot "resources\bin\win"
New-Item -ItemType Directory -Force -Path $winBinDir | Out-Null

$ytDlpPath = Join-Path $winBinDir "yt-dlp.exe"
if ($ForceDownload -or -not (Test-Path $ytDlpPath)) {
  Write-Host "==> Downloading yt-dlp"
  Download-File -Url "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytDlpPath
} else {
  Write-Host "==> yt-dlp already present, skipping download"
}

$ffmpegPath = Join-Path $winBinDir "ffmpeg.exe"
if ($ForceDownload -or -not (Test-Path $ffmpegPath)) {
  Write-Host "==> Downloading ffmpeg"
  $zipPath = Join-Path $env:TEMP "ffmpeg-master-latest-win64-gpl.zip"
  $extractDir = Join-Path $env:TEMP "ffmpeg_extract_$([Guid]::NewGuid().ToString('N'))"

  Download-File -Url "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile $zipPath
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

  $foundFfmpeg = Get-ChildItem -Path $extractDir -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
  if (-not $foundFfmpeg) {
    throw "ffmpeg.exe was not found in extracted archive"
  }

  Copy-Item $foundFfmpeg.FullName $ffmpegPath -Force

  Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
  Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue
} else {
  Write-Host "==> ffmpeg already present, skipping download"
}

Write-Host "==> Building Windows installer"
npm run dist:win
if ($LASTEXITCODE -ne 0) {
  throw "npm run dist:win failed"
}

$installer = Get-ChildItem -Path (Join-Path $projectRoot "release") -Filter "*Setup*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) {
  throw "Installer was not found in release folder"
}

Write-Host "==> Installer created: $($installer.FullName)"

if (-not $SkipInstallerLaunch) {
  Write-Host "==> Launching installer"
  Start-Process -FilePath $installer.FullName -Wait
}

Write-Host "==> Done"
