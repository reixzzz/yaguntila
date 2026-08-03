/**
 * localStorage.js
 * ----------------------------------------------------------------------------
 * Helper untuk seluruh pemakaian localStorage di aplikasi:
 *   - [V3] Sesi Login: menyimpan token + info user setelah login berhasil,
 *     supaya petugas tidak perlu login ulang setiap membuka aplikasi.
 *   - [V2] Draft Otomatis: menyimpan isi form agar tidak hilang kalau
 *     browser/tab tertutup tidak sengaja.
 *   - [V2] Offline Queue: menyimpan laporan yang gagal terkirim karena
 *     tidak ada internet, untuk dikirim ulang otomatis nanti.
 *
 * Semua fungsi dibungkus try/catch karena localStorage bisa gagal jika
 * kuota penuh atau mode privasi browser membatasi storage.
 * ----------------------------------------------------------------------------
 */

import { STORAGE_KEY_DRAFT, STORAGE_KEY_QUEUE, STORAGE_KEY_SESI, OFFLINE_QUEUE_MAX } from './constants';

// ============================================================================
// [V3] SESI LOGIN
// ============================================================================

/**
 * Menyimpan sesi login (token + data user) ke localStorage setelah login
 * berhasil. Token sudah ditandatangani HMAC oleh server (lihat Code.gs),
 * jadi menyimpannya di localStorage aman dari sisi "tidak bisa dipalsukan"
 * — walau tetap bisa dibaca siapa pun yang punya akses fisik ke HP, sama
 * seperti sesi login aplikasi lain pada umumnya.
 */
export function simpanSesi(sesi) {
  try {
    localStorage.setItem(STORAGE_KEY_SESI, JSON.stringify(sesi));
    return true;
  } catch (error) {
    console.warn('Gagal menyimpan sesi login:', error.message);
    return false;
  }
}

export function ambilSesi() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESI);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Gagal membaca sesi login:', error.message);
    return null;
  }
}

export function hapusSesi() {
  try {
    localStorage.removeItem(STORAGE_KEY_SESI);
  } catch (error) {
    console.warn('Gagal menghapus sesi login:', error.message);
  }
}

// ============================================================================
// DRAFT OTOMATIS (V2, dipertahankan)
// ============================================================================

export function simpanDraft(formData) {
  try {
    const draftTeksSaja = {
      namaPelanggan: formData.namaPelanggan,
      idPelanggan: formData.idPelanggan,
      jenisMeter: formData.jenisMeter,
      alasanPenggantian: formData.alasanPenggantian,
      nomorMeterLama: formData.nomorMeterLama,
      nomorMeterBaru: formData.nomorMeterBaru,
      standCabut: formData.standCabut,
      disimpanPada: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draftTeksSaja));
    return true;
  } catch (error) {
    console.warn('Gagal menyimpan draft:', error.message);
    return false;
  }
}

export function ambilDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Gagal membaca draft:', error.message);
    return null;
  }
}

export function hapusDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
  } catch (error) {
    console.warn('Gagal menghapus draft:', error.message);
  }
}

// ============================================================================
// OFFLINE QUEUE (V2, dipertahankan)
// ============================================================================

export function ambilAntrianOffline() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Gagal membaca antrian offline:', error.message);
    return [];
  }
}

export function tambahKeAntrianOffline(payload) {
  try {
    const antrian = ambilAntrianOffline();

    if (antrian.length >= OFFLINE_QUEUE_MAX) {
      return {
        success: false,
        message: `Antrian offline penuh (maksimal ${OFFLINE_QUEUE_MAX} laporan). Sambungkan internet untuk mengirim antrian sebelum menambah laporan baru.`
      };
    }

    const item = {
      id: 'offline_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      payload,
      dibuatPada: new Date().toISOString()
    };

    antrian.push(item);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(antrian));

    return { success: true };
  } catch (error) {
    console.warn('Gagal menambah ke antrian offline:', error.message);
    return {
      success: false,
      message: 'Gagal menyimpan laporan ke antrian offline (kemungkinan penyimpanan HP penuh). Silakan coba kirim ulang saat internet tersedia.'
    };
  }
}

export function hapusDariAntrianOffline(id) {
  try {
    const antrian = ambilAntrianOffline();
    const sisanya = antrian.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(sisanya));
  } catch (error) {
    console.warn('Gagal menghapus item antrian offline:', error.message);
  }
}

export function jumlahAntrianOffline() {
  return ambilAntrianOffline().length;
}
