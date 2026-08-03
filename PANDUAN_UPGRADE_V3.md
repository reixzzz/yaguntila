# YAGUNTILA V3 — Panduan Lengkap Upgrade

Dokumen ini adalah panduan langkah-demi-langkah untuk memasang YAGUNTILA V3.
Ditulis dengan asumsi Anda **belum pernah** melakukan deploy Apps Script atau
Vercel sebelumnya — tidak ada langkah yang dilewati.

---

## 1. Ringkasan Upgrade

YAGUNTILA V3 adalah upgrade dari V2 yang sudah berjalan. Tidak ada teknologi
yang diganti (tetap React + Vite + Google Apps Script + Google Spreadsheet +
Google Drive + PWA + Vercel + GitHub). Perubahan utama:

| # | Perubahan | Menggantikan |
|---|-----------|--------------|
| 1 | Sistem Login (sheet `USERS`, token sesi ber-HMAC) | Dropdown Petugas manual + PIN Admin tunggal |
| 2 | Sheet `MASTER_METER_BARU` (stok meter READY/USED/CANCELLED) | Tidak ada validasi stok di V2 |
| 3 | Scan QR/Barcode (library `html5-qrcode`) | OCR (Tesseract.js) |
| 4 | Riwayat difilter per petugas login | Riwayat 10 laporan tim terakhir (tanpa filter) |
| 5 | Dashboard Stok Meter (tab baru) | — |
| 6 | Panel Admin penuh (User, Pelanggan, Meter) | Panel Admin PIN (CRUD nama petugas saja) |
| 7 | Redesain visual Material Design 3 | Desain flat V2 |

**Fitur V1/V2 yang 100% dipertahankan:** validasi berlapis, upload foto ke
Drive, GPS otomatis, kirim WhatsApp, draft otomatis, antrian offline, PWA,
Dashboard Rekap, Statistik Petugas, Dashboard Lokasi, Master Pelanggan (autofill
nama).

---

## 2. Arsitektur Baru

```
┌─────────────────┐        HTTPS (fetch)        ┌──────────────────────┐
│   React PWA      │ ───────────────────────────▶│ Google Apps Script    │
│  (Vercel hosting) │◀─────────────────────────── │ (doGet / doPost)      │
└─────────────────┘         JSON response         └──────────┬───────────┘
                                                               │
                                    ┌──────────────────────────┼──────────────────────────┐
                                    ▼                          ▼                          ▼
                          Google Spreadsheet            Google Drive              (tidak ada DB lain —
                     (Data Ganmet, USERS,           (folder foto meter)         sesuai batasan gratis)
                    MASTER_METER_BARU, dst)
```

Perbedaan dari V2: sebelum request submit/riwayat/admin diproses, Apps Script
sekarang memverifikasi **token sesi** (dibuat saat login, ditandatangani
HMAC-SHA256) sebelum mengizinkan aksi apa pun yang butuh identitas petugas.

---

## 3. Struktur Folder Baru

