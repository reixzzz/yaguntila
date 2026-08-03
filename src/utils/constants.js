/**
 * constants.js
 * ----------------------------------------------------------------------------
 * Tempat menyimpan semua nilai "tetap" yang dipakai berulang kali di
 * aplikasi.
 *
 * [V3] Diperluas untuk YAGUNTILA V3 (Login, Master Meter Baru, QR/Barcode
 * Scanner, Dashboard Stok Meter, Panel Admin diperluas). Konstanta V1/V2
 * yang masih relevan DIPERTAHANKAN. `ADMIN_PIN` DIHAPUS — digantikan
 * sistem login sungguhan (lihat Upgrade Specification §1), jadi tidak ada
 * lagi PIN statis yang perlu disimpan di kode frontend.
 * ----------------------------------------------------------------------------
 */

// URL Web App Google Apps Script Anda (SAMA seperti V1/V2 Anda).
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyoy41FRF1XlQvErTg6Ku3SiVMr9PTuTCkLt0KY_84YYyK4QfntJwdLV3dXnEYvtK-P/exec';

// Kunci rahasia aplikasi — HARUS SAMA dengan APP_SECRET_KEY di Code.gs.
export const APP_SECRET_KEY = 'YGT-2026-beningarya-PLN-5626';

// Pilihan dropdown "Jenis Meter" & "Alasan Penggantian" (tidak berubah)
export const JENIS_METER_OPTIONS = ['Prabayar', 'Pascabayar'];
export const ALASAN_PENGGANTIAN_OPTIONS = ['KWH TUA', 'kWh Meter Rusak', 'Buram', 'Terbakar'];

// Aturan validasi panjang digit
export const PANJANG_ID_PELANGGAN = 12;

// [V2] Nomor Meter Lama: 6-12 digit (bug fix, dipertahankan).
export const PANJANG_MIN_NOMOR_METER_LAMA = 6;
export const PANJANG_MAX_NOMOR_METER_LAMA = 12;

// [V3] Nomor Meter Baru: dahulu wajib 11 digit persis. Karena kini nomor
// meter divalidasi keberadaannya di database MASTER_METER_BARU (bukan
// sekadar format), format diperlonggar ke rentang wajar 6-12 digit
// (selaras dengan berbagai format kode meter yang mungkin dipindai dari
// QR/Barcode berbeda pabrikan) — validasi SEBENARNYA tetap ketat lewat
// pengecekan status READY di server, bukan hanya panjang digit.
export const PANJANG_MIN_NOMOR_METER_BARU = 6;
export const PANJANG_MAX_NOMOR_METER_BARU = 12;

// Pengaturan kompresi foto (tidak berubah)
export const FOTO_MAX_WIDTH_PX = 1280;
export const FOTO_MAX_SIZE_MB = 0.5;

export const PESAN = {
  LOADING_SUBMIT: 'Mengirim laporan...',
  SUKSES_SUBMIT: 'Laporan berhasil dikirim.',
  GAGAL_SUBMIT: 'Gagal mengirim laporan. Silakan coba kembali.',
  LOADING_KOMPRES: 'Memproses foto...',
  TERSIMPAN_OFFLINE: 'Internet tidak tersedia. Laporan disimpan di antrian dan akan otomatis terkirim saat internet kembali.',
  ANTRIAN_TERKIRIM: 'laporan dari antrian offline berhasil terkirim.',
  ANTRIAN_PENUH: 'Antrian offline penuh (maksimal 5 laporan). Sambungkan internet untuk mengirim antrian sebelum menambah laporan baru.'
};

// ============================================================================
// [V3] KONFIGURASI BARU — LOGIN & SESI
// ============================================================================

// Key localStorage untuk menyimpan sesi login (token + info user).
export const STORAGE_KEY_SESI = 'yaguntila_sesi_v3';

// Role yang dikenali aplikasi (harus sama persis dengan Code.gs).
export const ROLE_ADMIN = 'ADMIN';
export const ROLE_PETUGAS = 'PETUGAS';

// ============================================================================
// [V3] KONFIGURASI BARU — MASTER METER BARU (stok meter)
// ============================================================================

export const STATUS_METER = {
  READY: 'READY',
  USED: 'USED',
  CANCELLED: 'CANCELLED'
};

export const OFFLINE_QUEUE_MAX = 5;
export const STORAGE_KEY_DRAFT = 'yaguntila_draft_v3';
export const STORAGE_KEY_QUEUE = 'yaguntila_offline_queue_v3';
export const JUMLAH_RIWAYAT = 10;
export const DEBOUNCE_LOOKUP_MS = 600;

// Warna grafik Dashboard — selaras dengan palet brand.
export const WARNA_CHART = {
  prabayar: '#0F4C81',
  pascabayar: '#2ECC71',
  kwhTua: '#0F4C81',
  rusak: '#E74C3C',
  buram: '#F5A623',
  terbakar: '#8E44AD',
  ready: '#2ECC71',
  used: '#0F4C81',
  cancelled: '#E74C3C'
};
