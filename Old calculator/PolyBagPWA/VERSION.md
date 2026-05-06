# Versioning Guide

Current app version: 2.4.4

Main release control file: release.json

Current release date: 2026-04-28

Current release status: stable

When you make an update:

1. Change the version number in release.json
2. Run sync-release.ps1
3. Save a copy of the current release inside backups/
4. Upload the updated app to Netlify again

Suggested version pattern:

- 1.0.1 for small fixes
- 1.1.0 for new features
- 2.0.0 for major redesigns or formula changes