```
yaguntila/
├── apps-script/
│   └── Code.gs                     [BERUBAH — full rewrite V3]
├── public/
│   ├── favicon.ico
│   └── icons/
├── src/
│   ├── components/
│   │   ├── BarcodeScannerModal.jsx [BARU]
│   │   ├── BottomNav.jsx           [BERUBAH]
│   │   ├── CameraField.jsx         [BERUBAH — OCR dihapus]
│   │   ├── Header.jsx              [BERUBAH — tombol logout]
│   │   ├── InstallPrompt.jsx
│   │   ├── LoadingState.jsx
│   │   ├── OfflineBanner.jsx
│   │   ├── SelectField.jsx
│   │   ├── StatCard.jsx
│   │   ├── TextField.jsx
│   │   └── Toast.jsx
│   ├── hooks/
│   │   ├── useAuth.js              [BARU]
│   │   ├── useFormGanmet.js        [BERUBAH]
│   │   ├── useMasterPelanggan.js
│   │   ├── useMeterBaruCheck.js    [BARU]
│   │   ├── useOfflineQueue.js
│   │   └── useOnlineStatus.js
│   ├── pages/
│   │   ├── Admin.jsx               [BERUBAH — total]
│   │   ├── Dashboard.jsx           [BERUBAH — +tab Stok Meter]
│   │   ├── FormGanmet.jsx          [BERUBAH]
│   │   ├── Login.jsx               [BARU]
│   │   └── Riwayat.jsx             [BERUBAH]
│   ├── services/
│   │   ├── appsScriptService.js    [BERUBAH — total]
│   │   ├── geoService.js
│   │   ├── imageService.js
│   │   ├── offlineSyncService.js   [BERUBAH — kirim token]
│   │   └── whatsappService.js
│   ├── styles/
│   │   └── components.css          [BERUBAH — redesain total]
│   ├── utils/
│   │   ├── constants.js            [BERUBAH]
│   │   ├── localStorage.js         [BERUBAH — +sesi login]
│   │   └── validators.js           [BERUBAH]
│   ├── App.jsx                     [BERUBAH — gerbang login]
│   ├── index.css                   [BERUBAH — token desain baru]
│   └── main.jsx
├── index.html
├── package.json                    [BERUBAH — dependency]
└── vite.config.js
```

**File yang DIHAPUS** (fungsinya digantikan, sesuai instruksi upgrade):
- `src/services/ocrService.js` — digantikan `BarcodeScannerModal.jsx`
- `src/hooks/usePetugasList.js` — digantikan sistem login (`useAuth.js`)

---

## 4. Daftar File Baru

1. `src/pages/Login.jsx`
2. `src/hooks/useAuth.js`
3. `src/hooks/useMeterBaruCheck.js`
4. `src/components/BarcodeScannerModal.jsx`

## 5. Daftar File yang Berubah

`apps-script/Code.gs`, `src/utils/constants.js`, `src/utils/validators.js`,
`src/utils/localStorage.js`, `src/services/appsScriptService.js`,
`src/services/offlineSyncService.js`, `src/hooks/useFormGanmet.js`,
`src/components/CameraField.jsx`, `src/components/Header.jsx`,
`src/components/BottomNav.jsx`, `src/pages/FormGanmet.jsx`,
`src/pages/Riwayat.jsx`, `src/pages/Dashboard.jsx`, `src/pages/Admin.jsx`,
`src/App.jsx`, `src/index.css`, `src/styles/components.css`, `package.json`.

Seluruh isi file di atas sudah lengkap (bukan potongan) di dalam paket kode
yang saya berikan — silakan salin apa adanya.

---

## 6. Penjelasan Setiap Perubahan

**Login & Token Sesi.** `Code.gs` membuat sheet `USERS` otomatis (kolom
Username, Password, Nama Lengkap, Role, Status Aktif) lengkap dengan satu akun
`admin` default saat pertama kali dijalankan. Saat login berhasil, server
membuat token = `base64(payload) + "." + HMAC-SHA256(payload)` — payload berisi
username, nama, role, dan waktu kedaluwarsa (12 jam). Token ini disimpan di
`localStorage` HP petugas dan disertakan di setiap request yang butuh
identitas. Ini bukan sistem sesi database penuh, tapi cukup untuk mencegah
petugas memalsukan nama/role dari browser — jauh lebih aman dari PIN polos V2.

**Master Meter Baru & Validasi Stok.** Sebelum laporan diterima, server
mengecek sheet `MASTER_METER_BARU`. Nomor yang tidak terdaftar atau berstatus
`USED`/`CANCELLED` ditolak. Artinya: **admin wajib mengisi stok nomor meter
terlebih dulu** (lewat Panel Admin → Meter) sebelum petugas bisa memakainya.

**QR/Barcode Scanner.** `BarcodeScannerModal.jsx` memakai `html5-qrcode`
(gratis, open-source, jalan di browser, tidak mengirim gambar kamera ke
server manapun). Mendukung QR Code dan barcode 1D umum. Input manual tetap ada
sebagai cadangan.

