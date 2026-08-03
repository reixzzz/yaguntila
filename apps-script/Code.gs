/**
 * ============================================================================
 * YAGUNTILA - Google Apps Script Backend (V3)
 * "Ganmet Afif Man"
 * ============================================================================
 *
 * File ini adalah BACKEND aplikasi YAGUNTILA. Berjalan di server Google
 * (script.google.com), bukan di HP petugas.
 *
 * [V3] FILE INI ADALAH UPGRADE DARI VERSI 2. Seluruh perilaku V1/V2 yang
 * TIDAK disebutkan sebagai perubahan di Upgrade Specification V3
 * DIPERTAHANKAN: struktur kolom A-P sheet "Data Ganmet", upload foto ke
 * Drive, LockService anti race-condition, dashboard rekap/lokasi, master
 * pelanggan, log error.
 *
 * PERUBAHAN BESAR V3:
 *   1. Sistem LOGIN (sheet USERS) menggantikan dropdown Petugas manual
 *      dan PIN Admin tunggal. Sesi berupa token ringan yang DITANDATANGANI
 *      HMAC-SHA256 memakai APP_SECRET_KEY, supaya role tidak bisa
 *      dipalsukan dari client walau bukan sistem login penuh dengan
 *      database sesi (tetap sesuai batasan: gratis, tanpa Firebase/
 *      Supabase/database lain selain Spreadsheet).
 *   2. Sheet MASTER_METER_BARU (Nomor Meter, Status, Dipakai Oleh,
 *      Petugas, Tanggal) — submit laporan WAJIB lolos cek status READY
 *      di sheet ini sebelum diterima; setelah sukses, status otomatis
 *      berubah menjadi USED.
 *   3. OCR dihapus total dari backend (sebenarnya OCR V1/V2 murni
 *      berjalan di browser, jadi tidak ada kode OCR di backend yang
 *      perlu dihapus di sini) — nomor meter baru kini datang dari hasil
 *      scan QR/Barcode di frontend, tetap dikirim sebagai field teks
 *      biasa `nomorMeterBaru`, sehingga endpoint doPost TIDAK berubah
 *      bentuk payload-nya untuk field ini.
 *   4. Riwayat laporan kini difilter per nama petugas yang login.
 *   5. Dashboard Stok Meter (agregasi READY/USED/CANCELLED).
 *   6. Panel Admin diperluas: CRUD Users, CRUD Master Pelanggan, CRUD
 *      Master Meter (termasuk ubah status), semua diverifikasi ulang di
 *      server berdasarkan role di dalam token sesi.
 *
 * CARA PAKAI: lihat README.md bagian "TAHAP A — Update Google Apps
 * Script". Singkatnya: salin SELURUH isi file ini ke script.google.com
 * (menimpa kode V2 lama), isi variabel konfigurasi di bawah, lalu jalankan
 * `setupAwalV3()` sekali secara manual dari editor.
 * ============================================================================
 */

// ============================================================================
// 🔧 KONFIGURASI WAJIB — ISI BARIS INI DENGAN MILIK ANDA SENDIRI
// ============================================================================

// [TETAP SAMA DENGAN V1/V2 ANDA] ID Spreadsheet produksi — JANGAN diganti
// dengan Spreadsheet baru, supaya seluruh data lama tetap ada.
const SPREADSHEET_ID = '1yBlreUMZm2IM24-OWUosxI_AH2qgle8ZqemXFPZZeVg';

// [TETAP SAMA DENGAN V1/V2 ANDA] ID Folder Drive tempat foto disimpan.
const DRIVE_FOLDER_ID = '1gEs8tPoiV4H3mf6hD-9rbZKBvLEytbtXDA_DISINI';

// [TETAP SAMA DENGAN V1/V2 ANDA] Kunci rahasia aplikasi. [V3] Kunci ini
// SEKARANG JUGA dipakai untuk menandatangani token sesi login (HMAC-SHA256),
// jadi pastikan nilainya acak & tidak pernah dibagikan ke siapa pun selain
// Anda. Minimal 20 karakter acak disarankan.
const APP_SECRET_KEY = 'YGT-2026-beningarya-PLN-5626';

// [V3] Lama sesi login (dalam milidetik) sebelum petugas harus login ulang.
// Default 12 jam — cukup untuk satu shift kerja lapangan penuh.
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

// ============================================================================
// KONFIGURASI TETAP (tidak perlu diubah, kecuali Anda paham betul akibatnya)
// ============================================================================

const SHEET_NAME_DATA = 'Data Ganmet';                    // V1, tidak berubah
const SHEET_NAME_PETUGAS = 'Petugas';                       // V1 — DIPERTAHANKAN sbg arsip, TIDAK dipakai lagi oleh V3 (lihat README)
const SHEET_NAME_MASTER_PELANGGAN = 'MASTER_PELANGGAN';     // V2, tidak berubah
const SHEET_NAME_MASTER_METER_BARU = 'MASTER_METER_BARU';   // [V3] baru
const SHEET_NAME_USERS = 'USERS';                           // [V3] baru
const SHEET_NAME_LOG_ERROR = 'Log Error';                   // V2, tidak berubah
const SHEET_NAME_SETTING = 'Setting';                       // V2, tidak berubah

const HEADER_KOLOM = [
  'Timestamp', 'Nama Pelanggan', 'ID Pelanggan', 'Jenis Meter',
  'Alasan Penggantian', 'Nomor Meter Lama', 'Nomor Meter Baru',
  'Stand Cabut', 'Petugas Lapangan', 'Link Foto Meter Lama',
  'Link Foto Meter Baru', 'Latitude', 'Longitude', 'Google Maps URL',
  'Preview Foto Lama', 'Preview Foto Baru'
];

const KOLOM = {
  TIMESTAMP: 1, NAMA_PELANGGAN: 2, ID_PELANGGAN: 3, JENIS_METER: 4,
  ALASAN_PENGGANTIAN: 5, NOMOR_METER_LAMA: 6, NOMOR_METER_BARU: 7,
  STAND_CABUT: 8, PETUGAS_LAPANGAN: 9, LINK_FOTO_LAMA: 10,
  LINK_FOTO_BARU: 11, LATITUDE: 12, LONGITUDE: 13, GOOGLE_MAPS_URL: 14,
  PREVIEW_FOTO_LAMA: 15, PREVIEW_FOTO_BARU: 16
};

const HEADER_MASTER_PELANGGAN = ['ID Pelanggan', 'Nama Pelanggan', 'Nomor Meter Baru'];
const HEADER_LOG_ERROR = ['Timestamp', 'Action', 'Pesan Error', 'Detail'];

// [V3] Header sheet USERS.
const HEADER_USERS = ['Username', 'Password', 'Nama Lengkap', 'Role', 'Status Aktif'];
const KOLOM_USERS = { USERNAME: 1, PASSWORD: 2, NAMA_LENGKAP: 3, ROLE: 4, STATUS_AKTIF: 5 };
const ROLE_ADMIN = 'ADMIN';
const ROLE_PETUGAS = 'PETUGAS';

