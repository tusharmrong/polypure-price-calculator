# Poly Pure Price Calculator

Phase 1 foundation for a calculator-first PWA for Poly Pure.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages Notes

This Vite app is ready for GitHub Pages. The base path is controlled by `VITE_BASE_PATH`.

If the repository is hosted at:

```text
https://USERNAME.github.io/REPO_NAME/
```

then the Vite base should be:

```text
/REPO_NAME/
```

Example build command:

```bash
VITE_BASE_PATH=/REPO_NAME/ npm run build
```

On Windows PowerShell:

```powershell
$env:VITE_BASE_PATH="/REPO_NAME/"; npm run build
```

The generated production files will be in the `dist` folder.

The app uses hash-based routing so page refreshes work reliably on GitHub Pages without extra server rules.

## Deploy to GitHub Pages

This project includes a GitHub Actions workflow at:

`/.github/workflows/deploy.yml`

It builds with:

`VITE_BASE_PATH=/${REPO_NAME}/`

and deploys the `dist` folder to GitHub Pages automatically when you push to `main`.

### One-time GitHub setup

1. Push this project to a GitHub repository.
2. In GitHub, open `Settings -> Pages`.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab).

Your live URL will be:

`https://USERNAME.github.io/REPO_NAME/`

## Phase 1 Scope

- Dashboard
- Calculator placeholder UI
- Quotation placeholder form
- Invoice placeholder form
- Money Receipt placeholder form
- History placeholder list
- Settings placeholder form
- PWA manifest and service worker setup

Full price formulas, document generation, PDF export, backend storage, login, inventory, and accounting features are intentionally left for later phases.