**Riwayat per Petugas.** `ambilRiwayatLaporan` di backend sekarang menerima
nama dari token (bukan parameter bebas dari client), lalu memfilter baris
sebelum dikirim ke frontend.

**Panel Admin.** Sekarang punya 3 sub-tab: User, Pelanggan, Meter — masing-
masing dengan tambah/edit/hapus (atau nonaktifkan untuk User). Setiap aksi
tulis diverifikasi ulang di server (`wajibAdmin(token)`), bukan hanya
disembunyikan di UI.

**Redesain Visual.** Warna brand (`--biru-pln`, `--hijau-sukses`) dan identitas
YAGUNTILA/"Ganmet Afif Man" dipertahankan; yang berubah adalah radius
membesar, shadow lebih lembut, animasi masuk halus (`fade-in-up`, `pop-in`),
skeleton shimmer, dan tipografi lebih tegas.

---

## 7. Tutorial Mengganti Source Code

1. Download seluruh paket `yaguntila-v3.zip` yang saya sediakan.
2. **Backup dulu** folder project V2 Anda saat ini (copy ke folder lain,
   misal `yaguntila-v2-backup/`) — supaya bisa rollback (lihat §18).
3. Ekstrak `yaguntila-v3.zip`.
4. Salin **satu variabel penting** dari project lama Anda ke file baru:
   buka `src/utils/constants.js` V2 lama Anda, salin nilai
   `APPS_SCRIPT_URL` dan `APP_SECRET_KEY`, lalu tempelkan ke
   `src/utils/constants.js` V3 yang baru (menimpa nilai contoh di sana).
   *(`APP_SECRET_KEY` di frontend HARUS SAMA PERSIS dengan `APP_SECRET_KEY`
   di `Code.gs` — lihat §8 langkah 3).*
5. Timpa seluruh folder project lama Anda dengan isi folder V3 (atau
   hapus folder lama lalu ganti dengan yang baru — asal `.git/` folder
   Anda tidak ikut terhapus jika Anda memakai Git, lihat §13).

---

## 8. Tutorial Update Google Apps Script

1. Buka Spreadsheet **YAGUNTILA DATABASE** Anda → menu **Extensions →
   Apps Script**.
2. Di editor Apps Script, buka file `Code.gs` yang sudah ada.
3. **Hapus seluruh isi lama**, lalu salin-tempel seluruh isi
   `apps-script/Code.gs` dari paket V3.
4. Isi 3 baris konfigurasi di bagian atas file:
   - `SPREADSHEET_ID` — ID Spreadsheet Anda (**gunakan ID yang SAMA**
     dengan V2, JANGAN buat Spreadsheet baru, supaya data lama tidak
     hilang).
   - `DRIVE_FOLDER_ID` — ID folder Drive foto Anda (sama seperti V2).
   - `APP_SECRET_KEY` — **harus identik** dengan nilai di
     `src/utils/constants.js` frontend (langkah §7.4).
5. Simpan (Ctrl+S / ikon disket).
6. Di dropdown fungsi (samping tombol ▷ Run), pilih fungsi
   **`setupAwalV3`**, lalu klik **Run**.
7. Google akan meminta izin akses (Spreadsheet, Drive) — klik **Review
   permissions**, pilih akun Anda, klik **Advanced → Buka (nama
   project) (tidak aman)** lalu **Allow**. Ini normal untuk script milik
   sendiri yang belum diverifikasi Google.
8. Buka tab **Execution log** di bawah — pastikan muncul pesan "Setup V3
   selesai...". Ini berarti sheet `USERS` dan `MASTER_METER_BARU` sudah
   otomatis dibuat.
