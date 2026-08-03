/**
 * offlineSyncService.js
 * ----------------------------------------------------------------------------
 * [V2] Fitur #9 — Offline Queue. Mengurus 2 hal:
 *   1. Mendeteksi kapan koneksi internet kembali tersedia (event 'online').
 *   2. Saat koneksi kembali, mengirim SATU PER SATU semua laporan yang
 *      menumpuk di antrian offline (localStorage), lalu menghapusnya dari
 *      antrian begitu berhasil terkirim.
 *
 * Pengiriman dilakukan satu per satu (bukan paralel) agar tidak membanjiri
 * Apps Script dengan banyak request bersamaan (Apps Script Web App punya
 * limit eksekusi paralel) dan agar urutan laporan tetap sesuai urutan
 * dibuatnya.
 * ----------------------------------------------------------------------------
 */

import { kirimLaporan } from './appsScriptService';
import { ambilAntrianOffline, hapusDariAntrianOffline } from '../utils/localStorage';

/**
 * Mengirim seluruh antrian offline yang tersimpan, satu per satu.
 *
 * @param {(info: {sedangMengirim: number, total: number}) => void} onProgress
 *        callback opsional untuk melaporkan progres ke UI (misal Toast).
 * @returns {Promise<{jumlahBerhasil: number, jumlahGagal: number}>}
 */
export async function sinkronkanAntrianOffline(onProgress) {
  const antrian = ambilAntrianOffline();

  let jumlahBerhasil = 0;
  let jumlahGagal = 0;

  for (let i = 0; i < antrian.length; i++) {
    const item = antrian[i];

    if (onProgress) {
      onProgress({ sedangMengirim: i + 1, total: antrian.length });
    }

    try {
      // [V3] item.payload menyertakan `token` sesi yang disematkan saat
      // laporan pertama kali dimasukkan ke antrian (lihat FormGanmet.jsx),
      // supaya laporan offline tetap teridentifikasi ke petugas yang benar
      // saat berhasil dikirim ulang, walau petugas sudah logout/login lagi
      // di antara waktu offline dan waktu sinkronisasi.
      const hasil = await kirimLaporan(item.payload, item.payload.token);
      if (hasil.success) {
        hapusDariAntrianOffline(item.id);
        jumlahBerhasil++;
      } else {
        // Gagal karena alasan VALIDASI (bukan jaringan) — biarkan tetap
        // di antrian supaya petugas bisa melihat & memutuskan sendiri,
        // tapi jangan hentikan proses pengiriman item lain di antrian.
        jumlahGagal++;
      }
    } catch (error) {
      console.warn('Gagal mengirim item antrian offline:', error.message);
      jumlahGagal++;
    }
  }

  return { jumlahBerhasil, jumlahGagal };
}

/**
 * Mendaftarkan listener yang otomatis memicu sinkronisasi antrian setiap
 * kali browser mendeteksi koneksi internet kembali tersedia.
 *
 * @param {(hasil: {jumlahBerhasil: number, jumlahGagal: number}) => void} onSelesai
 * @returns {() => void} fungsi untuk membatalkan pendaftaran listener
 */
export function daftarkanAutoSyncSaatOnline(onSelesai) {
  async function handler() {
    const antrian = ambilAntrianOffline();
    if (antrian.length === 0) return;

    const hasil = await sinkronkanAntrianOffline();
    if (onSelesai) onSelesai(hasil);
  }

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
