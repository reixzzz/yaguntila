/**
 * App.jsx
 * ----------------------------------------------------------------------------
 * Komponen root. Menyusun Header, banner instalasi PWA, dan halaman aktif.
 *
 * [V3] Fitur #1 — Ditambahkan GATE LOGIN: selama `useAuth` belum
 * menemukan sesi valid, aplikasi HANYA menampilkan halaman Login (tanpa
 * Header/BottomNav aplikasi utama). Setelah login berhasil, seluruh
 * halaman menerima `user` (nama, role) dan `token` (untuk request yang
 * butuh otentikasi) sebagai props — menggantikan dropdown Petugas
 * Lapangan manual dan PIN Admin tunggal di V2.
 * ----------------------------------------------------------------------------
 */

import { useState } from 'react';
import Header from './components/Header';
import InstallPrompt from './components/InstallPrompt';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import FormGanmet from './pages/FormGanmet';
import Riwayat from './pages/Riwayat';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import { useAuth } from './hooks/useAuth';
import { useOfflineQueue } from './hooks/useOfflineQueue';

export default function App() {
  const [halamanAktif, setHalamanAktif] = useState('form');
  const { sudahLogin, user, token, isAdmin, sedangLogin, login, logout } = useAuth();

  // Fitur #9 — auto-sync antrian offline didaftarkan di level tertinggi
  // aplikasi supaya tetap berjalan di halaman manapun. Hook ini aman
  // dipanggil bahkan sebelum login (tidak bergantung pada sesi).
  const { jumlahAntrian } = useOfflineQueue();

  if (!sudahLogin) {
    return <Login onLogin={login} sedangLogin={sedangLogin} />;
  }

  // Jika petugas biasa sedang berada di tab 'admin' lalu logout & login
  // ulang sebagai petugas biasa (atau sebaliknya diturunkan rolenya oleh
  // admin lain), kembalikan ke tab Laporan supaya tidak nyasar ke
  // halaman yang bukan haknya.
  const halamanValid = isAdmin ? halamanAktif : (halamanAktif === 'admin' ? 'form' : halamanAktif);

  return (
    <div className="app-shell">
      <Header onLogout={logout} namaUser={user.namaLengkap} />
      <InstallPrompt />

      <div className="app-content">
        {halamanValid === 'form' && <FormGanmet user={user} token={token} />}
        {halamanValid === 'riwayat' && <Riwayat token={token} />}
        {halamanValid === 'dashboard' && <Dashboard user={user} token={token} />}
        {halamanValid === 'admin' && isAdmin && <Admin user={user} token={token} />}
      </div>

      <BottomNav
        halamanAktif={halamanValid}
        onPindahHalaman={setHalamanAktif}
        badgeAntrian={jumlahAntrian}
        tampilkanAdmin={isAdmin}
      />
    </div>
  );
}
