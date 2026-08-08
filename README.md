# OST Tracker - Vercel PWA Install Fix

Upload seluruh isi folder ini ke root repository GitHub `OST_Tracker`, menggantikan versi PWA sebelumnya.

## File utama
- `index.html` - shell aplikasi + install handler Android/iOS/Desktop
- `manifest.webmanifest` - manifest PWA untuk root domain Vercel
- `sw.js` - service worker
- `vercel.json` - header manifest/service worker
- `icons/` - icon normal + maskable

Setelah commit, Vercel akan redeploy otomatis jika repository sudah connected. Tunggu deployment Production selesai, lalu buka URL Production Vercel dari Chrome/Safari (bukan preview browser di aplikasi chat).
