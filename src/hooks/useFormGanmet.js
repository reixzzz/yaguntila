/**
 * useFormGanmet.js
 * ----------------------------------------------------------------------------
 * Custom hook yang menyimpan dan mengatur seluruh state form input
 * penggantian meter.
 *
 * [V3] Field `petugasLapangan` DIHAPUS dari state form ini — nama petugas
 * kini diambil otomatis dari sesi login (lihat useAuth), bukan dipilih
 * manual lewat dropdown (Upgrade Specification §1). Fitur Draft Otomatis
 * (V2) tetap dipertahankan untuk seluruh field yang tersisa.
 * ----------------------------------------------------------------------------
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { validasiSeluruhForm } from '../utils/validators';
import { simpanDraft, ambilDraft, hapusDraft } from '../utils/localStorage';

const FORM_KOSONG = {
  namaPelanggan: '',
  idPelanggan: '',
  jenisMeter: '',
  alasanPenggantian: '',
  nomorMeterLama: '',
  nomorMeterBaru: '',
  standCabut: '',
  fotoMeterLama: null, // { base64, previewUrl, sizeKB }
  fotoMeterBaru: null
};

export function useFormGanmet() {
  const [formData, setFormData] = useState(() => {
    const draft = ambilDraft();
    if (draft) {
      return { ...FORM_KOSONG, ...draft, fotoMeterLama: null, fotoMeterBaru: null };
    }
    return FORM_KOSONG;
  });
  const [errors, setErrors] = useState({});

  const sudahMountRef = useRef(false);

  useEffect(() => {
    if (!sudahMountRef.current) {
      sudahMountRef.current = true;
      return;
    }
    simpanDraft(formData);
  }, [formData]);

  const setField = useCallback((nama, nilai) => {
    setFormData((prev) => {
      const next = { ...prev, [nama]: nilai };
      if (nama === 'jenisMeter' && nilai === 'Prabayar') {
        next.standCabut = '';
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [nama]: '' }));
  }, []);

  const setFoto = useCallback((nama, dataFoto) => {
    setFormData((prev) => ({ ...prev, [nama]: dataFoto }));
    setErrors((prev) => ({ ...prev, [nama]: '' }));
  }, []);

  /**
   * [V3] Parameter kedua `dataMeter` (hasil useMeterBaruCheck) ditambahkan
   * di samping `dataMaster` (V2) untuk menegakkan aturan stok meter.
   */
  const validasi = useCallback((dataMaster = null, dataMeter = null) => {
    const hasil = validasiSeluruhForm(formData, dataMaster, dataMeter);
    setErrors(hasil.errors);
    return hasil.isValid;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(FORM_KOSONG);
    setErrors({});
    hapusDraft();
  }, []);

  return {
    formData,
    errors,
    setField,
    setFoto,
    validasi,
    resetForm
  };
}
