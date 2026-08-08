# Outstanding Backlog | Vendor ETA

GitHub source-control package for the existing Google Apps Script web application.

## Architecture

- **Frontend:** `Index.html`
- **Backend:** `Code.gs`
- **Runtime / hosting:** Google Apps Script Web App
- **Database:** Google Spreadsheet bound to the Apps Script project
- **Photo storage:** Google Drive through Apps Script
- **Source control:** GitHub (PRIVATE repository)

> GitHub is used here to store versions of the source code. The production application continues to run on Google Apps Script because the frontend uses `google.script.run` and the backend uses Apps Script services.

## Important filenames

Apps Script is case-sensitive for HTML file references in this project. `Code.gs` calls `HtmlService.createTemplateFromFile('Index')`, therefore keep the frontend filename as exactly:

`Index.html`

## Beginner migration

Read **`MIGRASI-GITHUB-PEMULA.md`** and follow **Fase A** first. Fase A requires only a browser and does not change the existing Web App.

## Optional local synchronization

After the GitHub copy is safely stored, `clasp` can be used later to synchronize GitHub/local files with the existing Apps Script project. Do not start with this until the browser-only backup is confirmed.

## Safety

Read `SECURITY.md`. Keep the repository **PRIVATE**.