// [V3] Header sheet MASTER_METER_BARU.
const HEADER_MASTER_METER_BARU = ['Nomor Meter', 'Status', 'Dipakai Oleh', 'Petugas', 'Tanggal'];
const KOLOM_METER = { NOMOR_METER: 1, STATUS: 2, DIPAKAI_OLEH: 3, PETUGAS: 4, TANGGAL: 5 };
const STATUS_METER_READY = 'READY';
const STATUS_METER_USED = 'USED';
const STATUS_METER_CANCELLED = 'CANCELLED';

// ============================================================================
// ENTRY POINT: doGet
// ============================================================================
function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;

    // --- V1: dipertahankan (dipakai sebagai fallback lama, tidak lagi
    // dipanggil oleh UI V3 karena dropdown petugas sudah diganti login,
    // tapi endpoint TIDAK dihapus supaya tidak ada breaking change API). ---
    if (action === 'getPetugas') {
      return buatResponseJSON({ success: true, data: ambilDaftarPetugasLegacy() });
    }

    if (action === 'cariPelanggan') {
      return buatResponseJSON({ success: true, data: cariMasterPelanggan(e.parameter.idPelanggan) });
    }

    // [V3] Cek status Nomor Meter Baru di MASTER_METER_BARU (fitur #3/#5)
    if (action === 'cariMeterBaru') {
      return buatResponseJSON({ success: true, data: cariMasterMeterBaru(e.parameter.nomorMeter) });
    }

    if (action === 'getDashboard') {
      return buatResponseJSON({ success: true, data: hitungDataDashboard() });
    }

    if (action === 'getStatistikPetugas') {
      return buatResponseJSON({ success: true, data: hitungStatistikPetugas(e.parameter.nama) });
    }

    // [V3] Riwayat sekarang difilter per petugas (wajib token valid)
    if (action === 'getRiwayat') {
      const sesi = verifikasiToken(e.parameter.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: 'Sesi tidak valid, silakan login ulang.' });
      return buatResponseJSON({ success: true, data: ambilRiwayatLaporan(sesi.user.namaLengkap) });
    }

    if (action === 'getLokasi') {
      return buatResponseJSON({ success: true, data: ambilDaftarLokasi() });
    }

    // [V3] Dashboard Stok Meter (fitur #12)
    if (action === 'getStokMeter') {
      return buatResponseJSON({ success: true, data: hitungStokMeter() });
    }

    // --- [V3] Endpoint Panel Admin (semua wajib token role ADMIN) ---
    if (action === 'getUsers') {
      const sesi = wajibAdmin(e.parameter.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON({ success: true, data: ambilDaftarUsers() });
    }

    if (action === 'getMasterPelangganList') {
      const sesi = wajibAdmin(e.parameter.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON({ success: true, data: ambilSeluruhMasterPelanggan() });
    }

    if (action === 'getMasterMeterList') {
      const sesi = wajibAdmin(e.parameter.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON({ success: true, data: ambilSeluruhMasterMeter() });
    }

    return buatResponseJSON({
      success: true,
      message: 'YAGUNTILA Apps Script API (V3) aktif.'
    });

  } catch (error) {
    catatLogError('doGet', error, e && e.parameter);
    return buatResponseJSON({ success: false, message: 'Terjadi kesalahan server: ' + error.message });
  }
}

// ============================================================================
// ENTRY POINT: doPost
// ============================================================================
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const body = JSON.parse(e.postData.contents);

    if (!body.appSecret || body.appSecret !== APP_SECRET_KEY) {
      return buatResponseJSON({ success: false, message: 'Akses ditolak. Kunci aplikasi tidak valid.' });
    }

    // --- [V3] LOGIN ---
    if (body.action === 'login') {
      return buatResponseJSON(login(body.username, body.password));
    }

    // --- [V3] PANEL ADMIN: Users ---
    if (body.action === 'tambahUser') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(tambahUser(body.username, body.password, body.namaLengkap, body.role));
    }
    if (body.action === 'editUser') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(editUser(body.username, body.namaLengkap, body.role, body.passwordBaru));
    }
    if (body.action === 'ubahStatusUser') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(ubahStatusUser(body.username, body.statusAktif));
    }

    // --- [V3] PANEL ADMIN: Master Pelanggan ---
    if (body.action === 'tambahMasterPelanggan') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(tambahMasterPelanggan(body.idPelanggan, body.namaPelanggan, body.nomorMeterBaru));
    }
    if (body.action === 'editMasterPelanggan') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(editMasterPelanggan(body.idPelanggan, body.namaPelanggan, body.nomorMeterBaru));
    }
    if (body.action === 'hapusMasterPelanggan') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(hapusMasterPelanggan(body.idPelanggan));
    }

    // --- [V3] PANEL ADMIN: Master Meter Baru ---
    if (body.action === 'tambahMasterMeter') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(tambahMasterMeter(body.nomorMeter));
    }
    if (body.action === 'tambahBanyakMasterMeter') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(tambahBanyakMasterMeter(body.daftarNomor));
    }
    if (body.action === 'ubahStatusMeter') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(ubahStatusMeter(body.nomorMeter, body.statusBaru));
    }
    if (body.action === 'hapusMasterMeter') {
      const sesi = wajibAdmin(body.token);
      if (!sesi.valid) return buatResponseJSON({ success: false, message: sesi.pesan });
      return buatResponseJSON(hapusMasterMeter(body.nomorMeter));
    }

    // --- Mulai dari sini: ALUR SUBMIT LAPORAN (V1/V2 dipertahankan + V3) ---

    // [V3] Wajib sesi login valid — nama petugas TIDAK LAGI dipercaya dari
    // client (dahulu dropdown bebas dipilih), melainkan diambil dari token
    // yang sudah diverifikasi tanda tangannya di server.
    const sesi = verifikasiToken(body.token);
    if (!sesi.valid) {
      return buatResponseJSON({ success: false, message: 'Sesi login tidak valid atau kedaluwarsa. Silakan login ulang.' });
    }
    const namaPetugasSesi = sesi.user.namaLengkap;

    const errorValidasi = validasiData(body);
    if (errorValidasi) {
      return buatResponseJSON({ success: false, message: errorValidasi });
    }

    // [PATCH BUGFIX] ID Pelanggan WAJIB terdaftar di MASTER_PELANGGAN
    // (sesuai spesifikasi awal V3: "Jika tidak ditemukan: Submit
    // dibatalkan"). Ini adalah lapis pertahanan KEDUA — client (FormGanmet)
    // sudah memblokir ini juga, TAPI client bisa saja melewatkannya saat
    // offline (supaya Antrian Offline tetap bisa dipakai). Saat laporan
    // akhirnya sampai ke sini (baik langsung online, maupun hasil sinkron
    // dari antrian offline), ID-nya WAJIB benar-benar ada di database —
    // tidak ada pengecualian di titik ini.
    const dataPelangganCek = cariMasterPelanggan(body.idPelanggan);
    if (!dataPelangganCek.ditemukan) {
      return buatResponseJSON({ success: false, message: 'ID Pelanggan tidak ditemukan pada database MASTER_PELANGGAN. Laporan tidak dapat disimpan.' });
    }

    // [V3] Fitur #3 — Nomor Meter Baru WAJIB terdaftar & berstatus READY
    // di MASTER_METER_BARU sebelum laporan diterima.
    const dataMeter = cariMasterMeterBaru(body.nomorMeterBaru);
    if (!dataMeter.ditemukan) {
      return buatResponseJSON({ success: false, message: 'Nomor meter baru tidak terdaftar di database stok meter.' });
    }
    if (dataMeter.status === STATUS_METER_USED) {
      return buatResponseJSON({ success: false, message: 'Nomor meter baru sudah pernah digunakan.' });
    }
    if (dataMeter.status === STATUS_METER_CANCELLED) {
      return buatResponseJSON({ success: false, message: 'Nomor meter baru berstatus dibatalkan (CANCELLED), tidak dapat dipakai.' });
    }
    if (dataMeter.status !== STATUS_METER_READY) {
      return buatResponseJSON({ success: false, message: 'Status nomor meter baru tidak valid untuk digunakan.' });
    }

    // [PATCH BUGFIX] Cross-check terhadap MASTER_PELANGGAN TIDAK LAGI
    // memblokir submit (dulu bisa false-reject nomor meter yang valid &
    // READY di MASTER_METER_BARU, hanya karena kolom "Nomor Meter Baru"
    // di MASTER_PELANGGAN untuk ID Pelanggan itu berisi nilai lain/basi).
    // MASTER_METER_BARU (dicek di atas) sudah menjadi sumber kebenaran
    // utama status meter sejak V3. Ketidaksesuaian tetap DICATAT ke sheet
    // "Log Error" (bukan menolak laporan) supaya admin bisa meninjau &
    // membersihkan data MASTER_PELANGGAN yang sudah tidak akurat.
    const errorMaster = validasiNomorMeterBaruVsMaster(body.idPelanggan, body.nomorMeterBaru);
    if (errorMaster) {
      catatLogError('cekMasterPelanggan_peringatan', { message: errorMaster }, {
        idPelanggan: body.idPelanggan, nomorMeterBaru: body.nomorMeterBaru
      });
    }

    // [V1/V2] Cek duplikat langsung di Data Ganmet — lapis pertahanan
    // kedua di luar status MASTER_METER_BARU (defense in depth).
    if (nomorMeterBaruSudahDipakai(body.nomorMeterBaru)) {
      return buatResponseJSON({ success: false, message: 'Nomor meter sudah pernah digunakan.' });
    }

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const namaFileLama = buatNamaFile(body.idPelanggan, 'METER_LAMA');
    const namaFileBaru = buatNamaFile(body.idPelanggan, 'METER_BARU');
    const linkFotoLama = uploadFotoBase64(folder, body.fotoMeterLamaBase64, namaFileLama);
    const linkFotoBaru = uploadFotoBase64(folder, body.fotoMeterBaruBase64, namaFileBaru);

    const timestamp = formatTimestamp(new Date());
    const sheet = bukaSheetData();

    sheet.appendRow([
      timestamp, body.namaPelanggan, body.idPelanggan, body.jenisMeter,
      body.alasanPenggantian, body.nomorMeterLama, body.nomorMeterBaru,
      body.standCabut || '', namaPetugasSesi, linkFotoLama, linkFotoBaru,
      body.latitude || '', body.longitude || '', body.googleMapsUrl || ''
    ]);

    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, KOLOM.PREVIEW_FOTO_LAMA).setFormula('=IFERROR(IMAGE("' + linkFotoLangsung(linkFotoLama) + '"),"")');
    sheet.getRange(lastRow, KOLOM.PREVIEW_FOTO_BARU).setFormula('=IFERROR(IMAGE("' + linkFotoLangsung(linkFotoBaru) + '"),"")');

    // [V3] Update status MASTER_METER_BARU menjadi USED setelah sukses.
    tandaiMeterTerpakai(body.nomorMeterBaru, body.idPelanggan, namaPetugasSesi, timestamp);

    return buatResponseJSON({
      success: true,
      message: 'Laporan berhasil disimpan.',
      data: { timestamp: timestamp, linkFotoLama: linkFotoLama, linkFotoBaru: linkFotoBaru }
    });

  } catch (error) {
    catatLogError('doPost', error, e && e.postData && e.postData.contents);
    return buatResponseJSON({ success: false, message: 'Gagal menyimpan laporan: ' + error.message });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// FUNGSI: validasiData (V1/V2 dipertahankan)
// ============================================================================
function validasiData(body) {
  if (!body.namaPelanggan || body.namaPelanggan.trim() === '') return 'Nama Pelanggan wajib diisi.';
  if (!body.idPelanggan || !/^\d{12}$/.test(String(body.idPelanggan))) return 'ID Pelanggan harus terdiri dari 12 digit.';
  if (!body.jenisMeter || (body.jenisMeter !== 'Prabayar' && body.jenisMeter !== 'Pascabayar')) return 'Jenis Meter harus dipilih (Prabayar/Pascabayar).';

  const alasanValid = ['KWH TUA', 'kWh Meter Rusak', 'Buram', 'Terbakar'];
  if (!body.alasanPenggantian || alasanValid.indexOf(body.alasanPenggantian) === -1) return 'Alasan Penggantian harus dipilih dari daftar.';

  // [V2] Bug fix dipertahankan: Nomor Meter Lama 6-12 digit (bukan 11 pasti).
  if (!body.nomorMeterLama || !/^\d{6,12}$/.test(String(body.nomorMeterLama))) return 'Nomor Meter Lama harus angka, 6-12 digit.';
  if (!body.nomorMeterBaru || !/^\d{6,12}$/.test(String(body.nomorMeterBaru))) return 'Nomor Meter Baru harus angka, 6-12 digit.';

  if (body.jenisMeter === 'Pascabayar') {
    if (!body.standCabut || isNaN(Number(body.standCabut)) || Number(body.standCabut) < 0) {
      return 'Stand Cabut wajib diisi dengan angka untuk meter Pascabayar.';
    }
  }

  if (!body.fotoMeterLamaBase64) return 'Foto Nomor Meter Lama wajib diunggah.';
  if (!body.fotoMeterBaruBase64) return 'Foto Nomor Meter Baru wajib diunggah.';

  return null;
}

// ============================================================================
// FUNGSI: upload foto, format, dsb (V1, tidak berubah)
// ============================================================================
function uploadFotoBase64(folder, base64String, namaFile) {
  const matches = base64String.match(/^data:(image\/\w+);base64,(.+)$/);
  let mimeType = 'image/jpeg';
  let dataMurni = base64String;
  if (matches) { mimeType = matches[1]; dataMurni = matches[2]; }
  const decodedBytes = Utilities.base64Decode(dataMurni);
  const blob = Utilities.newBlob(decodedBytes, mimeType, namaFile);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

function linkFotoLangsung(linkView) {
  const match = linkView.match(/\/d\/([a-zA-Z0-9_-]+)\//);
  if (!match) return linkView;
  return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1000';
}

function buatNamaFile(idPelanggan, label) {
  const now = new Date();
  const stamp = Utilities.formatDate(now, 'GMT+7', 'yyyyMMdd_HHmmss');
  return idPelanggan + '_' + label + '_' + stamp + '.jpg';
}

function formatTimestamp(date) {
  return Utilities.formatDate(date, 'GMT+7', 'dd/MM/yyyy HH:mm:ss');
}

function bukaSheetData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME_DATA);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_DATA);
    sheet.appendRow(HEADER_KOLOM);
    sheet.getRange(1, 1, 1, HEADER_KOLOM.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * [V1] Dipertahankan HANYA untuk kompatibilitas mundur endpoint
 * ?action=getPetugas (misal ada integrasi lama yang masih memanggilnya).
 * TIDAK dipakai lagi oleh UI V3 (dropdown petugas sudah diganti login).
 */
function ambilDaftarPetugasLegacy() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME_PETUGAS);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return values.map((row) => String(row[0]).trim()).filter((n) => n !== '');
}

