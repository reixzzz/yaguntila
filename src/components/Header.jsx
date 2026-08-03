/**
 * Header.jsx
 * ----------------------------------------------------------------------------
 * Header aplikasi menampilkan logo, nama, dan tagline.
 *
 * [V3] Ditambahkan tombol Keluar (logout) opsional — hanya dirender jika
 * `onLogout` diberikan (dipanggil dari App.jsx setelah pengguna login).
 * Halaman Login memakai Header ini juga TANPA prop `onLogout`, sehingga
 * tombol keluar otomatis tidak tampil di layar login.
 * ----------------------------------------------------------------------------
 */

import { useState } from 'react';

export default function Header({ onLogout, namaUser }) {
  const [konfirmasiTampil, setKonfirmasiTampil] = useState(false);

  function handleKlikLogout() {
    setKonfirmasiTampil(true);
  }

  function batalkanLogout() {
    setKonfirmasiTampil(false);
  }

  function konfirmasiLogout() {
    setKonfirmasiTampil(false);
    onLogout();
  }

  return (
    <header className="app-header">
      <div className="app-header__logo">
        <svg width="30" height="30" viewBox="0 0 512 512" fill="none">
          <rect width="512" height="512" rx="96" fill="#0F4C81" />
          <circle cx="256" cy="256" r="170" fill="none" stroke="#FFFFFF" strokeWidth="14" opacity="0.9" />
          <circle cx="256" cy="256" r="170" fill="none" stroke="#2ECC71" strokeWidth="14" strokeDasharray="40 18" opacity="0.95" />
          <path d="M 286 130 L 196 280 L 248 280 L 226 382 L 326 220 L 270 220 Z" fill="#FFFFFF" />
        </svg>
      </div>
      <div className="app-header__text">
        <h1 className="app-header__title">YAGUNTILA</h1>
        <p className="app-header__tagline">Ganmet Afif Man</p>
      </div>

      {onLogout && (
        <div className="app-header__akun">
          {namaUser && <span className="app-header__nama-user">{namaUser}</span>}
          <button type="button" className="app-header__logout" onClick={handleKlikLogout} aria-label="Keluar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {konfirmasiTampil && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <p className="confirm-dialog__pesan">Keluar dari aplikasi?</p>
            <div className="confirm-dialog__aksi">
              <button type="button" className="btn-admin-aksi btn-admin-aksi--batal" onClick={batalkanLogout}>Batal</button>
              <button type="button" className="btn-admin-aksi btn-admin-aksi--hapus" onClick={konfirmasiLogout}>Keluar</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
