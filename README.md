# YAGUNTILA V2 — "Ganmet Afif Man"

Dokumen ini adalah panduan **UPGRADE** dari YAGUNTILA V1 (yang sudah berjalan
production) ke YAGUNTILA V2. Ditulis untuk pengguna yang **belum
berpengalaman dengan backend** — ikuti setiap tahap secara berurutan.

> **Jika ini instalasi BARU** (belum pernah punya V1 sama sekali), Anda
> tetap mengikuti seluruh tahap di bawah ini secara berurutan — cukup
> lewati bagian "migrasi data lama" karena memang belum ada data lama.

---

## DAFTAR ISI

- [Apa yang Baru di V2](#apa-yang-baru-di-v2)
- [Sebelum Mulai — Backup](#sebelum-mulai--backup)
- [TAHAP A — Update Google Apps Script](#tahap-a--update-google-apps-script)
- [TAHAP B — Update Google Spreadsheet](#tahap-b--update-google-spreadsheet)
- [TAHAP C — Update Google Drive](#tahap-c--update-google-drive)
- [TAHAP D — Update Kode React Lokal](#tahap-d--update-kode-react-lokal)
- [TAHAP E — Menjalankan Project Secara Lokal](#tahap-e--menjalankan-project-secara-lokal)
- [TAHAP F — Build Production](#tahap-f--build-production)
- [TAHAP G — Commit & Push ke GitHub](#tahap-g--commit--push-ke-github)
- [TAHAP H — Deploy Ulang ke Vercel](#tahap-h--deploy-ulang-ke-vercel)
- [TAHAP I — Memastikan PWA Tetap Berfungsi](#tahap-i--memastikan-pwa-tetap-berfungsi)
- [Struktur Folder Project (V2)](#struktur-folder-project-v2)
- [Penjelasan Fungsi Setiap File Baru/Berubah](#penjelasan-fungsi-setiap-file-barudiubah)
- [Checklist Testing Lengkap](#checklist-testing-lengkap)
- [Daftar Potensi Bug & Mitigasi](#daftar-potensi-bug--mitigasi)
- [Cara Maintenance Aplikasi](#cara-maintenance-aplikasi)

---

## APA YANG BARU DI V2

| # | Fitur | Ringkasan |
|---|---|---|
| 1 | Dashboard Rekap | Total laporan hari/minggu/bulan, breakdown jenis meter & alasan, grafik 7 hari & per bulan, ranking petugas. |
| 2 | Statistik Petugas | Pilih nama petugas → lihat jumlah laporan & breakdown miliknya. |
| 3 | Master Pelanggan | Ketik ID Pelanggan → Nama Pelanggan otomatis terisi (readonly) dari database. |
| 4 | Validasi Nomor Meter Baru vs Database | Menolak submit jika Nomor Meter Baru tidak sesuai data SPK di MASTER_PELANGGAN. |
| 5 | Anti Nomor Meter Ganda | Menolak submit jika Nomor Meter Baru sudah pernah dipakai sebelumnya. |
| 6 | GPS Otomatis | Lokasi (latitude/longitude/link Google Maps) otomatis terekam saat submit. |
| 7 | Riwayat Laporan | Lihat 10 laporan terakhir tim langsung dari aplikasi. |
| 8 | Draft Otomatis | Isian form tersimpan otomatis, tidak hilang walau HP/browser ditutup. |
| 9 | Offline Queue | Laporan tetap tersimpan saat tidak ada internet, otomatis terkirim saat sinyal kembali. |
| 10 | Panel Admin Petugas | Tambah/edit/hapus nama petugas dari dalam aplikasi (dengan PIN), tanpa buka Spreadsheet. |
| 11 | Dashboard Lokasi | Daftar laporan dengan GPS, klik untuk buka di Google Maps. |
| — | **Bug fix** | Nomor Meter Lama kini menerima 6-12 digit (dahulu wajib 11 digit persis). |

Seluruh fitur V1 (form input, validasi, OCR, kompresi foto, kirim WhatsApp,
PWA, dropdown petugas dinamis) **tetap berjalan seperti sebelumnya** —
V2 adalah tambahan, bukan penggantian.

---

## SEBELUM MULAI — BACKUP

**WAJIB dilakukan sebelum mengubah apapun**, agar jika ada kesalahan Anda
bisa kembali ke kondisi semula:

1. Buka Spreadsheet `YAGUNTILA DATABASE` Anda.
2. Klik **File → Make a copy / Buat salinan**.
3. Beri nama salinan, misal `YAGUNTILA DATABASE - BACKUP SEBELUM V2`.
4. Simpan salinan ini di Google Drive Anda dan JANGAN dihapus.
5. Di script.google.com, buka project Apps Script Anda. Klik ikon **riwayat
   versi (jam berputar)** di kanan atas editor, atau salin-tempel seluruh
   kode `Code.gs` lama Anda ke sebuah file teks lokal sebagai cadangan.

---

## TAHAP A — Update Google Apps Script

**Tujuan:** mengganti kode backend lama (V1) dengan kode backend baru (V2)
yang mendukung seluruh fitur baru, tanpa kehilangan data lama.

1. Buka [script.google.com](https://script.google.com), masuk ke project
   Apps Script YAGUNTILA Anda yang sudah ada (BUKAN membuat project baru).
2. Di editor, **hapus seluruh kode lama** yang ada di file `Code.gs`.
3. Buka file `apps-script/Code.gs` dari paket V2 yang saya berikan, **salin
   seluruh isinya**, dan **tempel** ke editor script.google.com (menimpa
   yang lama).
4. Isi 4 variabel konfigurasi di bagian paling atas kode:
   ```javascript
   const SPREADSHEET_ID = 'ISI_DENGAN_ID_SPREADSHEET_PRODUKSI_ANDA';
   const DRIVE_FOLDER_ID = 'ISI_DENGAN_ID_FOLDER_DRIVE_PRODUKSI_ANDA';
   const APP_SECRET_KEY = 'ISI_DENGAN_KUNCI_RAHASIA_YANG_SAMA_DENGAN_V1_ANDA';
   const ADMIN_PIN = 'BUAT_PIN_BARU_UNTUK_PANEL_ADMIN';
   ```
   > **PENTING:** `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, dan `APP_SECRET_KEY`
   > **HARUS SAMA** dengan nilai yang sudah Anda pakai di V1 — supaya
   > aplikasi tetap menulis ke Spreadsheet & Drive yang sama, dan supaya
   > kunci rahasia tetap cocok dengan yang akan diisi di kode React.
   > `ADMIN_PIN` adalah nilai BARU yang boleh Anda tentukan sendiri.
5. Simpan project (`Ctrl+S` / ikon disket).
6. **Jalankan migrasi struktur Spreadsheet** — ini WAJIB jika Spreadsheet
   Anda sudah berjalan sejak V1:
   - Di dropdown pemilihan fungsi (dekat tombol Run), pilih `migrasiKolomV2`.
   - Klik **Run**. Fungsi ini HANYA menambahkan header kolom baru (L-P)
     di sheet "Data Ganmet" — **tidak menyentuh data lama sama sekali**.
7. **Jalankan setup sheet baru**:
   - Pilih fungsi `setupAwal` di dropdown, klik **Run**.
   - Fungsi ini membuat sheet `MASTER_PELANGGAN`, `Log Error`, dan
     `Setting` jika belum ada. Aman dijalankan berkali-kali.
8. **Deploy ulang sebagai Web App** (URL Web App TIDAK akan berubah jika
   Anda mengikuti langkah ini dengan benar):
   - Klik **Deploy → Manage deployments**.
   - Klik ikon pensil (Edit) pada deployment yang aktif.
   - Pada "Version", pilih **New version**.
   - Klik **Deploy**.
   - Jika diminta otorisasi ulang, klik **Authorize access**, pilih akun
     Google Anda, **Advanced → Go to (nama project) (unsafe) → Allow**.
9. Catat kembali Web App URL Anda (seharusnya SAMA dengan URL V1 — jika
   memakai "Manage deployments → Edit" seperti di atas, bukan "New
   deployment", URL tidak akan berubah).

---

## TAHAP B — Update Google Spreadsheet

**Tujuan:** memastikan struktur Spreadsheet sesuai kebutuhan V2.

Sebagian besar pekerjaan ini sudah otomatis dilakukan oleh `setupAwal()`
dan `migrasiKolomV2()` di Tahap A. Yang perlu Anda lakukan secara MANUAL:

1. Buka Spreadsheet `YAGUNTILA DATABASE` Anda.
2. Buka sheet **MASTER_PELANGGAN** (baru dibuat otomatis). Isi data
   pelanggan yang sudah Anda punya rencana kerjanya, dengan kolom:
   - **A: ID Pelanggan** (12 digit)
   - **B: Nama Pelanggan**
   - **C: Nomor Meter Baru** (boleh dikosongkan jika belum ada rencana SPK
     untuk pelanggan tersebut — lihat catatan di bawah)

   > **Catatan penting:** jika kolom C (Nomor Meter Baru) untuk satu baris
   > pelanggan DIKOSONGKAN, maka petugas BEBAS mengisi nomor meter baru
   > apapun untuk pelanggan tersebut (validasi cross-check dilewati). Jika
   > kolom C DIISI, maka nomor yang diketik petugas harus sama persis,
   > atau submit akan ditolak dengan pesan "Nomor meter baru tidak sesuai
   > database."

3. Sheet **Data Ganmet** sekarang memiliki kolom tambahan:
   - **L: Latitude, M: Longitude, N: Google Maps URL** (terisi otomatis
     oleh aplikasi saat petugas submit dan mengizinkan akses lokasi).
   - **O: Preview Foto Lama, P: Preview Foto Baru** (formula `IMAGE()`,
     dahulu di V1 berada di kolom L/M — sekarang dipindah ke O/P agar
     tidak bertabrakan dengan kolom GPS yang baru).
   - Baris data LAMA Anda (dari V1) akan terlihat kosong di kolom L-P —
     ini NORMAL, karena baris tersebut dibuat sebelum fitur GPS/preview
     baru ada. Tidak perlu diisi manual.
4. Sheet **Log Error** (baru) — di sini tercatat otomatis jika ada
   kegagalan di backend (misal error saat upload foto). Cek sheet ini
   sesekali untuk memantau kesehatan sistem.
5. Sheet **Setting** (baru) — hanya catatan referensi PIN Admin Anda
   (nilai PIN yang SEBENARNYA dibaca dari `Code.gs`, bukan dari sheet ini
   — sheet ini hanya pengingat visual untuk Anda).

---

## TAHAP C — Update Google Drive

**Tujuan:** memastikan penyimpanan foto tetap konsisten.

**Tidak ada perubahan struktur folder Drive di V2** — foto tetap disimpan
ke folder `YAGUNTILA_UPLOAD` yang sama seperti V1, dengan format nama
file yang sama. Tidak ada tindakan tambahan yang diperlukan di Drive.

---

## TAHAP D — Update Kode React Lokal

**Tujuan:** memasukkan kode V2 ke folder project di komputer Anda dan
mengisi konfigurasi yang diperlukan.

1. Pastikan Anda memiliki folder project `yaguntila/` di komputer (hasil
   clone dari GitHub, atau dari paket V1 sebelumnya).
2. Timpa seluruh isi folder `yaguntila/` Anda dengan isi paket V2 yang
   saya berikan (semua file baru DAN file yang diubah).
3. Buka file `src/utils/constants.js`. Pastikan 2 baris ini **SAMA**
   dengan yang sudah Anda pakai di V1 (supaya frontend tetap bisa
   berbicara dengan backend yang sudah berjalan):
   ```javascript
   export const APPS_SCRIPT_URL = 'URL_WEB_APP_ANDA_DARI_TAHAP_A';
   export const APP_SECRET_KEY = 'KUNCI_RAHASIA_YANG_SAMA_DENGAN_DI_CODE.GS';
   ```
4. Di file yang sama, isi PIN Admin (HARUS SAMA dengan `ADMIN_PIN` di
   `Code.gs` pada Tahap A):
   ```javascript
   export const ADMIN_PIN = 'PIN_YANG_SAMA_DENGAN_CODE.GS_ANDA';
   ```
5. Simpan file.

---

## TAHAP E — Menjalankan Project Secara Lokal

**Tujuan:** menguji seluruh perubahan di komputer sebelum dideploy ke
internet.

1. Buka Terminal/Command Prompt, masuk ke folder project:
   ```bash
   cd path/ke/folder/yaguntila
   ```
2. Install seluruh library (termasuk library baru `recharts` untuk
   grafik Dashboard):
   ```bash
   npm install
   ```
3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
4. Buka URL yang muncul di Terminal (biasanya `http://localhost:5173`)
   di browser Chrome.
5. Anda akan melihat 4 tab navigasi di bagian bawah: **Laporan, Riwayat,
   Dashboard, Admin**. Uji masing-masing — lihat
   [Checklist Testing Lengkap](#checklist-testing-lengkap) di bawah.

---

## TAHAP F — Build Production

**Tujuan:** memastikan kode siap dideploy tanpa error.

1. Dari folder project, jalankan:
   ```bash
   npm run build
   ```
2. Tunggu sampai muncul tulisan `✓ built in ...s` tanpa ada tulisan
   `error` berwarna merah.
3. (Opsional) Untuk melihat hasil build sebelum benar-benar deploy:
   ```bash
   npm run preview
   ```
   lalu buka URL yang muncul.

---

## TAHAP G — Commit & Push ke GitHub

**Tujuan:** menyimpan perubahan kode ke riwayat GitHub Anda, sebagai
syarat sebelum Vercel bisa men-deploy ulang otomatis.

1. Dari folder project, periksa file apa saja yang berubah:
   ```bash
   git status
   ```
2. Tambahkan seluruh perubahan:
   ```bash
   git add .
   ```
3. Commit dengan pesan yang jelas:
   ```bash
   git commit -m "Upgrade ke YAGUNTILA V2: Dashboard, Master Pelanggan, GPS, Offline Queue, Panel Admin"
   ```
4. **Push ke GitHub:**
   ```bash
   git push origin main
   ```
   (Jika nama branch Anda bukan `main`, misal `master`, sesuaikan
   perintah menjadi `git push origin master`.)

---

## TAHAP H — Deploy Ulang ke Vercel

**Tujuan:** mempublikasikan versi V2 agar bisa diakses petugas lapangan.

### Jika Project Anda Terhubung ke GitHub (cara yang disarankan)

Vercel akan **otomatis mendeteksi push baru** dari Tahap G dan langsung
men-deploy ulang tanpa tindakan tambahan dari Anda. Anda bisa memantau
prosesnya:

1. Buka [vercel.com/dashboard](https://vercel.com/dashboard).
2. Klik project `yaguntila` Anda.
3. Di tab **Deployments**, Anda akan melihat deployment baru sedang
   berjalan (status "Building" lalu "Ready").
4. Setelah status "Ready", klik **Visit** untuk membuka URL produksi dan
   memastikan V2 sudah aktif.

### Jika Memakai Vercel CLI

```bash
vercel --prod
```

---

## TAHAP I — Memastikan PWA Tetap Berfungsi

**Tujuan:** memverifikasi bahwa fitur PWA (install ke Home Screen,
fullscreen, dll) tidak rusak akibat upgrade.

1. Setelah deploy selesai, buka URL produksi di **Chrome Android**.
2. Jika sebelumnya Anda sudah meng-install YAGUNTILA V1 ke Home Screen:
   - Buka aplikasi yang sudah terpasang tersebut.
   - Karena `vite-plugin-pwa` menggunakan `registerType: 'autoUpdate'`
     (tidak berubah dari V1), service worker akan **otomatis mendeteksi
     versi baru** dan memperbarui aplikasi di background. Tutup dan buka
     kembali aplikasi (atau refresh 1-2 kali) agar versi V2 termuat.
3. Jika belum pernah install, ikuti langkah instalasi seperti biasa
   (banner "Pasang ke Home Screen" akan muncul, atau lewat menu Chrome
   "Tambahkan ke layar utama").
4. Pastikan ikon aplikasi, nama, dan warna tema tidak berubah (karena
   `manifest.json` tidak diubah di V2 — hanya kode di dalamnya yang baru).
5. Pastikan aplikasi tetap bisa dibuka **fullscreen** tanpa address bar.

---

## STRUKTUR FOLDER PROJECT (V2)

```
yaguntila/
├── apps-script/
│   └── Code.gs                  ← [BERUBAH BESAR] Backend V2 lengkap
├── public/
│   ├── favicon.ico               (tidak berubah)
│   └── icons/                    (tidak berubah)
├── src/
│   ├── components/
│   │   ├── Header.jsx                (tidak berubah)
│   │   ├── TextField.jsx             (tidak berubah)
│   │   ├── SelectField.jsx           (tidak berubah)
│   │   ├── CameraField.jsx           (tidak berubah)
│   │   ├── Toast.jsx                 (tidak berubah)
│   │   ├── InstallPrompt.jsx         (tidak berubah)
│   │   ├── BottomNav.jsx             ← [BARU] navigasi 4 tab
│   │   ├── OfflineBanner.jsx         ← [BARU] indikator mode offline
│   │   ├── StatCard.jsx              ← [BARU] kartu statistik
│   │   └── LoadingState.jsx          ← [BARU] loading & error state
│   ├── pages/
│   │   ├── FormGanmet.jsx            ← [BERUBAH] +master pelanggan, GPS, offline
│   │   ├── Dashboard.jsx             ← [BARU] Rekap + Statistik Petugas + Lokasi
│   │   ├── Riwayat.jsx               ← [BARU] 10 laporan terakhir
│   │   └── Admin.jsx                 ← [BARU] Panel Admin Petugas
│   ├── services/
│   │   ├── appsScriptService.js      ← [BERUBAH] +banyak fungsi baru
│   │   ├── imageService.js           (tidak berubah)
│   │   ├── ocrService.js             (tidak berubah)
│   │   ├── whatsappService.js        (tidak berubah)
│   │   ├── geoService.js             ← [BARU] GPS
│   │   └── offlineSyncService.js     ← [BARU] sinkronisasi antrian
│   ├── hooks/
│   │   ├── useFormGanmet.js          ← [BERUBAH] +draft otomatis
│   │   ├── usePetugasList.js         ← [BERUBAH] +fungsi refresh()
│   │   ├── useMasterPelanggan.js     ← [BARU] lookup pelanggan + debounce
│   │   ├── useOnlineStatus.js        ← [BARU] deteksi online/offline
│   │   └── useOfflineQueue.js        ← [BARU] kelola antrian offline
│   ├── utils/
│   │   ├── constants.js              ← [BERUBAH] +konfigurasi V2
│   │   ├── validators.js             ← [BERUBAH] bug fix + validasi master
│   │   └── localStorage.js           ← [BARU] draft & offline queue
│   ├── styles/
│   │   └── components.css            ← [BERUBAH] +CSS untuk semua fitur baru
│   ├── index.css                     (tidak berubah)
│   ├── App.jsx                       ← [BERUBAH] +navigasi multi-halaman
│   └── main.jsx                      (tidak berubah)
├── index.html                        (tidak berubah)
├── vite.config.js                    (tidak berubah)
├── package.json                      ← [BERUBAH] +dependency recharts
└── README.md                         ← [BERUBAH] dokumen ini
```

---

## PENJELASAN FUNGSI SETIAP FILE BARU/DIUBAH

**`apps-script/Code.gs`** — Backend lengkap. Routing `doGet`/`doPost`
diperluas dengan banyak `action` baru, tapi alur submit laporan V1 (tanpa
field `action` di body) tetap berjalan seperti semula sebagai default.

**`src/components/BottomNav.jsx`** — 4 tombol navigasi tetap di bagian
bawah layar (Laporan, Riwayat, Dashboard, Admin), dengan badge merah
menunjukkan jumlah laporan yang masih menunggu di antrian offline.

**`src/components/OfflineBanner.jsx`** — Banner kecil di atas form yang
muncul saat tidak ada internet, atau saat sedang menyinkronkan antrian.

**`src/components/StatCard.jsx`** — Kartu kecil menampilkan satu angka
statistik, dipakai berulang di Dashboard.

**`src/components/LoadingState.jsx`** — Tampilan loading/error generik
untuk halaman yang menunggu data dari server.

**`src/pages/Dashboard.jsx`** — Satu halaman dengan 3 sub-tab: Rekap
(grafik & total laporan), Petugas (statistik per nama), Lokasi (daftar
link Google Maps).

**`src/pages/Riwayat.jsx`** — Menampilkan 10 laporan terakhir dari server,
plus daftar laporan yang masih tertahan di antrian offline lokal HP.

**`src/pages/Admin.jsx`** — Form PIN, lalu (jika benar) panel
tambah/edit/hapus nama petugas.

**`src/services/geoService.js`** — Membungkus HTML5 Geolocation API
dengan penanganan gagal yang aman (tidak pernah memblokir submit laporan).

**`src/services/offlineSyncService.js`** — Mengirim ulang seluruh isi
antrian offline satu per satu saat koneksi internet kembali tersedia.

**`src/hooks/useMasterPelanggan.js`** — Mencari data pelanggan dengan
debounce 600ms setelah ID Pelanggan 12 digit lengkap diketik.

**`src/hooks/useOnlineStatus.js`** — Memantau event `online`/`offline`
bawaan browser.

**`src/hooks/useOfflineQueue.js`** — Menyediakan jumlah antrian + fungsi
sinkronisasi manual ke komponen UI.

**`src/utils/localStorage.js`** — Semua baca/tulis `localStorage` untuk
draft form dan antrian offline, dengan penanganan error kuota penuh.

---

## CHECKLIST TESTING LENGKAP

### Fitur Lama (V1) — harus tetap berjalan
- [ ] Form Laporan tetap menampilkan semua field seperti sebelumnya.
- [ ] Validasi ID Pelanggan 12 digit masih berfungsi.
- [ ] OCR nomor meter dari foto masih berfungsi.
- [ ] Kompresi foto sebelum upload masih berjalan.
- [ ] Submit laporan berhasil menulis ke sheet "Data Ganmet" kolom A-K
      seperti sebelumnya (kolom L-P boleh kosong jika GPS tidak diizinkan).
- [ ] Tombol "Kirim ke WhatsApp" masih membuka WhatsApp dengan template benar.
- [ ] Dropdown Petugas Lapangan masih terisi dari sheet "Petugas".
- [ ] Form otomatis reset setelah submit sukses.
- [ ] Aplikasi tetap bisa di-install sebagai PWA ke Home Screen Android.

### Bug Fix
- [ ] Nomor Meter Lama dengan 6-12 digit (bukan hanya 11) bisa diterima.
- [ ] Nomor Meter Lama dengan 5 digit atau kurang TETAP ditolak.
- [ ] Nomor Meter Lama dengan 13 digit atau lebih TETAP ditolak.
- [ ] Nomor Meter Baru TETAP wajib persis 11 digit (tidak berubah).

### Fitur Baru V2
- [ ] **Master Pelanggan**: ketik ID Pelanggan yang ADA di sheet
      MASTER_PELANGGAN → Nama Pelanggan otomatis terisi dan field menjadi
      readonly (tidak bisa diketik manual).
- [ ] Ketik ID Pelanggan yang TIDAK ADA di database → muncul hint
      "ID Pelanggan tidak ditemukan pada database." dan field Nama
      Pelanggan tetap bisa diisi manual.
- [ ] **Validasi Nomor Meter Baru**: jika MASTER_PELANGGAN punya nomor
      meter baru terisi untuk ID tersebut dan petugas mengetik nomor
      berbeda → submit ditolak dengan pesan yang sesuai.
- [ ] **Anti Nomor Ganda**: submit laporan dengan Nomor Meter Baru yang
      SAMA dengan laporan yang sudah ada sebelumnya → ditolak dengan
      pesan "Nomor meter sudah pernah digunakan."
- [ ] **GPS**: saat submit, browser meminta izin lokasi; setelah
      diizinkan, kolom L/M/N di sheet terisi otomatis.
- [ ] Submit TETAP berhasil walau izin GPS ditolak (kolom GPS kosong,
      laporan tetap tersimpan).
- [ ] **Dashboard → Rekap**: angka total hari ini/minggu ini/bulan ini
      tampil benar, grafik tampil tanpa error.
- [ ] **Dashboard → Petugas**: pilih nama, statistik muncul sesuai data.
- [ ] **Dashboard → Lokasi**: daftar lokasi muncul (jika ada laporan
      dengan GPS), klik salah satu membuka Google Maps.
- [ ] **Riwayat**: menampilkan maksimal 10 laporan terakhir, urutan
      terbaru di atas.
- [ ] **Draft Otomatis**: isi sebagian form, tutup tab/browser tanpa
      submit, buka kembali aplikasi → isian form sebelumnya muncul lagi
      (kecuali foto, yang harus diambil ulang).
- [ ] **Offline Queue**: matikan WiFi/data seluler HP, isi & submit
      laporan lengkap → muncul pesan "tersimpan ke antrian", badge merah
      muncul di tab Laporan. Nyalakan kembali internet → laporan otomatis
      terkirim, badge hilang.
- [ ] **Panel Admin**: masuk dengan PIN yang benar → bisa tambah, edit,
      hapus nama petugas; dropdown Petugas Lapangan di Form ikut
      terupdate setelah perubahan.
- [ ] Masuk Panel Admin dengan PIN SALAH → ditolak dengan pesan error.

---

## DAFTAR POTENSI BUG & MITIGASI

| # | Potensi Bug | Mitigasi yang Sudah Diterapkan |
|---|---|---|
| 1 | Spreadsheet V1 lama belum punya kolom L-P, sehingga GPS gagal tersimpan. | Jalankan `migrasiKolomV2()` di Tahap A langkah 6 — menambah header tanpa merusak data lama. |
| 2 | Offline Queue penuh karena banyak laporan menumpuk (sinyal mati lama). | Dibatasi maksimal 5 laporan (`OFFLINE_QUEUE_MAX`); pesan jelas muncul saat penuh, mendorong petugas menyambungkan internet. |
| 3 | localStorage gagal (kuota habis / mode privasi browser). | Semua operasi localStorage dibungkus try/catch; gagal menyimpan draft/antrian tidak menghentikan aplikasi, hanya menampilkan pesan. |
| 4 | GPS lambat/timeout di dalam gedung membuat submit terasa lama. | Timeout GPS dibatasi 8 detik (`GEO_TIMEOUT_MS`); setelah itu submit lanjut tanpa data lokasi. |
| 5 | Dua petugas submit Nomor Meter Baru yang sama PERSIS dalam waktu yang sangat berdekatan (race condition). | `LockService.getScriptLock()` di `doPost()` (sudah ada sejak V1) memastikan hanya satu request diproses dalam satu waktu, sehingga pengecekan anti-duplikat tetap akurat. |
| 6 | Admin menghapus nama petugas yang sedang dipilih oleh form yang sudah terbuka di HP petugas lain. | Dropdown Petugas Lapangan diambil ulang setiap kali halaman Form dibuka; risiko ini sama seperti di V1 dan dianggap dapat diterima untuk skala tim lapangan. |
| 7 | PIN Admin bocor/diketahui orang tidak berwenang. | PIN dicek ulang di SERVER (`pinValid()`) sebelum operasi tulis dijalankan — UI saja tidak cukup. Tetap disarankan mengganti PIN secara berkala dan tidak membagikannya sembarangan. |
| 8 | Grafik Dashboard lambat dimuat jika sheet Data Ganmet sudah sangat besar (puluhan ribu baris). | Seluruh agregasi dihitung sekali jalan dalam satu pembacaan sheet (bukan berkali-kali query) di `hitungDataDashboard()`; jika di masa depan data sudah sangat besar, pertimbangkan menambah cache hasil dashboard yang di-refresh berkala (di luar scope V2 ini). |
| 9 | Nama petugas dengan huruf besar/kecil berbeda dianggap dua orang berbeda (misal "Budi" vs "BUDI"). | Form Tambah/Edit Petugas otomatis mengubah ke UPPERCASE sebelum disimpan, konsisten dengan data contoh V1 yang semuanya uppercase. |
| 10 | Kolom MASTER_PELANGGAN kosong sepenuhnya (baru install V2) menyebabkan semua fitur autofill tampak "tidak berfungsi". | Ini perilaku yang DIHARAPKAN — fitur autofill baru aktif setelah admin mengisi data di sheet MASTER_PELANGGAN; field Nama Pelanggan tetap bisa diisi manual seperti biasa selama data belum ada. |

---

## CARA MAINTENANCE APLIKASI

Seluruh panduan maintenance dari V1 (mengubah daftar petugas lewat sheet,
mengarsipkan data lama, dst) tetap berlaku. Tambahan untuk V2:

**Mengisi/memperbarui data MASTER_PELANGGAN**
Edit langsung sheet `MASTER_PELANGGAN` di Spreadsheet — tambah baris baru
atau ubah kolom C (Nomor Meter Baru) sesuai rencana kerja/SPK terbaru.
Tidak perlu deploy ulang apapun, perubahan langsung aktif.

**Mengganti PIN Admin**
Ubah nilai `ADMIN_PIN` di `Code.gs` (Apps Script), simpan, lalu buat
**New version** deployment (lihat Tahap A langkah 8). Update juga nilai
`ADMIN_PIN` di `src/utils/constants.js` (React), lalu build & deploy ulang
ke Vercel (Tahap F-H).

**Memantau Log Error**
Cek sheet `Log Error` di Spreadsheet sesekali — setiap kegagalan di
backend (misalnya upload foto gagal) tercatat di sini dengan waktu dan
detail pesan errornya, membantu Anda melacak masalah produksi.

**Membersihkan antrian offline yang menumpuk di banyak HP**
Jika seorang petugas melaporkan antrian offline-nya "macet" (tidak
terkirim walau sudah online), minta mereka membuka halaman **Riwayat** —
jika item antrian masih ada di bagian "Menunggu Dikirim (Offline)", coba
muat ulang aplikasi (refresh) untuk memicu sinkronisasi ulang.

---

**YAGUNTILA V2** — upgrade dari V1, dibangun sesuai Upgrade Specification.