function buatResponseJSON(objekData) {
  return ContentService.createTextOutput(JSON.stringify(objekData)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// [V3] FUNGSI BARU — LOGIN & TOKEN SESI
// ============================================================================

/**
 * Membuka (atau membuat) sheet USERS. Jika baru dibuat, otomatis diisi
 * satu akun ADMIN default supaya Anda tidak terkunci di luar aplikasi
 * setelah upgrade. GANTI PASSWORD default ini secepatnya lewat Panel Admin.
 */
function bukaSheetUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME_USERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_USERS);
    sheet.appendRow(HEADER_USERS);
    sheet.getRange(1, 1, 1, HEADER_USERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // Akun admin default — WAJIB diganti passwordnya setelah instalasi.
    sheet.appendRow(['admin', 'ganti-password-ini', 'Administrator', ROLE_ADMIN, true]);
  }
  return sheet;
}

function cariBarisUser(username) {
  const sheet = bukaSheetUsers();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const data = sheet.getRange(2, 1, lastRow - 1, HEADER_USERS.length).getValues();
  const usernameCari = String(username || '').trim().toLowerCase();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][KOLOM_USERS.USERNAME - 1]).trim().toLowerCase() === usernameCari) {
      return { rowIndex: i + 2, values: data[i] };
    }
  }
  return null;
}

