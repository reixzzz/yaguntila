/**
 * useMasterPelanggan.js
 * ----------------------------------------------------------------------------
 * [V2] Fitur #3 (autofill nama pelanggan) & #4 (cross-check nomor meter
 * baru). Memantau perubahan ID Pelanggan, lalu setelah 12 digit lengkap
 * DAN petugas berhenti mengetik selama DEBOUNCE_LOOKUP_MS, hook ini akan
 * mencari data pelanggan tersebut di sheet MASTER_PELANGGAN.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useRef } from 'react';
import { cariMasterPelanggan } from '../services/appsScriptService';
import { PANJANG_ID_PELANGGAN, DEBOUNCE_LOOKUP_MS } from '../utils/constants';

export function useMasterPelanggan(idPelanggan) {
  const [dataMaster, setDataMaster] = useState(null); // null = belum dicari
  const [sedangMencari, setSedangMencari] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Bersihkan timer debounce sebelumnya setiap kali idPelanggan berubah
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const idBersih = String(idPelanggan || '').trim();

    // Hanya mulai mencari jika ID Pelanggan sudah lengkap 12 digit —
    // mencegah pencarian sia-sia saat petugas baru mengetik sebagian.
    if (idBersih.length !== PANJANG_ID_PELANGGAN) {
      setDataMaster(null);
      setSedangMencari(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setSedangMencari(true);
      const hasil = await cariMasterPelanggan(idBersih);
      setDataMaster(hasil);
      setSedangMencari(false);
    }, DEBOUNCE_LOOKUP_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idPelanggan]);

  return { dataMaster, sedangMencari };
}
