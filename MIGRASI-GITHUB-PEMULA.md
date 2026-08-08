# Migrasi Google Apps Script ke GitHub — Panduan Pemula

## Tujuan migrasi ini

Migrasi tahap pertama **tidak memindahkan server aplikasi keluar dari Google Apps Script**. GitHub dipakai sebagai tempat penyimpanan source code dan riwayat versi.

Arsitektur setelah migrasi:

`User -> Google Apps Script Web App -> Code.gs -> Google Sheets / Google Drive`

`GitHub PRIVATE -> menyimpan Code.gs + Index.html + manifest + dokumentasi`

Dengan cara ini, Web App yang sudah berjalan tidak perlu diganti URL dan tidak perlu dirombak.

---

# FASE A — PALING MUDAH, TANPA INSTALL PROGRAM

## 1. Jangan hapus atau ubah deployment lama

Sebelum mulai, biarkan Apps Script dan Web App produksi tetap seperti sekarang.

Tujuan kita hanya membuat salinan source ke GitHub terlebih dahulu.

## 2. Buat repository GitHub baru

1. Login ke GitHub.
2. Klik tanda **+** di kanan atas.
3. Pilih **New repository**.
4. Isi nama repository, disarankan:

   `outstanding-backlog-vendor-eta`

5. Pada **Visibility**, pilih **Private**.
6. Jangan centang pembuatan README, `.gitignore`, atau License karena paket ini sudah menyediakannya.
7. Klik **Create repository**.

> WAJIB PRIVATE. Source aplikasi saat ini belum aman untuk repository publik.

## 3. Upload paket source

Buka repository yang baru dibuat, lalu:

1. Klik **Add file**.
2. Klik **Upload files**.
3. Drag & drop seluruh isi folder paket ini:
   - `Code.gs`
   - `Index.html`
   - `appsscript.json`
   - `README.md`
   - `MIGRASI-GITHUB-PEMULA.md`
   - `SECURITY.md`
   - `.gitignore`
   - `.clasp.json.example`
4. Pada Commit message isi:

   `Initial migration from Google Apps Script V7.14.3`

5. Klik **Commit changes**.

## 4. Cek hasil upload

Di halaman utama repository, pastikan minimal terlihat:

- `Code.gs`
- `Index.html`
- `appsscript.json`
- `README.md`

Kemudian buka **Settings** repository dan pastikan Visibility masih **Private**.

## 5. Selesai untuk tahap pertama

Pada tahap ini:

- GitHub sudah menjadi backup/version-control source.
- Apps Script produksi tidak berubah.
- Spreadsheet tidak berubah.
- Web App produksi tidak berubah.
- User/vendor tetap menggunakan Web App Google Apps Script yang sama.

JANGAN aktifkan GitHub Pages untuk aplikasi ini. Frontend sekarang memerlukan `google.script.run`, yang tersedia ketika halaman dijalankan oleh Google Apps Script HTML Service.

---

# FASE B — SETIAP PERUBAHAN DI GITHUB DAPAT DISINKRONKAN KE APPS SCRIPT DENGAN CLASP

Lakukan fase ini hanya jika Fase A sudah selesai dan repository sudah PRIVATE.

## 6. Ambil Script ID — BUKAN URL WEB APP

URL Web App/deployment yang berakhiran `/exec` **bukan Script ID**.

Cara mengambil Script ID:

1. Buka project Google Apps Script yang sekarang.
2. Di sidebar kiri klik **Project Settings** / ikon gear.
3. Cari bagian **IDs**.
4. Copy **Script ID**.

Simpan sementara. Jangan masukkan Script ID ke file publik.

## 7. Siapkan clasp jika komputer mengizinkan

`clasp` membutuhkan Node.js dan npm.

Setelah Node.js tersedia, buka Terminal / Command Prompt lalu jalankan:

```bash
npm install @google/clasp -g
```

Kemudian login dengan akun Google yang memiliki akses ke Apps Script:

```bash
clasp login
```

Browser akan terbuka untuk otorisasi Google.

## 8. Clone Apps Script produksi ke folder pembanding

**Jangan langsung menimpa folder GitHub.** Untuk pemula, clone dulu ke folder terpisah agar dapat dibandingkan.

```bash
mkdir apps-script-production-check
cd apps-script-production-check
clasp clone SCRIPT_ID_ANDA
```

Setelah selesai, cek bahwa project hasil clone memiliki `Code.gs`, `Index.html`, dan `appsscript.json`.