9. **Deploy ulang sebagai Web App:**
   - Klik **Deploy → Manage deployments**.
   - Klik ikon pensil (Edit) pada deployment yang aktif.
   - Di "Version", pilih **New version**.
   - Klik **Deploy**.
   - **PENTING:** URL Web App (`.../exec`) biasanya TETAP SAMA seperti
     sebelumnya selama Anda meng-edit deployment yang sama (bukan
     membuat deployment baru dari nol) — jadi `APPS_SCRIPT_URL` di
     frontend biasanya tidak perlu diganti. Tapi periksa ulang: salin
     URL yang tertera dan bandingkan dengan yang ada di
     `src/utils/constants.js`.

---

## 9. Tutorial Update Spreadsheet

Tidak ada langkah manual tambahan di Spreadsheet — sheet `USERS` dan
`MASTER_METER_BARU` sudah otomatis dibuat oleh `setupAwalV3()` (§8.6). Yang
perlu Anda lakukan **secara manual**:

1. Buka sheet **USERS** → **ganti password akun `admin` default**
   (`ganti-password-ini`) dengan password Anda sendiri, langsung di sel
   Spreadsheet (kolom B), ATAU lewat Panel Admin setelah login pertama kali.
2. Tambahkan akun untuk setiap petugas lapangan Anda — bisa langsung
   ketik di sheet USERS (Username, Password, Nama Lengkap, Role=`PETUGAS`,
   Status Aktif=`TRUE`), atau lewat Panel Admin → tab User → "Tambah User
   Baru" setelah Anda login sebagai admin.
3. Buka sheet **MASTER_METER_BARU** → isi nomor-nomor meter baru yang
   siap dipakai petugas (kolom A = Nomor Meter, kolom B = `READY`), ATAU
   lebih mudah lewat Panel Admin → tab Meter → "Tambah Banyak Sekaligus"
   (tempel daftar nomor, satu per baris).
4. Sheet `Petugas` (V1/V2 lama) **boleh dibiarkan apa adanya** — tidak
   dipakai lagi oleh aplikasi V3, tapi tidak mengganggu apa pun jika
   dibiarkan sebagai arsip.

---

## 10. Tutorial Update Google Drive

**Tidak ada perubahan.** Folder Drive foto yang sama dari V2 tetap dipakai
V3 — `DRIVE_FOLDER_ID` yang Anda isi di §8.4 harus folder yang sama seperti
sebelumnya, supaya foto lama & baru tetap dalam satu tempat.

---

## 11. Tutorial Menjalankan Project Lokal

Prasyarat: **Node.js** versi 18 ke atas sudah terpasang di komputer Anda
(cek dengan mengetik `node -v` di terminal/Command Prompt).

1. Buka terminal, arahkan ke folder project:
   ```
   cd path/ke/folder/yaguntila
   ```
2. Karena dependency berubah (Tesseract.js dihapus, html5-qrcode
   ditambahkan), **hapus dulu instalasi lama** jika ada:
   ```
   rm -rf node_modules package-lock.json
   ```
   (Di Windows Command Prompt: `rmdir /s /q node_modules` lalu
   `del package-lock.json`)
3. Install ulang dependency:
   ```
   npm install
   ```
4. Jalankan server development:
   ```
   npm run dev
   ```
5. Buka browser ke alamat yang muncul (biasanya `http://localhost:5173`).
6. **Catatan kamera/QR Scanner:** browser hanya mengizinkan akses kamera
   di alamat `https://` ATAU `http://localhost` — jadi testing scanner
   di `localhost` tetap berfungsi normal, tapi tidak akan berfungsi jika
   Anda membuka lewat alamat IP jaringan lokal (`http://192.168.x.x`)
   tanpa HTTPS.

---

## 12. Tutorial Build Production

```
npm run build
```

Perintah ini menghasilkan folder `dist/` berisi file statis siap deploy.
Untuk melihat pratinjau hasil build sebelum deploy:

```
npm run preview
```

---

## 13. Tutorial Commit Git

Jika project Anda sudah terhubung ke Git sebelumnya (ada folder
`.git/` tersembunyi), jangan hapus folder itu saat mengganti file (lihat
§7.5) — cukup timpa file di dalamnya.

```
git status
```
Pastikan Anda melihat daftar file yang berubah sesuai §5 di atas.