/**
 * Memvalidasi username/password, lalu membuat token sesi bertanda tangan
 * HMAC-SHA256 (bukan sekadar disimpan mentah di localStorage client),
 * sehingga role di dalam token tidak bisa diubah/dipalsukan dari browser.
 */
function login(username, password) {
  if (!username || !password) {
    return { success: false, message: 'Username dan password wajib diisi.' };
  }

  const baris = cariBarisUser(username);
  if (!baris) {
    return { success: false, message: 'Username atau password salah.' };
  }

  const nilai = baris.values;
  const statusAktif = nilai[KOLOM_USERS.STATUS_AKTIF - 1];
  const passwordTersimpan = String(nilai[KOLOM_USERS.PASSWORD - 1]);

  if (statusAktif === false || String(statusAktif).toUpperCase() === 'FALSE' || String(statusAktif).trim() === '') {
    return { success: false, message: 'Akun ini sudah dinonaktifkan. Hubungi admin.' };
  }

  if (passwordTersimpan !== String(password)) {
    return { success: false, message: 'Username atau password salah.' };
  }

  const user = {
    username: String(nilai[KOLOM_USERS.USERNAME - 1]).trim(),
    namaLengkap: String(nilai[KOLOM_USERS.NAMA_LENGKAP - 1]).trim(),
    role: String(nilai[KOLOM_USERS.ROLE - 1]).trim().toUpperCase()
  };

  const token = buatToken(user);

  return { success: true, message: 'Login berhasil.', token: token, user: user };
}

/**
 * Membuat token = base64(JSON payload) + '.' + hex HMAC-SHA256 signature.
 * Payload berisi username, namaLengkap, role, dan waktu kedaluwarsa (exp).
 */
function buatToken(user) {
  const payload = {
    username: user.username,
    namaLengkap: user.namaLengkap,
    role: user.role,
    exp: Date.now() + SESSION_DURATION_MS
  };
  const payloadBase64 = Utilities.base64Encode(JSON.stringify(payload));
  const signature = hitungSignature(payloadBase64);
  return payloadBase64 + '.' + signature;
}

function hitungSignature(payloadBase64) {
  const rawSignature = Utilities.computeHmacSha256Signature(payloadBase64, APP_SECRET_KEY);
  return rawSignature.map(function (byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * Memverifikasi token: cek format, cek tanda tangan HMAC (mencegah
 * pemalsuan role dari client), lalu cek kedaluwarsa, dan terakhir
 * memastikan akun masih AKTIF di sheet USERS (supaya akun yang baru
 * dinonaktifkan admin langsung kehilangan akses walau tokennya belum
 * kedaluwarsa).
 *
 * @returns {{valid: boolean, user?: object, pesan?: string}}
 */
function verifikasiToken(token) {
  try {
    if (!token || typeof token !== 'string' || token.indexOf('.') === -1) {
      return { valid: false, pesan: 'Token tidak valid.' };
    }

    const idxTitik = token.lastIndexOf('.');
    const payloadBase64 = token.substring(0, idxTitik);
    const signature = token.substring(idxTitik + 1);

    const signatureSeharusnya = hitungSignature(payloadBase64);
    if (signature !== signatureSeharusnya) {
      return { valid: false, pesan: 'Token tidak valid (tanda tangan tidak cocok).' };
    }

    const payload = JSON.parse(Utilities.base64Decode(payloadBase64).map(function (b) {
      return String.fromCharCode(b < 0 ? b + 256 : b);
    }).join(''));

    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false, pesan: 'Sesi login sudah kedaluwarsa.' };
    }

    // Pastikan akun masih ada & masih aktif saat ini (bukan hanya saat login).
    const baris = cariBarisUser(payload.username);
    if (!baris) return { valid: false, pesan: 'Akun tidak ditemukan.' };
    const statusAktif = baris.values[KOLOM_USERS.STATUS_AKTIF - 1];
    if (statusAktif === false || String(statusAktif).toUpperCase() === 'FALSE') {
      return { valid: false, pesan: 'Akun ini sudah dinonaktifkan.' };
    }

    return { valid: true, user: payload };
  } catch (error) {
    return { valid: false, pesan: 'Token tidak valid.' };
  }
}

/**
 * Helper: verifikasi token DAN pastikan role-nya ADMIN. Dipakai di setiap
 * endpoint Panel Admin sebagai lapis keamanan server (lapis kedua setelah
 * UI hanya menampilkan tab Admin untuk role ADMIN).
 */
function wajibAdmin(token) {
  const sesi = verifikasiToken(token);
  if (!sesi.valid) return sesi;
  if (sesi.user.role !== ROLE_ADMIN) {
    return { valid: false, pesan: 'Aksi ini khusus untuk Admin.' };
  }
  return sesi;
}

function ambilDaftarUsers() {
  const sheet = bukaSheetUsers();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, HEADER_USERS.length).getValues();
  // Password TIDAK dikirim ke client demi keamanan dasar.
  return data.map(function (baris) {
    return {
      username: String(baris[KOLOM_USERS.USERNAME - 1]),
      namaLengkap: String(baris[KOLOM_USERS.NAMA_LENGKAP - 1]),
      role: String(baris[KOLOM_USERS.ROLE - 1]),
      statusAktif: !(baris[KOLOM_USERS.STATUS_AKTIF - 1] === false || String(baris[KOLOM_USERS.STATUS_AKTIF - 1]).toUpperCase() === 'FALSE')
    };
  });
}

