param(
    [string]$ProjectRoot = $PSScriptRoot
)

$releaseFile = Join-Path $ProjectRoot "release.json"
$indexFile = Join-Path $ProjectRoot "index.html"
$serviceWorkerFile = Join-Path $ProjectRoot "service-worker.js"
$versionFile = Join-Path $ProjectRoot "VERSION.md"

if (-not (Test-Path -LiteralPath $releaseFile)) {
    throw "release.json not found."
}

$release = Get-Content -LiteralPath $releaseFile -Raw | ConvertFrom-Json
$version = $release.version
$releaseDate = $release.releaseDate
$status = $release.status

if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Version is missing in release.json."
}

$indexContent = Get-Content -LiteralPath $indexFile -Raw
$indexContent = [regex]::Replace($indexContent, 'const APP_VERSION = ".*?";', "const APP_VERSION = `"$version`";")
$indexContent = [regex]::Replace($indexContent, '<span id="appVersion">.*?</span>', "<span id=`"appVersion`">Version $version</span>")
$indexContent = [regex]::Replace($indexContent, '<span id="updateStatus">.*?</span>', "<span id=`"updateStatus`">$status release</span>")
Set-Content -LiteralPath $indexFile -Value $indexContent -Encoding UTF8

$serviceWorkerContent = Get-Content -LiteralPath $serviceWorkerFile -Raw
$serviceWorkerContent = [regex]::Replace($serviceWorkerContent, 'const APP_VERSION = ".*?";', "const APP_VERSION = `"$version`";")
Set-Content -LiteralPath $serviceWorkerFile -Value $serviceWorkerContent -Encoding UTF8

$versionContent = @"
# Versioning Guide

Current app version: $version

Main release control file: release.json

Current release date: $releaseDate

Current release status: $status

When you make an update:

1. Change the version number in release.json
2. Run sync-release.ps1
3. Save a copy of the current release inside backups/
4. Upload the updated app to Netlify again

Suggested version pattern:

- 1.0.1 for small fixes
- 1.1.0 for new features
- 2.0.0 for major redesigns or formula changes
"@
Set-Content -LiteralPath $versionFile -Value $versionContent -Encoding UTF8

Write-Output "Release synced successfully."
Write-Output "Version: $version"
Write-Output "Release date: $releaseDate"
Write-Output "Status: $status"
