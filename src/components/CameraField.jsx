/**
 * CameraField.jsx
 * ----------------------------------------------------------------------------
 * Komponen untuk mengambil foto langsung dari kamera HP.
 *
 * Atribut `capture="environment"` pada <input type="file"> memerintahkan
 * browser Android Chrome untuk LANGSUNG membuka kamera belakang, bukan
 * galeri foto — supaya petugas selalu mengambil foto baru di lokasi.
 *
 * [V3] OCR (Tesseract.js) DIHAPUS TOTAL dari komponen ini sesuai Upgrade
 * Specification §4 — dahulu dipakai untuk membaca angka meter dari foto,
 * kini digantikan sepenuhnya oleh QR/Barcode Scanner (lihat
 * BarcodeScannerModal.jsx, dipakai khusus untuk Nomor Meter Baru).
 * Komponen ini sekarang HANYA mengurus pengambilan + kompresi foto untuk
 * dokumentasi (dipakai baik untuk foto meter lama maupun meter baru).
 * ----------------------------------------------------------------------------
 */

import { useRef, useState } from 'react';
import { prosesFotoUntukUpload } from '../services/imageService';
import { PESAN } from '../utils/constants';

export default function CameraField({
  label,
  fotoData,           // { base64, previewUrl, sizeKB } | null
  onFotoSiap,          // (fotoData) => void
  error,
  wajib = true
}) {
  const inputRef = useRef(null);
  const [sedangProses, setSedangProses] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setSedangProses(true);

    try {
      const hasilKompresi = await prosesFotoUntukUpload(file);
      onFotoSiap({
        base64: hasilKompresi.base64,
        previewUrl: hasilKompresi.previewUrl,
        sizeKB: hasilKompresi.sizeKB
      });
    } catch (err) {
      console.error('Gagal memproses foto:', err);
    } finally {
      setSedangProses(false);
    }

    // Reset value input agar bisa memilih/memotret ulang file dengan nama sama
    e.target.value = '';
  }

  function bukaKamera() {
    inputRef.current?.click();
  }

  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {wajib && <span className="field-wajib"> *</span>}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {fotoData ? (
        <div className="camera-preview">
          <img src={fotoData.previewUrl} alt={label} className="camera-preview__img" />
          <div className="camera-preview__info">
            <span className="camera-preview__size">{fotoData.sizeKB} KB</span>
            <button type="button" className="camera-preview__retake" onClick={bukaKamera}>
              Ambil Ulang
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`camera-button ${error ? 'camera-button--error' : ''}`}
          onClick={bukaKamera}
          disabled={sedangProses}
        >
          {sedangProses ? (
            <span className="camera-button__loading">{PESAN.LOADING_KOMPRES}</span>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 8C3 6.89543 3.89543 6 5 6H7.5L8.5 4H15.5L16.5 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span>Ambil Foto</span>
            </>
          )}
        </button>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