function tambahUser(username, password, namaLengkap, role) {
  if (!username || !password || !namaLengkap) {
    return { success: false, message: 'Username, password, dan nama lengkap wajib diisi.' };
  }
  const roleBersih = (role === ROLE_ADMIN) ? ROLE_ADMIN : ROLE_PETUGAS;
  if (cariBarisUser(username)) {
    return { success: false, message: 'Username sudah digunakan.' };
  }
  const sheet = bukaSheetUsers();
  sheet.appendRow([String(username).trim(), String(password), String(namaLengkap).trim(), roleBersih, true]);
  return { success: true, message: 'User berhasil ditambahkan.' };
}

function editUser(username, namaLengkap, role, passwordBaru) {
  const baris = cariBarisUser(username);
  if (!baris) return { success: false, message: 'User tidak ditemukan.' };

  const sheet = bukaSheetUsers();
  const roleBersih = (role === ROLE_ADMIN) ? ROLE_ADMIN : ROLE_PETUGAS;

  if (namaLengkap) sheet.getRange(baris.rowIndex, KOLOM_USERS.NAMA_LENGKAP).setValue(String(namaLengkap).trim());
  sheet.getRange(baris.rowIndex, KOLOM_USERS.ROLE).setValue(roleBersih);
  if (passwordBaru) sheet.getRange(baris.rowIndex, KOLOM_USERS.PASSWORD).setValue(String(passwordBaru));

  return { success: true, message: 'User berhasil diubah.' };
}

/**
 * [Fitur #1] Admin menonaktifkan akun TANPA menghapus baris data (supaya
 * riwayat laporan lama milik user tersebut tetap konsisten & tertelusur).
 */
function ubahStatusUser(username, statusAktif) {
  const baris = cariBarisUser(username);
  if (!baris) return { success: false, message: 'User tidak ditemukan.' };
  const sheet = bukaSheetUsers();
  sheet.getRange(baris.rowIndex, KOLOM_USERS.STATUS_AKTIF).setValue(!!statusAktif);
  return { success: true, message: statusAktif ? 'User diaktifkan kembali.' : 'User dinonaktifkan.' };
}

// ============================================================================
// FUNGSI BARU — MASTER PELANGGAN (V2, dipertahankan + CRUD Admin V3)
// ============================================================================

function bukaSheetMasterPelanggan() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME_MASTER_PELANGGAN);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_MASTER_PELANGGAN);
    sheet.appendRow(HEADER_MASTER_PELANGGAN);
    sheet.getRange(1, 1, 1, HEADER_MASTER_PELANGGAN.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function cariMasterPelanggan(idPelanggan) {
  const sheet = bukaSheetMasterPelanggan();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !idPelanggan) return { ditemukan: false };
  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const idCari = String(idPelanggan).trim();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === idCari) {
      return {
        ditemukan: true,
        namaPelanggan: String(data[i][1] || '').trim(),
        nomorMeterBaru: String(data[i][2] || '').trim(),
        rowIndex: i + 2
      };
    }
  }
  return { ditemukan: false };
}

function ambilSeluruhMasterPelanggan() {
  const sheet = bukaSheetMasterPelanggan();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  return data.map(function (baris) {
    return {
      idPelanggan: String(baris[0] || ''),
      namaPelanggan: String(baris[1] || ''),
      nomorMeterBaru: String(baris[2] || '')
    };
  });
}

function validasiNomorMeterBaruVsMaster(idPelanggan, nomorMeterBaruInput) {
  const dataMaster = cariMasterPelanggan(idPelanggan);
  if (!dataMaster.ditemukan) return null;
  if (!dataMaster.nomorMeterBaru) return null;
  if (String(nomorMeterBaruInput).trim() !== String(dataMaster.nomorMeterBaru).trim()) {
    return 'Nomor meter baru tidak sesuai database MASTER_PELANGGAN.';
  }
  return null;
}

function tambahMasterPelanggan(idPelanggan, namaPelanggan, nomorMeterBaru) {
  if (!idPelanggan || !namaPelanggan) {
    return { success: false, message: 'ID Pelanggan dan Nama Pelanggan wajib diisi.' };
  }
  if (cariMasterPelanggan(idPelanggan).ditemukan) {
    return { success: false, message: 'ID Pelanggan sudah ada di database.' };
  }
  const sheet = bukaSheetMasterPelanggan();
  sheet.appendRow([String(idPelanggan).trim(), String(namaPelanggan).trim(), String(nomorMeterBaru || '').trim()]);
  return { success: true, message: 'Data pelanggan berhasil ditambahkan.' };
}

function editMasterPelanggan(idPelanggan, namaPelanggan, nomorMeterBaru) {
  const data = cariMasterPelanggan(idPelanggan);
  if (!data.ditemukan) return { success: false, message: 'ID Pelanggan tidak ditemukan.' };
  const sheet = bukaSheetMasterPelanggan();
  sheet.getRange(data.rowIndex, 2).setValue(String(namaPelanggan || '').trim());
  sheet.getRange(data.rowIndex, 3).setValue(String(nomorMeterBaru || '').trim());
  return { success: true, message: 'Data pelanggan berhasil diubah.' };
}

function hapusMasterPelanggan(idPelanggan) {
  const data = cariMasterPelanggan(idPelanggan);
  if (!data.ditemukan) return { success: false, message: 'ID Pelanggan tidak ditemukan.' };
  bukaSheetMasterPelanggan().deleteRow(data.rowIndex);
  return { success: true, message: 'Data pelanggan berhasil dihapus.' };
}

// ============================================================================
// [V3] FUNGSI BARU — MASTER METER BARU (stok meter siap pakai)
// ============================================================================

