/**
 * Login.jsx
 * ----------------------------------------------------------------------------
 * [V3] Fitur #1 — Halaman Login. Menggantikan dropdown Petugas Lapangan
 * manual dan PIN Admin tunggal V2. Satu form login dipakai oleh PETUGAS
 * maupun ADMIN — role ditentukan oleh data di sheet USERS, bukan dipilih
 * sendiri oleh pengguna.
 *
 * Ditampilkan sebagai halaman penuh (tanpa BottomNav) selama pengguna
 * belum login — lihat App.jsx.
 * ----------------------------------------------------------------------------
 */

import { useState } from 'react';
import Header from '../components/Header';

export default function Login({ onLogin, sedangLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tampilkanPassword, setTampilkanPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError('');
    const hasil = await onLogin(username.trim(), password);

    if (!hasil.success) {
      setError(hasil.message || 'Login gagal. Periksa kembali username dan password Anda.');
    }
  }

  return (
    <div className="login-page">
      <Header />

      <main className="login-page__content">
        <div className="login-card">
          <div className="login-card__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20C4 16 7.5 13.5 12 13.5C16.5 13.5 20 16 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="login-card__title">Masuk ke YAGUNTILA</h1>
          <p className="login-card__subtitle">Gunakan akun yang diberikan admin untuk mengakses aplikasi.</p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="field-group">
              <label className="field-label">Username</label>
              <input
                type="text"
                className="field-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                autoComplete="username"
                disabled={sedangLogin}
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <div className="field-input-wrap">
                <input
                  type={tampilkanPassword ? 'text' : 'password'}
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  disabled={sedangLogin}
                />
                <button
                  type="button"
                  className="field-right-slot field-right-slot--button"
                  onClick={() => setTampilkanPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {tampilkanPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            {error && <p className="field-error login-form__error" role="alert">{error}</p>}

            <button
              type="submit"
              className="btn-submit"
              disabled={sedangLogin || !username.trim() || !password}
            >
              {sedangLogin ? (
                <>
                  <span className="btn-submit__spinner" />
                  Memeriksa...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>

        <p className="login-page__footnote">YAGUNTILA V3 &middot; Ganmet Afif Man</p>
      </main>
    </div>
  );
}
