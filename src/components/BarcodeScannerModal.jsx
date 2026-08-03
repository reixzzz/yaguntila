/**
 * BarcodeScannerModal.jsx
 * ----------------------------------------------------------------------------
 * [V3] Fitur #5 — Scan QR/Barcode menggantikan OCR (Upgrade Specification
 * §4-5). Dipakai untuk membaca Nomor Meter Baru dari label QR/Barcode yang
 * tertempel di meter baru.
 *
 * Memakai `html5-qrcode` — library open-source (MIT License), gratis,
 * tanpa API key, berjalan sepenuhnya di browser (tidak mengirim gambar
 * kamera ke server manapun). Mendukung QR Code maupun berbagai format
 * barcode 1D umum (CODE_128, EAN_13, CODE_39, dst) sekaligus, karena
 * label meter berbeda pabrikan bisa memakai format berbeda.
 *
 * Sesuai Upgrade Specification: input manual TETAP disediakan sebagai
 * cadangan di TextField Nomor Meter Baru (lihat FormGanmet.jsx) — modal
 * ini hanya salah satu cara mengisi field tersebut, bukan satu-satunya.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const READER_ELEMENT_ID = 'yaguntila-qr-reader';

const FORMAT_DIDUKUNG = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.ITF
];

export default function BarcodeScannerModal({ onHasil, onTutup }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [kameraSiap, setKameraSiap] = useState(false);
  const sudahDapatHasilRef = useRef(false);

  useEffect(() => {
    let dibatalkan = false;
    const instance = new Html5Qrcode(READER_ELEMENT_ID, {
      formatsToSupport: FORMAT_DIDUKUNG,
      verbose: false
    });
    scannerRef.current = instance;

    instance
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 180 } },
        (decodedText) => {
          if (sudahDapatHasilRef.current || dibatalkan) return;
          sudahDapatHasilRef.current = true;
          // Ambil hanya digit — label meter selalu berupa angka murni.
          const hanyaDigit = String(decodedText).replace(/[^0-9]/g, '');
          hentikanKamera().finally(() => {
            if (!dibatalkan) onHasil(hanyaDigit || decodedText);
          });
        },
        () => {
          // Callback ini dipanggil TERUS-MENERUS setiap frame yang gagal
          // dibaca (bukan error fatal) — sengaja diabaikan supaya tidak
          // membanjiri UI dengan pesan "tidak terbaca" saat kamera masih
          // mengarah ke objek yang bukan kode QR/Barcode.
        }
      )
      .then(() => {
        if (!dibatalkan) setKameraSiap(true);
      })
      .catch((err) => {
        if (!dibatalkan) {
          setError(
            'Tidak dapat mengakses kamera. Pastikan Anda mengizinkan akses kamera di browser, lalu coba lagi. Anda tetap bisa mengisi nomor meter secara manual.'
          );
          console.warn('Gagal memulai kamera scanner:', err);
        }
      });

    function hentikanKamera() {
      if (scannerRef.current && scannerRef.current.isScanning) {
        return scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
      return Promise.resolve();
    }

    return () => {
      dibatalkan = true;
      hentikanKamera();
    };
  }, [onHasil]);

  function handleTutup() {
    onTutup();
  }

  return (
    <div className="scanner-modal-overlay" role="dialog" aria-modal="true">
      <div className="scanner-modal">
        <div className="scanner-modal__header">
          <h2 className="scanner-modal__title">Scan QR / Barcode Meter</h2>
          <button type="button" className="scanner-modal__close" onClick={handleTutup} aria-label="Tutup">×</button>
        </div>

        <div className="scanner-modal__body">
          {error ? (
            <div className="scanner-modal__error">
              <p>{error}</p>
              <button type="button" className="btn-admin-aksi btn-admin-aksi--tambah" onClick={handleTutup}>
                Tutup &amp; Isi Manual
              </button>
            </div>
          ) : (
            <>
              {!kameraSiap && <p className="scanner-modal__hint">Membuka kamera...</p>}
              <div id={READER_ELEMENT_ID} className="scanner-modal__viewport" />
              {kameraSiap && (
                <p className="scanner-modal__hint">Arahkan kamera ke label QR/Barcode pada meter baru.</p>
              )}
            </>
          )}
        </div>

        <button type="button" className="scanner-modal__manual" onClick={handleTutup}>
          Batalkan &amp; Isi Manual
        </button>
      </div>
    </div>
  );
}