```
git add .
git commit -m "Upgrade ke YAGUNTILA V3: sistem login, master meter, QR scanner, redesain UI"
```

Jika project Anda **belum** pernah di-Git-kan:
```
git init
git add .
git commit -m "YAGUNTILA V3"
```

---

## 14. Tutorial Push GitHub

Jika repository GitHub sudah ada sebelumnya (dipakai V2):
```
git push origin main
```
(Ganti `main` dengan nama branch Anda jika berbeda, misal `master`.)

Jika belum ada repository:
1. Buat repository baru di github.com (jangan centang "Initialize with
   README" supaya tidak konflik dengan file lokal Anda).
2. Jalankan:
   ```
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git branch -M main
   git push -u origin main
   ```

---

## 15. Tutorial Deploy Ulang ke Vercel

Jika project sudah pernah di-deploy ke Vercel dan terhubung ke repository
GitHub yang sama: **Anda tidak perlu melakukan apa pun secara manual** —
Vercel otomatis mendeteksi `git push` di langkah §14 dan men-deploy ulang
dalam 1-2 menit. Cek progres di dashboard vercel.com → project Anda → tab
**Deployments**.

Jika belum pernah terhubung:
1. Buka vercel.com → **Add New → Project**.
2. Pilih repository GitHub Anda.
3. Framework Preset: pilih **Vite** (biasanya terdeteksi otomatis).
4. Build Command: `npm run build` (default). Output Directory: `dist`
   (default).
5. Klik **Deploy**.

**Variabel lingkungan:** karena `APPS_SCRIPT_URL` dan `APP_SECRET_KEY`
disimpan langsung di `src/utils/constants.js` (bukan file `.env`, sesuai
pola V1/V2 Anda), tidak ada environment variable tambahan yang perlu
diisi di dashboard Vercel.

---

## 16. Cara Menguji Seluruh Fitur (Checklist Testing)

**Login**
- [ ] Login dengan akun admin default berhasil, lalu password sudah diganti.
- [ ] Login dengan username/password salah menampilkan pesan error, bukan diam saja.
- [ ] Akun yang dinonaktifkan admin tidak bisa login lagi.
- [ ] Setelah login, nama petugas muncul otomatis di halaman Laporan (bukan dropdown).

**Form Laporan**
- [ ] Mengetik ID Pelanggan yang ada di Master otomatis mengisi Nama Pelanggan (read-only).
- [ ] ID Pelanggan yang tidak ada menampilkan pesan "tidak ditemukan".
- [ ] Tombol "Scan" membuka kamera dan berhasil membaca QR/Barcode uji coba.
- [ ] Nomor meter berstatus READY menampilkan hint hijau "tersedia".
- [ ] Nomor meter yang sudah USED ditolak sebelum submit (pesan error muncul).
- [ ] Nomor meter yang tidak terdaftar di database ditolak.
- [ ] Submit berhasil mengubah status meter tersebut menjadi USED di sheet MASTER_METER_BARU.
- [ ] Foto Meter Lama & Baru wajib diisi sebelum submit (tanpa OCR, hanya dokumentasi).
- [ ] Kirim ke WhatsApp menampilkan template dengan nama petugas yang benar.
- [ ] Matikan koneksi internet → submit → laporan masuk ke antrian offline, muncul badge di ikon Riwayat.
- [ ] Nyalakan kembali internet → antrian offline otomatis terkirim.

**Riwayat**
- [ ] Hanya menampilkan laporan milik petugas yang sedang login (uji dengan 2 akun berbeda).

**Dashboard**
- [ ] Tab Rekap, Petugas, Stok Meter, Lokasi semua memuat data tanpa error.
- [ ] Petugas biasa otomatis melihat statistiknya sendiri di tab "Petugas" (tanpa dropdown).
- [ ] Admin bisa memilih & melihat statistik petugas lain di tab "Petugas".
- [ ] Tab Stok Meter menampilkan angka READY/USED/CANCELLED yang benar.

**Panel Admin** *(login sebagai ADMIN)*
- [ ] Tab Admin hanya muncul untuk akun role ADMIN, tidak muncul untuk PETUGAS.
- [ ] Tambah/Edit/Nonaktifkan User berhasil dan langsung terlihat di sheet USERS.
- [ ] Tambah/Edit/Hapus Master Pelanggan berhasil.
- [ ] Tambah satu & tambah banyak Master Meter berhasil, semua berstatus READY.
- [ ] Ubah status meter (READY/CANCELLED) berhasil dan langsung berlaku di validasi form.

**PWA**
- [ ] Banner "Pasang ke Home Screen" muncul di Android Chrome.
- [ ] Aplikasi tetap membuka tampilan (shell) saat sinyal internet hilang sesaat.

---

## 17. Daftar Kemungkinan Bug & Mitigasinya

| Potensi Bug | Mitigasi |
|---|---|
| Petugas menutup browser sebelum toast sukses muncul, ragu apakah laporan terkirim | Cek tab Riwayat — laporan yang berhasil akan langsung tampil di 10 laporan terakhir. |
| Dua petugas scan nomor meter yang sama nyaris bersamaan | `LockService` di backend (dipertahankan dari V1) menyerialkan seluruh proses submit, sehingga hanya salah satu yang akan berhasil menandai status USED; yang kedua akan ditolak dengan pesan "sudah pernah digunakan". |
| Admin lupa mengisi stok MASTER_METER_BARU sebelum go-live | Semua submit laporan akan ditolak dengan pesan "tidak terdaftar" — pastikan Panel Admin → Meter sudah diisi sebelum petugas mulai bekerja di hari pertama. |
| Kamera scanner tidak bisa dibuka di HP tertentu (izin ditolak / kamera dipakai app lain) | Modal scanner menampilkan pesan error dan tombol "Tutup & Isi Manual" — input manual selalu tersedia sebagai cadangan. |
| Token sesi kedaluwarsa (12 jam) di tengah pengisian form panjang | Data form tetap aman di draft otomatis (localStorage); petugas hanya perlu login ulang, lalu draft akan otomatis terisi kembali (kecuali foto, yang harus diambil ulang demi keamanan/ukuran data). |
| Label QR/Barcode meter rusak/pudar tidak terbaca kamera | Tombol input manual pada field Nomor Meter Baru selalu aktif sebagai cadangan. |
| Admin menghapus akun sendiri yang sedang aktif login di HP lain | Token akan langsung ditolak di request berikutnya begitu status akun tidak aktif (dicek ulang tiap request, bukan hanya saat login), sehingga akses tercabut dalam hitungan detik tanpa perlu menunggu token kedaluwarsa. |

---

## 18. Cara Rollback Jika Terjadi Error

1. **Rollback kode frontend:** timpa kembali folder project dengan
   backup V2 Anda dari §7.2 (atau `git revert`/`git reset --hard
   <commit-sebelum-V3>` jika memakai Git), lalu `git push` ulang —
   Vercel akan otomatis men-deploy versi lama kembali.
2. **Rollback Apps Script:** buka **Deploy → Manage deployments** di
   editor Apps Script, klik ikon pensil, lalu di dropdown "Version"
   pilih versi SEBELUM upgrade V3, klik **Deploy**.
3. **Data di Spreadsheet aman:** `setupAwalV3()` tidak pernah menghapus
   atau menimpa sheet/data yang sudah ada — sheet baru (`USERS`,
   `MASTER_METER_BARU`) yang dibuatnya boleh dibiarkan begitu saja
   (tidak dipakai) jika Anda rollback ke V2, tidak akan mengganggu
   fitur V2 lama.
4. Jika rollback dilakukan karena masalah tertentu, cek **sheet "Log
   Error"** di Spreadsheet terlebih dahulu sebelum rollback — error yang
   tercatat di sana seringkali membantu diagnosis lebih cepat daripada
   langsung rollback penuh.
