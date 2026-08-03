/**
 * appsScriptService.js
 * ----------------------------------------------------------------------------
 * Semua kode yang berbicara ke Google Apps Script (backend) dikumpulkan
 * di sini. Komponen React tidak perlu tahu detail fetch().
 *
 * [V3] Ditambahkan fungsi-fungsi baru untuk: Login, cek status Master
 * Meter Baru, Dashboard Stok Meter, dan CRUD Panel Admin (Users, Master
 * Pelanggan, Master Meter). Fungsi V1/V2 yang masih relevan (kirimLaporan,
 * cariMasterPelanggan, dashboard, riwayat, lokasi) DIPERTAHANKAN, hanya
 * `kirimLaporan` dan `ambilRiwayatLaporan` kini menyertakan token sesi
 * (dibutuhkan backend V3 untuk validasi login).
 * ----------------------------------------------------------------------------
 */

import { APPS_SCRIPT_URL, APP_SECRET_KEY } from '../utils/constants';

const TIMEOUT_MS = 45000;

function fetchDenganTimeout(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

async function panggilActionGet(action, paramTambahan = {}) {
  const params = new URLSearchParams({ action, ...paramTambahan });
  const url = `${APPS_SCRIPT_URL}?${params.toString()}`;
  const response = await fetchDenganTimeout(url, { method: 'GET' }, 30000);
  if (!response.ok) throw new Error('Respons server tidak OK (status: ' + response.status + ')');
  return response.json();
}

async function panggilActionPost(action, dataTambahan = {}) {
  const body = JSON.stringify({ action, appSecret: APP_SECRET_KEY, ...dataTambahan });
  const response = await fetchDenganTimeout(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body
  });
  if (!response.ok) throw new Error('Respons server tidak OK (status: ' + response.status + ')');
  return response.json();
}

// ============================================================================
// [V3] LOGIN
// ============================================================================

/**
 * Mengirim username/password ke server. Jika berhasil, server
 * mengembalikan token sesi bertanda tangan HMAC + data user (nama
 * lengkap, role) yang akan disimpan di localStorage oleh useAuth.
 */
export async function login(username, password) {
  try {
    return await panggilActionPost('login', { username, password });
  } catch (error) {
    return { success: false, message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
  }
}

// ============================================================================
// FITUR — SUBMIT LAPORAN (V1, dipertahankan; [V3] +token sesi)
// ============================================================================

export async function kirimLaporan(payload, token) {
  const body = JSON.stringify({ ...payload, token, appSecret: APP_SECRET_KEY });
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body
  };

  try {
    return await cobaKirim(options);
  } catch (errorPertama) {
    console.warn('Percobaan pertama gagal, mencoba ulang sekali...', errorPertama.message);
    try {
      return await cobaKirim(options);
    } catch (errorKedua) {
      return { success: false, message: 'Gagal mengirim laporan. Silakan coba kembali.' };
    }
  }
}

async function cobaKirim(options) {
  const response = await fetchDenganTimeout(APPS_SCRIPT_URL, options);
  if (!response.ok) throw new Error('Respons server tidak OK (status: ' + response.status + ')');
  return response.json();
}

// ============================================================================
// FITUR — MASTER PELANGGAN (V2, dipertahankan)
// ============================================================================

export async function cariMasterPelanggan(idPelanggan) {
  try {
    const json = await panggilActionGet('cariPelanggan', { idPelanggan });
    if (json.success) return json.data;
    return { ditemukan: false };
  } catch (error) {
    console.warn('Gagal mencari data Master Pelanggan:', error.message);
    return { ditemukan: false, gagalKoneksi: true };
  }
}

// ============================================================================
// [V3] FITUR — MASTER METER BARU (cek status stok)
// ============================================================================

export async function cariMeterBaru(nomorMeter) {
  try {
    const json = await panggilActionGet('cariMeterBaru', { nomorMeter });
    if (json.success) return json.data;
    return { ditemukan: false };
  } catch (error) {
    console.warn('Gagal memeriksa status meter baru:', error.message);
    return { ditemukan: false, gagalKoneksi: true };
  }
}

// ============================================================================
// FITUR — DASHBOARD REKAP & STATISTIK PETUGAS (V2, dipertahankan)
// ============================================================================