function bukaSheetMasterMeter() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME_MASTER_METER_BARU);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_MASTER_METER_BARU);
    sheet.appendRow(HEADER_MASTER_METER_BARU);
    sheet.getRange(1, 1, 1, HEADER_MASTER_METER_BARU.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function cariBarisMeter(nomorMeter) {
  const sheet = bukaSheetMasterMeter();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !nomorMeter) return null;
  const data = sheet.getRange(2, 1, lastRow - 1, HEADER_MASTER_METER_BARU.length).getValues();
  const cari = String(nomorMeter).trim();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][KOLOM_METER.NOMOR_METER - 1]).trim() === cari) {
      return { rowIndex: i + 2, values: data[i] };
    }
  }
  return null;
}

function cariMasterMeterBaru(nomorMeter) {
  const baris = cariBarisMeter(nomorMeter);
  if (!baris) return { ditemukan: false };
  return {
    ditemukan: true,
    status: String(baris.values[KOLOM_METER.STATUS - 1] || '').trim().toUpperCase(),
    dipakaiOleh: String(baris.values[KOLOM_METER.DIPAKAI_OLEH - 1] || '')
  };
}

function tandaiMeterTerpakai(nomorMeter, idPelanggan, namaPetugas, timestamp) {
  const baris = cariBarisMeter(nomorMeter);
  if (!baris) return; // Seharusnya tidak terjadi karena sudah dicek sebelumnya di doPost.
  const sheet = bukaSheetMasterMeter();
  sheet.getRange(baris.rowIndex, KOLOM_METER.STATUS).setValue(STATUS_METER_USED);
  sheet.getRange(baris.rowIndex, KOLOM_METER.DIPAKAI_OLEH).setValue(idPelanggan);
  sheet.getRange(baris.rowIndex, KOLOM_METER.PETUGAS).setValue(namaPetugas);
  sheet.getRange(baris.rowIndex, KOLOM_METER.TANGGAL).setValue(timestamp);
}

function ambilSeluruhMasterMeter() {
  const sheet = bukaSheetMasterMeter();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, HEADER_MASTER_METER_BARU.length).getValues();
  return data.map(function (baris) {
    return {
      nomorMeter: String(baris[KOLOM_METER.NOMOR_METER - 1] || ''),
      status: String(baris[KOLOM_METER.STATUS - 1] || ''),
      dipakaiOleh: String(baris[KOLOM_METER.DIPAKAI_OLEH - 1] || ''),
      petugas: String(baris[KOLOM_METER.PETUGAS - 1] || ''),
      tanggal: String(baris[KOLOM_METER.TANGGAL - 1] || '')
    };
  }).reverse();
}

function tambahMasterMeter(nomorMeter) {
  if (!nomorMeter || String(nomorMeter).trim() === '') {
    return { success: false, message: 'Nomor meter wajib diisi.' };
  }
  if (cariBarisMeter(nomorMeter)) {
    return { success: false, message: 'Nomor meter sudah ada di database.' };
  }
  const sheet = bukaSheetMasterMeter();
  sheet.appendRow([String(nomorMeter).trim(), STATUS_METER_READY, '', '', '']);
  return { success: true, message: 'Nomor meter berhasil ditambahkan dengan status READY.' };
}

/**
 * Menambah banyak nomor meter sekaligus (misal admin paste daftar nomor
 * dari SPK/faktur pembelian meter baru), satu nomor per baris teks.
 */
function tambahBanyakMasterMeter(daftarNomor) {
  if (!daftarNomor || !Array.isArray(daftarNomor) || daftarNomor.length === 0) {
    return { success: false, message: 'Daftar nomor meter kosong.' };
  }
  const sheet = bukaSheetMasterMeter();
  let jumlahDitambah = 0;
  let jumlahDilewati = 0;
  daftarNomor.forEach(function (nomor) {
    const bersih = String(nomor).trim();
    if (!bersih) return;
    if (cariBarisMeter(bersih)) { jumlahDilewati++; return; }
    sheet.appendRow([bersih, STATUS_METER_READY, '', '', '']);
    jumlahDitambah++;
  });
  return {
    success: true,
    message: jumlahDitambah + ' nomor meter berhasil ditambahkan' + (jumlahDilewati > 0 ? ', ' + jumlahDilewati + ' dilewati karena sudah ada.' : '.')
  };
}

function ubahStatusMeter(nomorMeter, statusBaru) {
  const statusValid = [STATUS_METER_READY, STATUS_METER_USED, STATUS_METER_CANCELLED];
  if (statusValid.indexOf(statusBaru) === -1) {
    return { success: false, message: 'Status tidak valid.' };
  }
  const baris = cariBarisMeter(nomorMeter);
  if (!baris) return { success: false, message: 'Nomor meter tidak ditemukan.' };
  bukaSheetMasterMeter().getRange(baris.rowIndex, KOLOM_METER.STATUS).setValue(statusBaru);
  return { success: true, message: 'Status meter berhasil diubah menjadi ' + statusBaru + '.' };
}

function hapusMasterMeter(nomorMeter) {
  const baris = cariBarisMeter(nomorMeter);
  if (!baris) return { success: false, message: 'Nomor meter tidak ditemukan.' };
  bukaSheetMasterMeter().deleteRow(baris.rowIndex);
  return { success: true, message: 'Nomor meter berhasil dihapus.' };
}

/**
 * [Fitur #12] Agregasi dashboard stok meter: total per status + jumlah
 * meter yang dipakai 7 hari terakhir (grafik penggunaan sederhana).
 */
function hitungStokMeter() {
  const sheet = bukaSheetMasterMeter();
  const lastRow = sheet.getLastRow();

  const hasil = { totalReady: 0, totalUsed: 0, totalCancelled: 0, grafikPenggunaan: mapKeArrayGrafikHarian(buatTemplateGrafikHarian()) };
  if (lastRow < 2) return hasil;

  const data = sheet.getRange(2, 1, lastRow - 1, HEADER_MASTER_METER_BARU.length).getValues();
  const grafikMap = buatTemplateGrafikHarian();

  data.forEach(function (baris) {
    const status = String(baris[KOLOM_METER.STATUS - 1] || '').trim().toUpperCase();
    if (status === STATUS_METER_READY) hasil.totalReady++;
    else if (status === STATUS_METER_USED) {
      hasil.totalUsed++;
      const tanggalBaris = parseTimestampKolom(baris[KOLOM_METER.TANGGAL - 1]);
      if (tanggalBaris) {
        const key = Utilities.formatDate(tanggalBaris, 'GMT+7', 'dd/MM');
        if (grafikMap.hasOwnProperty(key)) grafikMap[key]++;
      }
    } else if (status === STATUS_METER_CANCELLED) hasil.totalCancelled++;
  });

  hasil.grafikPenggunaan = mapKeArrayGrafikHarian(grafikMap);
  return hasil;
}

// ============================================================================
// FUNGSI BARU — PENCEGAHAN NOMOR METER GANDA (V1/V2, dipertahankan)
// ============================================================================
function nomorMeterBaruSudahDipakai(nomorMeterBaru) {
  const sheet = bukaSheetData();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !nomorMeterBaru) return false;
  const rangeKolomG = sheet.getRange(2, KOLOM.NOMOR_METER_BARU, lastRow - 1, 1);
  const finder = rangeKolomG.createTextFinder(String(nomorMeterBaru).trim()).matchEntireCell(true).matchCase(false);
  return finder.findNext() !== null;
}

