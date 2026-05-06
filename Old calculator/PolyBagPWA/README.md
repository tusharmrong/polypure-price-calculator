# Poly Bag PWA

This folder contains an installable web app version of the poly bag calculator.

## Files

- `index.html`: Main calculator app
- `manifest.webmanifest`: PWA install metadata
- `service-worker.js`: Offline caching support
- `icon.svg`, `icon-192.svg`, `icon-512.svg`: App icons
- `netlify.toml`: Netlify hosting configuration
- `release.json`: Release manager control file
- `RELEASE_MANAGER.md`: Release manager guide
- `release-patch.bat`, `release-minor.bat`, `release-major.bat`: One-click release launchers

## Fastest way to get it on your phone

### Option: Netlify drag-and-drop

1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop) on your PC.
2. Drag the whole `PolyBagPWA` folder into the page.
3. Wait for Netlify to publish it and give you a live URL.
4. Open that URL on your Android phone in Chrome.
5. Tap `Install App` inside the page, or use Chrome menu -> `Add to Home screen`.

## If Netlify asks for a zip

Zip the contents of this folder, not the parent project folder.

## Important note

The install prompt works properly when the app is served over `https`. Opening `index.html` directly from local storage will not behave like a full phone app.

## GitHub Pages hosting

If you move this app to GitHub Pages:

1. Create a public GitHub repository
2. Upload the contents of this folder to the repository root
3. Turn on GitHub Pages from the `main` branch and `/ (root)` folder
4. Open the published GitHub Pages URL and test the app

This app already uses relative paths, so it is prepared to run from a GitHub Pages repository URL.

## Update workflow

1. Edit the app files in this folder.
2. Double-click `release-patch.bat`
3. Re-upload the folder to Netlify.

## Backup folder

The `backups/` folder is for keeping snapshots of working releases so you can roll back if needed.

## Release manager

Use `release.json` as the main place to track your current version, backup folder, and release notes.
Use `sync-release.ps1` to automatically push that version into the app files.
Use `new-release.ps1` to automatically bump the version and create a backup.

## One-click release files

- `release-patch.bat`: small fixes
- `release-minor.bat`: new features
- `release-major.bat`: major changes