export async function ambilDataDashboard() {
  const json = await panggilActionGet('getDashboard');
  if (!json.success) throw new Error(json.message || 'Gagal mengambil data dashboard.');
  return json.data;
}

export async function ambilStatistikPetugas(namaPetugas) {
  const json = await panggilActionGet('getStatistikPetugas', { nama: namaPetugas });
  if (!json.success) throw new Error(json.message || 'Gagal mengambil statistik petugas.');
  return json.data;
}

// [V3] Dashboard Stok Meter
export async function ambilStokMeter() {
  const json = await panggilActionGet('getStokMeter');
  if (!json.success) throw new Error(json.message || 'Gagal mengambil data stok meter.');
  return json.data;
}

// ============================================================================
// FITUR — RIWAYAT LAPORAN ([V3] difilter per petugas login, wajib token)
// ============================================================================

export async function ambilRiwayatLaporan(token) {
  const json = await panggilActionGet('getRiwayat', { token });
  if (!json.success) throw new Error(json.message || 'Gagal mengambil riwayat laporan.');
  return json.data;
}

// ============================================================================
// FITUR — DASHBOARD LOKASI (V2, dipertahankan)
// ============================================================================

export async function ambilDaftarLokasi() {
  const json = await panggilActionGet('getLokasi');
  if (!json.success) throw new Error(json.message || 'Gagal mengambil daftar lokasi.');
  return json.data;
}

// ============================================================================
// [V3] PANEL ADMIN — KELOLA USER
// ============================================================================

export async function ambilDaftarUsers(token) {
  const json = await panggilActionGet('getUsers', { token });
  if (!json.success) throw new Error(json.message || 'Gagal mengambil daftar user.');
  return json.data;
}

export async function tambahUser(token, username, password, namaLengkap, role) {
  return panggilActionPost('tambahUser', { token, username, password, namaLengkap, role });
}

export async function editUser(token, username, namaLengkap, role, passwordBaru) {
  return panggilActionPost('editUser', { token, username, namaLengkap, role, passwordBaru });
}

export async function ubahStatusUser(token, username, statusAktif) {
  return panggilActionPost('ubahStatusUser', { token, username, statusAktif });
}

// ============================================================================
// [V3] PANEL ADMIN — KELOLA MASTER PELANGGAN
// ============================================================================

export async function ambilSeluruhMasterPelanggan(token) {
  const json = await panggilActionGet('getMasterPelangganList', { token });
  if (!json.success) throw new Error(json.message || 'Gagal mengambil daftar pelanggan.');
  return json.data;
}

export async function tambahMasterPelanggan(token, idPelanggan, namaPelanggan, nomorMeterBaru) {
  return panggilActionPost('tambahMasterPelanggan', { token, idPelanggan, namaPelanggan, nomorMeterBaru });
}

export async function editMasterPelanggan(token, idPelanggan, namaPelanggan, nomorMeterBaru) {
  return panggilActionPost('editMasterPelanggan', { token, idPelanggan, namaPelanggan, nomorMeterBaru });
}

export async function hapusMasterPelanggan(token, idPelanggan) {
  return panggilActionPost('hapusMasterPelanggan', { token, idPelanggan });
}

// ============================================================================
// [V3] PANEL ADMIN — KELOLA MASTER METER BARU
// ============================================================================

export async function ambilSeluruhMasterMeter(token) {
  const json = await panggilActionGet('getMasterMeterList', { token });
  if (!json.success) throw new Error(json.message || 'Gagal mengambil daftar meter.');
  return json.data;
}

export async function tambahMasterMeter(token, nomorMeter) {
  return panggilActionPost('tambahMasterMeter', { token, nomorMeter });
}

export async function tambahBanyakMasterMeter(token, daftarNomor) {
  return panggilActionPost('tambahBanyakMasterMeter', { token, daftarNomor });
}

export async function ubahStatusMeter(token, nomorMeter, statusBaru) {
  return panggilActionPost('ubahStatusMeter', { token, nomorMeter, statusBaru });
}

export async function hapusMasterMeter(token, nomorMeter) {
  return panggilActionPost('hapusMasterMeter', { token, nomorMeter });
}