// ============================================================================
// FUNGSI BARU — DASHBOARD REKAP (V2, dipertahankan)
// ============================================================================
function hitungDataDashboard() {
  const sheet = bukaSheetData();
  const lastRow = sheet.getLastRow();

  const hasilKosong = {
    totalHariIni: 0, totalMingguIni: 0, totalBulanIni: 0,
    breakdownJenisMeter: { prabayar: 0, pascabayar: 0 },
    breakdownAlasan: { kwhTua: 0, rusak: 0, buram: 0, terbakar: 0 },
    grafikHarian: mapKeArrayGrafikHarian(buatTemplateGrafikHarian()),
    grafikBulanan: mapKeArrayGrafikBulanan(buatTemplateGrafikBulanan()),
    rankingPetugas: []
  };

  if (lastRow < 2) return hasilKosong;

  const data = sheet.getRange(2, 1, lastRow - 1, KOLOM.PETUGAS_LAPANGAN).getValues();
  const sekarang = new Date();
  const awalHariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  const awalMingguIni = new Date(awalHariIni);
  awalMingguIni.setDate(awalHariIni.getDate() - awalHariIni.getDay());
  const awalBulanIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);

  const grafikHarianMap = buatTemplateGrafikHarian();
  const grafikBulananMap = buatTemplateGrafikBulanan();
  const rankingMap = {};

  let totalHariIni = 0, totalMingguIni = 0, totalBulanIni = 0;
  const breakdownJenisMeter = { prabayar: 0, pascabayar: 0 };
  const breakdownAlasan = { kwhTua: 0, rusak: 0, buram: 0, terbakar: 0 };

  data.forEach(function (baris) {
    const tanggalBaris = parseTimestampKolom(baris[KOLOM.TIMESTAMP - 1]);
    if (!tanggalBaris) return;

    const jenisMeter = String(baris[KOLOM.JENIS_METER - 1] || '').trim();
    const alasan = String(baris[KOLOM.ALASAN_PENGGANTIAN - 1] || '').trim();
    const petugas = String(baris[KOLOM.PETUGAS_LAPANGAN - 1] || '').trim();

    if (tanggalBaris >= awalHariIni) totalHariIni++;
    if (tanggalBaris >= awalMingguIni) totalMingguIni++;
    if (tanggalBaris >= awalBulanIni) totalBulanIni++;

    if (jenisMeter === 'Prabayar') breakdownJenisMeter.prabayar++;
    if (jenisMeter === 'Pascabayar') breakdownJenisMeter.pascabayar++;

    if (alasan === 'KWH TUA') breakdownAlasan.kwhTua++;
    if (alasan === 'kWh Meter Rusak') breakdownAlasan.rusak++;
    if (alasan === 'Buram') breakdownAlasan.buram++;
    if (alasan === 'Terbakar') breakdownAlasan.terbakar++;

    const keyHarian = Utilities.formatDate(tanggalBaris, 'GMT+7', 'dd/MM');
    if (grafikHarianMap.hasOwnProperty(keyHarian)) grafikHarianMap[keyHarian]++;

    const keyBulanan = Utilities.formatDate(tanggalBaris, 'GMT+7', 'MM/yyyy');
    if (grafikBulananMap.hasOwnProperty(keyBulanan)) grafikBulananMap[keyBulanan]++;

    if (petugas) rankingMap[petugas] = (rankingMap[petugas] || 0) + 1;
  });

  const rankingPetugas = Object.keys(rankingMap)
    .map(function (nama) { return { nama: nama, jumlah: rankingMap[nama] }; })
    .sort(function (a, b) { return b.jumlah - a.jumlah; })
    .slice(0, 10);

  return {
    totalHariIni: totalHariIni, totalMingguIni: totalMingguIni, totalBulanIni: totalBulanIni,
    breakdownJenisMeter: breakdownJenisMeter, breakdownAlasan: breakdownAlasan,
    grafikHarian: mapKeArrayGrafikHarian(grafikHarianMap),
    grafikBulanan: mapKeArrayGrafikBulanan(grafikBulananMap),
    rankingPetugas: rankingPetugas
  };
}

function buatTemplateGrafikHarian() {
  const map = {};
  const sekarang = new Date();
  for (let i = 6; i >= 0; i--) {
    const tanggal = new Date(sekarang);
    tanggal.setDate(sekarang.getDate() - i);
    map[Utilities.formatDate(tanggal, 'GMT+7', 'dd/MM')] = 0;
  }
  return map;
}

function mapKeArrayGrafikHarian(map) {
  return Object.keys(map).map(function (tanggal) { return { tanggal: tanggal, jumlah: map[tanggal] }; });
}

function buatTemplateGrafikBulanan() {
  const map = {};
  const sekarang = new Date();
  for (let i = 11; i >= 0; i--) {
    const tanggal = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    map[Utilities.formatDate(tanggal, 'GMT+7', 'MM/yyyy')] = 0;
  }
  return map;
}

function mapKeArrayGrafikBulanan(map) {
  const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return Object.keys(map).map(function (key) {
    const bulanIndex = parseInt(key.split('/')[0], 10) - 1;
    return { bulan: namaBulan[bulanIndex], jumlah: map[key] };
  });
}

function parseTimestampKolom(nilaiCell) {
  if (!nilaiCell) return null;
  if (Object.prototype.toString.call(nilaiCell) === '[object Date]') return nilaiCell;
  const str = String(nilaiCell).trim();
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6]));
}

