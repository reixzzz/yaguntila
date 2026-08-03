/**
 * useMeterBaruCheck.js
 * ----------------------------------------------------------------------------
 * [V3] Fitur #3/#5 — memantau perubahan Nomor Meter Baru (hasil scan QR/
 * Barcode atau input manual cadangan), lalu setelah format dasarnya valid
 * DAN petugas berhenti mengetik/scan selama DEBOUNCE_LOOKUP_MS, memeriksa
 * status nomor tersebut ke MASTER_METER_BARU: READY / USED / CANCELLED /
 * tidak ditemukan.
 *
 * Pola hook ini SENGAJA disamakan dengan `useMasterPelanggan` (V2) supaya
 * konsisten dan mudah dipelihara oleh siapa pun yang sudah familiar dengan
 * kode V2.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useRef } from 'react';
import { cariMeterBaru } from '../services/appsScriptService';
import { DEBOUNCE_LOOKUP_MS } from '../utils/constants';

export function useMeterBaruCheck(nomorMeter) {
  const [dataMeter, setDataMeter] = useState(null);
  const [sedangMemeriksa, setSedangMemeriksa] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const nomorBersih = String(nomorMeter || '').trim();

    // Hanya mulai memeriksa jika sudah minimal 6 digit angka (format
    // paling pendek yang mungkin valid), supaya tidak spam request saat
    // scanner baru mengembalikan sebagian data atau petugas baru mengetik.
    if (!/^\d{6,12}$/.test(nomorBersih)) {
      setDataMeter(null);
      setSedangMemeriksa(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setSedangMemeriksa(true);
      const hasil = await cariMeterBaru(nomorBersih);
      setDataMeter(hasil);
      setSedangMemeriksa(false);
    }, DEBOUNCE_LOOKUP_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nomorMeter]);

  return { dataMeter, sedangMemeriksa };
}
