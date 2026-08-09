# OST Tracker — Vercel PWA / WebAPK FLAT FIX

Versi ini dibuat khusus agar semua file dapat di-upload langsung ke ROOT repository GitHub tanpa folder `icons`.

## Upload ke root repository
Upload/replace semua file dalam paket ini. Setelah commit, tunggu deployment Vercel berstatus Ready.

## Tes Android
1. Gunakan Google Chrome Android.
2. Buka URL production Vercel (bukan GitHub Pages dan bukan browser dalam WhatsApp/Telegram).
3. Refresh setelah deployment baru selesai.
4. Tunggu sampai tombol Install App tersedia dan tekan tombol tersebut.
5. Dialog Chrome harus menawarkan **Install**, bukan hanya pembuatan shortcut biasa.
6. Setelah berhasil, buka OST Tracker dari ikon launcher. Tombol Install akan disembunyikan pada mode standalone / setelah event appinstalled.

Jika pernah membuka versi lama, hapus data situs/cache untuk domain Vercel atau uninstall shortcut lama sebelum pengujian ulang agar service worker/manifest lama tidak tertahan.


## Update v5
- Tombol **Buka Langsung** disembunyikan pada komputer/laptop.
- Tombol tersebut hanya ditampilkan pada perangkat mobile/touch phone-class.
- Alur instalasi PWA tidak diubah.


Update V6: tombol **Buka Langsung** sekarang hanya tampil pada perangkat kelas HP; tablet/iPad dan desktop/laptop tidak menampilkannya.


## Update V7
- Fitur/tombol **Buka Langsung** dihapus dari shell PWA, termasuk saat aplikasi dibuka dari HP.
- Tombol **Install App** dan mekanisme PWA tetap dipertahankan.
- Cache service worker dinaikkan versinya agar tampilan lama tidak tertahan di perangkat.
