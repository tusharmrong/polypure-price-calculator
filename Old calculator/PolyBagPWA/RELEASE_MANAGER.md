# Release Manager

This project uses a simple release manager based on `release.json`.

## Main control file

- `release.json`
- `new-release.ps1`
- `sync-release.ps1`

This is the single place to track:

- current app version
- release date
- release status
- backup folder name
- release notes
- update checklist

## How to use it

When you want to publish an update:

1. Run `new-release.ps1 -Bump patch`
2. Or use `minor` / `major` when needed
3. Review the updated `release.json`
4. Upload the app again to Netlify

## What `new-release.ps1` does automatically

- increases the version number
- updates the release date
- creates the backup folder
- copies the current project files into that backup
- adds an automatic release note
- runs `sync-release.ps1`

## Double-click launchers

You can also use:

- `release-patch.bat`
- `release-minor.bat`
- `release-major.bat`

These run the PowerShell release command for you.

## Example

If the current version is `1.0.0` and you want a small fix:

- run `new-release.ps1 -Bump patch`
- upload again

## Version pattern

- `1.0.1` = small fix
- `1.1.0` = new feature
- `2.0.0` = major redesign or major formula change
