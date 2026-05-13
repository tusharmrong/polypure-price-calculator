param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('major', 'minor', 'patch')]
  [string]$Mode,

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$appMetaPath = Join-Path $root 'src\utils\appMeta.js'
$backupRoot = Join-Path $root 'backups\version-history'

if (-not (Test-Path $appMetaPath)) {
  throw "Could not find app meta file: $appMetaPath"
}

$content = Get-Content -Raw $appMetaPath

$versionMatch = [regex]::Match($content, "export const APP_VERSION = '(\d+)\.(\d+)\.(\d+)'")
$buildMatch = [regex]::Match($content, "export const APP_BUILD = '([^']+)'")
$dateMatch = [regex]::Match($content, "export const APP_RELEASE_DATE = '([^']+)'")

if (-not $versionMatch.Success) {
  throw 'Could not read APP_VERSION from appMeta.js'
}

$major = [int]$versionMatch.Groups[1].Value
$minor = [int]$versionMatch.Groups[2].Value
$patch = [int]$versionMatch.Groups[3].Value

$oldVersion = "$major.$minor.$patch"
$oldBuild = if ($buildMatch.Success) { $buildMatch.Groups[1].Value } else { 'unknown-build' }
$oldDate = if ($dateMatch.Success) { $dateMatch.Groups[1].Value } else { 'unknown-date' }

switch ($Mode) {
  'major' {
    $major += 1
    $minor = 0
    $patch = 0
  }
  'minor' {
    $minor += 1
    $patch = 0
  }
  'patch' {
    $patch += 1
  }
}

$newVersion = "$major.$minor.$patch"
$releaseDate = Get-Date -Format 'yyyy-MM-dd'
$buildNumber = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$backupFolder = Join-Path $backupRoot $timestamp
$backupFile = Join-Path $backupFolder 'appMeta.js'
$backupInfo = Join-Path $backupFolder 'backup-info.txt'

$updatedContent = $content
$updatedContent = [regex]::Replace($updatedContent, "export const APP_VERSION = '.*?'", "export const APP_VERSION = '$newVersion'")
$updatedContent = [regex]::Replace($updatedContent, "export const APP_BUILD = '.*?'", "export const APP_BUILD = '$buildNumber'")
$updatedContent = [regex]::Replace($updatedContent, "export const APP_RELEASE_DATE = '.*?'", "export const APP_RELEASE_DATE = '$releaseDate'")

$notesPattern = "export const APP_RELEASE_NOTES = \[(.*?)\]"
$notesMatch = [regex]::Match($updatedContent, $notesPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

if ($notesMatch.Success) {
  $oldBlock = $notesMatch.Groups[1].Value
  $newTopNote = "  'Version updated to v$newVersion via $Mode update on $releaseDate.',"
  $trimmedBlock = $oldBlock.Trim()

  if ([string]::IsNullOrWhiteSpace($trimmedBlock)) {
    $newBlock = "`r`n$newTopNote`r`n"
  } else {
    $newBlock = "`r`n$newTopNote`r`n" + ($oldBlock.TrimStart("`r", "`n"))
  }

  $updatedContent = $updatedContent.Replace($oldBlock, $newBlock)
}

if ($DryRun) {
  Write-Host "Mode: $Mode"
  Write-Host "Old Version: $oldVersion"
  Write-Host "New Version: $newVersion"
  Write-Host "Old Build: $oldBuild"
  Write-Host "New Build: $buildNumber"
  Write-Host "Release Date: $releaseDate"
  exit 0
}

New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
Copy-Item -Path $appMetaPath -Destination $backupFile -Force

@"
Previous Version: $oldVersion
Previous Build: $oldBuild
Previous Release Date: $oldDate
Update Type: $Mode
New Version: $newVersion
New Build: $buildNumber
New Release Date: $releaseDate
Backed Up At: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@ | Set-Content -Path $backupInfo

Set-Content -Path $appMetaPath -Value $updatedContent

Write-Host "Version updated successfully."
Write-Host "Old version: $oldVersion"
Write-Host "New version: $newVersion"
Write-Host "Backup saved to: $backupFolder"
