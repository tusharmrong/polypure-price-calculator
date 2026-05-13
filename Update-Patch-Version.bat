@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tools\update-version.ps1" -Mode patch
echo.
pause
