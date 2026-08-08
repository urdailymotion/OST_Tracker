# OST Tracker — GitHub + Vercel + PWA

Repository frontend publik untuk OST Tracker.

## Siap deploy
Tidak memerlukan Node.js, npm, framework, atau build command.

### Vercel
- Import repository GitHub ini.
- Framework Preset: **Other**.
- Root Directory: `./`
- Build Command: kosong/default.
- Output Directory: kosong/default.
- Deploy.

### GitHub Pages
Tetap kompatibel dengan GitHub Pages karena `index.html` berada di root.

## Struktur
- `index.html` — shell aplikasi / entry point
- `404.html` — fallback GitHub Pages
- `manifest.webmanifest` — metadata PWA
- `sw.js` — cache shell lokal; tidak meng-cache backend Apps Script
- `vercel.json` — header PWA/service worker
- `icons/` — icon PWA

## Backend
Backend tetap berjalan di Google Apps Script Web App dan database tetap Google Sheets/Drive.
