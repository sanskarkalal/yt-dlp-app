@echo off
setlocal

set SCRIPT_DIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\setup-and-install.ps1"

if errorlevel 1 (
  echo.
  echo Setup failed. See errors above.
  pause
  exit /b 1
)

echo.
echo Setup finished successfully.
pause