## 9. Bandingkan dengan paket GitHub

Pastikan `Code.gs` dan `Index.html` pada repository GitHub adalah versi yang memang ingin dipakai.

Pada paket yang diberikan ChatGPT, kedua file source disalin apa adanya dari file yang Anda lampirkan; nama file sudah disesuaikan dengan nama Apps Script yang diperlukan.

## 10. Hubungkan folder repository lokal ke Apps Script

Jika nanti repository sudah di-clone ke komputer, masuk ke folder repository lalu buat file `.clasp.json` berdasarkan `.clasp.json.example`.

Isi:

```json
{
  "scriptId": "SCRIPT_ID_ANDA",
  "rootDir": "."
}
```

File `.clasp.json` sudah dimasukkan ke `.gitignore`, jadi tidak ikut ke GitHub.

## 11. Cara mengirim perubahan ke Apps Script

Dari folder repository lokal:

```bash
clasp push
```

Perintah ini mengirim file source lokal ke project Apps Script yang terhubung.

**Penting:** `clasp push` memperbarui source project, tetapi Web App produksi yang menggunakan versioned deployment belum otomatis berpindah ke versi baru.

## 12. Test dulu sebelum update deployment produksi

Setelah `clasp push`:

1. Buka Apps Script editor.
2. Periksa apakah `Code.gs` dan `Index.html` benar.
3. Gunakan **Deploy -> Test deployments** bila diperlukan.
4. Pastikan login, dashboard, Outstanding PO, update vendor, notifikasi, history, user vendor, dan upload foto bekerja.

## 13. Update Web App tanpa mengganti URL produksi

Jika hasil test sudah benar:

1. Buka Apps Script.
2. Klik **Deploy**.
3. Klik **Manage deployments**.
4. Pilih deployment Web App aktif yang sekarang.
5. Klik **Edit**.
6. Pilih **New version**.
7. Isi deskripsi versi, contoh:

   `GitHub sync V7.14.3 - initial migration`

8. Klik **Deploy**.

Dengan mengedit deployment yang sama ke version baru, deployment ID/URL yang sama dapat dipertahankan.

---

# WORKFLOW HARIAN SETELAH MIGRASI

Gunakan urutan sederhana ini:

1. Edit source di komputer/repository.
2. Simpan perubahan.
3. Commit ke GitHub.
4. Jalankan `clasp push`.
5. Test Apps Script.
6. Jika valid, update **Manage deployments -> Edit -> New version -> Deploy**.

Contoh commit Git:

```bash
git add .
git commit -m "Fix loading vendor update"
git push
```

Lalu:

```bash
clasp push
```

---

# ROLLBACK JIKA UPDATE BERMASALAH

Karena deployment Apps Script menggunakan version, jangan panik dan jangan hapus deployment.

1. Buka **Deploy -> Manage deployments**.
2. Pilih deployment aktif.
3. Klik **Edit**.
4. Pilih version lama yang sebelumnya stabil.
5. Klik **Deploy**.

Repository GitHub juga menyimpan riwayat commit sehingga source sebelumnya dapat dilihat kembali.

---

# YANG JANGAN DILAKUKAN

1. Jangan membuat repository ini Public.
2. Jangan upload spreadsheet database ke repository.
3. Jangan upload `.clasprc.json`.
4. Jangan memasukkan password vendor/admin ke README atau GitHub Issues.
5. Jangan menghapus deployment produksi hanya karena source sudah ada di GitHub.
6. Jangan rename `Index.html` menjadi `index.html`; backend memanggil file `Index`.
7. Jangan aktifkan GitHub Pages untuk source ini dan berharap backend Apps Script otomatis berjalan.
8. Jangan melakukan `clasp push` sebelum memastikan Script ID benar.

---

# JIKA INGIN BENAR-BENAR PINDAH HOSTING DARI APPS SCRIPT KE GITHUB PAGES

Itu adalah proyek migrasi berbeda dan membutuhkan refactor besar, antara lain:

- mengganti seluruh `google.script.run` dengan HTTP API / `fetch()`;
- membuat endpoint backend;
- mendesain ulang autentikasi/session;
- menangani akses Spreadsheet/Drive dari backend;
- menangani upload foto;
- kebijakan CORS dan authorization.

Untuk versi saat ini, **GitHub sebagai source control + Apps Script sebagai runtime** adalah jalur paling aman dan paling sedikit risiko.
