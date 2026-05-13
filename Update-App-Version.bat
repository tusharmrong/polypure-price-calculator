@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo ==========================================
echo   Poly Pure Business Suite Version Tool
echo ==========================================
echo.

if not exist "src\utils\appMeta.js" (
  echo appMeta.js file not found.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd')"`) do set "TODAY=%%A"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd-HHmm')"`) do set "DEFAULT_BUILD=%%A"

echo Leave any field empty to keep the current value.
echo.

set "APP_VERSION="
set /p APP_VERSION=New app version (example 0.2.1): 

set "APP_BUILD="
set /p APP_BUILD=New build number [default %DEFAULT_BUILD%]: 
if "%APP_BUILD%"=="" set "APP_BUILD=%DEFAULT_BUILD%"

set "APP_RELEASE_DATE="
set /p APP_RELEASE_DATE=Release date [default %TODAY%]: 
if "%APP_RELEASE_DATE%"=="" set "APP_RELEASE_DATE=%TODAY%"

set "APP_NOTE="
set /p APP_NOTE=Top release note (optional): 

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$path = 'src/utils/appMeta.js';" ^
  "$content = Get-Content -Raw $path;" ^
  "$newVersion = '%APP_VERSION%';" ^
  "$newBuild = '%APP_BUILD%';" ^
  "$newDate = '%APP_RELEASE_DATE%';" ^
  "$newNote = '%APP_NOTE%';" ^
  "if ($newVersion -and $newVersion.Trim()) { $content = [regex]::Replace($content, \"export const APP_VERSION = '.*?'\", \"export const APP_VERSION = '$newVersion'\") }" ^
  "$content = [regex]::Replace($content, \"export const APP_BUILD = '.*?'\", \"export const APP_BUILD = '$newBuild'\")" ^
  "$content = [regex]::Replace($content, \"export const APP_RELEASE_DATE = '.*?'\", \"export const APP_RELEASE_DATE = '$newDate'\")" ^
  "if ($newNote -and $newNote.Trim()) {" ^
  "  if ($content -match \"export const APP_RELEASE_NOTES = \\\[(.*?)\\\]\"s) {" ^
  "    $existingBlock = $Matches[1];" ^
  "    $escapedNote = $newNote.Replace(\"'\", \"\\'\");" ^
  "    if ($existingBlock -match \"'[^']*'\") {" ^
  "      $updatedBlock = [regex]::Replace($existingBlock, \"'[^']*'\", \"'$escapedNote'\", 1)" ^
  "    } else {" ^
  "      $updatedBlock = \"`r`n  '$escapedNote'`r`n\" + $existingBlock" ^
  "    }" ^
  "    $content = $content.Replace($existingBlock, $updatedBlock)" ^
  "  }" ^
  "}" ^
  "Set-Content -Path $path -Value $content;"

if errorlevel 1 (
  echo.
  echo Could not update app version.
  pause
  exit /b 1
)

echo.
echo Version file updated successfully.
echo.
echo Next step:
echo   git add src/utils/appMeta.js
echo   git commit -m "Update app version"
echo   git push origin main
echo.
pause