// ============================================================================
// FUNGSI BARU — STATISTIK PETUGAS (V2, dipertahankan)
// ============================================================================
function hitungStatistikPetugas(namaPetugas) {
  const sheet = bukaSheetData();
  const lastRow = sheet.getLastRow();
  const hasilKosong = {
    hariIni: 0, mingguIni: 0, bulanIni: 0, jumlahPrabayar: 0, jumlahPascabayar: 0,
    jumlahKwhTua: 0, jumlahRusak: 0, jumlahBuram: 0, jumlahTerbakar: 0
  };
  if (lastRow < 2 || !namaPetugas) return hasilKosong;

  const data = sheet.getRange(2, 1, lastRow - 1, KOLOM.PETUGAS_LAPANGAN).getValues();
  const sekarang = new Date();
  const awalHariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  const awalMingguIni = new Date(awalHariIni);
  awalMingguIni.setDate(awalHariIni.getDate() - awalHariIni.getDay());
  const awalBulanIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);

  const hasil = { hariIni: 0, mingguIni: 0, bulanIni: 0, jumlahPrabayar: 0, jumlahPascabayar: 0, jumlahKwhTua: 0, jumlahRusak: 0, jumlahBuram: 0, jumlahTerbakar: 0 };

  data.forEach(function (baris) {
    const petugasBaris = String(baris[KOLOM.PETUGAS_LAPANGAN - 1] || '').trim();
    if (petugasBaris !== String(namaPetugas).trim()) return;

    const tanggalBaris = parseTimestampKolom(baris[KOLOM.TIMESTAMP - 1]);
    const jenisMeter = String(baris[KOLOM.JENIS_METER - 1] || '').trim();
    const alasan = String(baris[KOLOM.ALASAN_PENGGANTIAN - 1] || '').trim();

    if (tanggalBaris) {
      if (tanggalBaris >= awalHariIni) hasil.hariIni++;
      if (tanggalBaris >= awalMingguIni) hasil.mingguIni++;
      if (tanggalBaris >= awalBulanIni) hasil.bulanIni++;
    }
    if (jenisMeter === 'Prabayar') hasil.jumlahPrabayar++;
    if (jenisMeter === 'Pascabayar') hasil.jumlahPascabayar++;
    if (alasan === 'KWH TUA') hasil.jumlahKwhTua++;
    if (alasan === 'kWh Meter Rusak') hasil.jumlahRusak++;
    if (alasan === 'Buram') hasil.jumlahBuram++;
    if (alasan === 'Terbakar') hasil.jumlahTerbakar++;
  });

  return hasil;
}

// ============================================================================
// [V3] RIWAYAT LAPORAN — kini difilter per nama petugas yang login
// ============================================================================
function ambilRiwayatLaporan(namaPetugasFilter) {
  const JUMLAH = 10;
  const sheet = bukaSheetData();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, KOLOM.LINK_FOTO_BARU).getValues();
  const namaCari = String(namaPetugasFilter || '').trim();

  const hasil = [];
  for (let i = data.length - 1; i >= 0 && hasil.length < JUMLAH; i--) {
    const baris = data[i];
    const petugasBaris = String(baris[KOLOM.PETUGAS_LAPANGAN - 1] || '').trim();
    if (namaCari && petugasBaris !== namaCari) continue;

    hasil.push({
      timestamp: String(baris[KOLOM.TIMESTAMP - 1] || ''),
      namaPelanggan: String(baris[KOLOM.NAMA_PELANGGAN - 1] || ''),
      idPelanggan: String(baris[KOLOM.ID_PELANGGAN - 1] || ''),
      nomorMeterBaru: String(baris[KOLOM.NOMOR_METER_BARU - 1] || ''),
      status: 'Tersimpan'
    });
  }
  return hasil;
}

// ============================================================================
// FUNGSI BARU — DASHBOARD LOKASI (V2, dipertahankan)
// ============================================================================
function ambilDaftarLokasi() {
  const BATAS_MAKSIMAL = 50;
  const sheet = bukaSheetData();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, KOLOM.GOOGLE_MAPS_URL).getValues();
  const hasil = [];
  for (let i = data.length - 1; i >= 0 && hasil.length < BATAS_MAKSIMAL; i--) {
    const baris = data[i];
    const latitude = baris[KOLOM.LATITUDE - 1];
    const googleMapsUrl = baris[KOLOM.GOOGLE_MAPS_URL - 1];
    if (latitude && googleMapsUrl) {
      hasil.push({
        namaPelanggan: String(baris[KOLOM.NAMA_PELANGGAN - 1] || ''),
        petugasLapangan: String(baris[KOLOM.PETUGAS_LAPANGAN - 1] || ''),
        timestamp: String(baris[KOLOM.TIMESTAMP - 1] || ''),
        googleMapsUrl: String(googleMapsUrl)
      });
    }
  }
  return hasil;
}

// ============================================================================
// FUNGSI BARU — LOG ERROR (V2, dipertahankan)
// ============================================================================
function catatLogError(actionName, error, detail) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_LOG_ERROR);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME_LOG_ERROR);
      sheet.appendRow(HEADER_LOG_ERROR);
      sheet.getRange(1, 1, 1, HEADER_LOG_ERROR.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      formatTimestamp(new Date()), actionName,
      error && error.message ? error.message : String(error),
      detail ? JSON.stringify(detail).slice(0, 500) : ''
    ]);
  } catch (logError) {
    Logger.log('Gagal menulis Log Error: ' + logError.message);
  }
}

// ============================================================================
// FUNGSI SETUP — jalankan manual sekali dari editor Apps Script
// ============================================================================

/**
 * [V3] Jalankan SEKALI setelah menimpa Code.gs lama dengan file ini.
 * Membuat seluruh sheet yang dibutuhkan V1+V2+V3 sekaligus jika belum ada.
 * AMAN dijalankan berkali-kali — sheet yang sudah ada TIDAK ditimpa/dirusak.
 */
function setupAwalV3() {
  bukaSheetData();
  bukaSheetMasterPelanggan();
  bukaSheetMasterMeter();
  bukaSheetUsers();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (!ss.getSheetByName(SHEET_NAME_LOG_ERROR)) {
    const sheetLog = ss.insertSheet(SHEET_NAME_LOG_ERROR);
    sheetLog.appendRow(HEADER_LOG_ERROR);
    sheetLog.getRange(1, 1, 1, HEADER_LOG_ERROR.length).setFontWeight('bold');
    sheetLog.setFrozenRows(1);
  }

  if (!ss.getSheetByName(SHEET_NAME_SETTING)) {
    const sheetSetting = ss.insertSheet(SHEET_NAME_SETTING);
    sheetSetting.appendRow(['Keterangan', 'Nilai']);
    sheetSetting.appendRow(['Catatan V3', 'PIN Admin tunggal sudah digantikan sistem login (sheet USERS). Lihat README.']);
    sheetSetting.getRange(1, 1, 1, 2).setFontWeight('bold');
    sheetSetting.setFrozenRows(1);
  }

  Logger.log('Setup V3 selesai. Sheet Data Ganmet, MASTER_PELANGGAN, MASTER_METER_BARU, USERS, Log Error, Setting sudah siap.');
  Logger.log('Akun admin default (jika USERS baru dibuat): username=admin, password=ganti-password-ini. GANTI SEGERA lewat Panel Admin.');
}

/**
 * [V2] Migrasi kolom lama — dipertahankan untuk pengguna yang upgrade
 * langsung dari V1 murni (belum pernah melalui V2). Tidak menyentuh data.
 */
function migrasiKolomV2() {
  const sheet = bukaSheetData();
  const headerSaatIni = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headerSaatIni.length >= HEADER_KOLOM.length) {
    Logger.log('Header sudah lengkap (' + headerSaatIni.length + ' kolom). Tidak ada migrasi yang diperlukan.');
    return;
  }
  for (let i = headerSaatIni.length; i < HEADER_KOLOM.length; i++) {
    sheet.getRange(1, i + 1).setValue(HEADER_KOLOM[i]).setFontWeight('bold');
  }
  Logger.log('Migrasi selesai. Header kolom L-P sudah ditambahkan tanpa mengubah data lama.');
}
