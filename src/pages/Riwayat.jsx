/**
 * Riwayat.jsx
 * ----------------------------------------------------------------------------
 * [V3] Fitur #7 — Riwayat Laporan. Menampilkan 10 laporan TERAKHIR MILIK
 * PETUGAS YANG SEDANG LOGIN (Upgrade Specification §7 — berbeda dari V2
 * yang menampilkan 10 laporan terakhir seluruh tim tanpa filter).
 * Backend memfilter berdasarkan nama di dalam token sesi (lihat Code.gs
 * `ambilRiwayatLaporan`), sehingga petugas tidak bisa melihat riwayat
 * orang lain hanya dengan mengubah parameter di client.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useCallback } from 'react';
import { ambilRiwayatLaporan } from '../services/appsScriptService';
import { ambilAntrianOffline } from '../utils/localStorage';
import LoadingState, { ErrorState } from '../components/LoadingState';

export default function Riwayat({ token }) {
  const [riwayat, setRiwayat] = useState([]);
  const [antrianOffline, setAntrianOffline] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [error, setError] = useState('');

  const muat = useCallback(() => {
    setSedangMemuat(true);
    setError('');
    setAntrianOffline(ambilAntrianOffline());
    ambilRiwayatLaporan(token)
      .then(setRiwayat)
      .catch((err) => setError(err.message))
      .finally(() => setSedangMemuat(false));
  }, [token]);

  useEffect(() => { muat(); }, [muat]);

  return (
    <main className="riwayat-page">
      {antrianOffline.length > 0 && (
        <section className="form-section">
          <h2 className="form-section__title">Menunggu Dikirim (Offline)</h2>
          {antrianOffline.map((item) => (
            <div key={item.id} className="riwayat-card riwayat-card--pending">
              <div className="riwayat-card__baris">
                <span className="riwayat-card__label">Nama</span>
                <span className="riwayat-card__value">{item.payload.namaPelanggan}</span>
              </div>
              <div className="riwayat-card__baris">
                <span className="riwayat-card__label">ID Pelanggan</span>
                <span className="riwayat-card__value">{item.payload.idPelanggan}</span>
              </div>
              <span className="riwayat-card__status riwayat-card__status--pending">
                Menunggu internet
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="form-section">
        <h2 className="form-section__title" style={{ marginTop: 0 }}>10 Laporan Terakhir Anda</h2>

        {sedangMemuat && <LoadingState pesan="Memuat riwayat laporan..." />}
        {error && <ErrorState pesan={error} onCobaLagi={muat} />}

        {!sedangMemuat && !error && riwayat.length === 0 && (
          <p className="dashboard-empty">Anda belum memiliki laporan tersimpan.</p>
        )}

        {!sedangMemuat && !error && riwayat.map((item, idx) => (
          <div key={idx} className="riwayat-card">
            <div className="riwayat-card__baris">
              <span className="riwayat-card__label">Tanggal</span>
              <span className="riwayat-card__value">{item.timestamp}</span>
            </div>
            <div className="riwayat-card__baris">
              <span className="riwayat-card__label">Nama Pelanggan</span>
              <span className="riwayat-card__value">{item.namaPelanggan}</span>
            </div>
            <div className="riwayat-card__baris">
              <span className="riwayat-card__label">ID Pelanggan</span>
              <span className="riwayat-card__value">{item.idPelanggan}</span>
            </div>
            <div className="riwayat-card__baris">
              <span className="riwayat-card__label">Nomor Meter Baru</span>
              <span className="riwayat-card__value">{item.nomorMeterBaru}</span>
            </div>
            <span className="riwayat-card__status riwayat-card__status--sukses">
              Tersimpan
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
