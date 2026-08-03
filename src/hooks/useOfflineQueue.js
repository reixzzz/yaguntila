/**
 * useOfflineQueue.js
 * ----------------------------------------------------------------------------
 * [V2] Fitur #9 — menyediakan jumlah antrian offline saat ini ke komponen
 * UI (untuk badge counter), serta mendaftarkan auto-sync setiap kali
 * koneksi internet kembali tersedia.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useCallback } from 'react';
import { jumlahAntrianOffline } from '../utils/localStorage';
import { daftarkanAutoSyncSaatOnline, sinkronkanAntrianOffline } from '../services/offlineSyncService';

export function useOfflineQueue() {
  const [jumlahAntrian, setJumlahAntrian] = useState(() => jumlahAntrianOffline());

  const segarkanJumlah = useCallback(() => {
    setJumlahAntrian(jumlahAntrianOffline());
  }, []);

  useEffect(() => {
    const batalkan = daftarkanAutoSyncSaatOnline(() => {
      segarkanJumlah();
    });
    return batalkan;
  }, [segarkanJumlah]);

  /**
   * Memicu sinkronisasi antrian secara manual (misal lewat tombol
   * "Kirim Sekarang" di UI), berguna jika petugas tidak ingin menunggu
   * event 'online' otomatis (misal sinyal naik-turun tidak stabil).
   */
  const sinkronkanManual = useCallback(async () => {
    const hasil = await sinkronkanAntrianOffline();
    segarkanJumlah();
    return hasil;
  }, [segarkanJumlah]);

  return { jumlahAntrian, segarkanJumlah, sinkronkanManual };
}
