/**
 * Dashboard.jsx
 * ----------------------------------------------------------------------------
 * Halaman Dashboard — menggabungkan beberapa fitur analitik dalam satu
 * halaman dengan sub-tab internal:
 *   - Fitur #1 Dashboard Rekap (tab "Rekap") — V2, dipertahankan
 *   - Fitur #2 Statistik Petugas (tab "Petugas") — V2, dipertahankan.
 *     [V3] Karena dropdown daftar petugas V2 sudah tidak ada (diganti
 *     login), petugas biasa otomatis melihat statistik MILIKNYA SENDIRI;
 *     hanya Admin yang dapat memilih & melihat statistik petugas lain
 *     (memakai daftar dari sheet USERS).
 *   - Fitur #11 Dashboard Lokasi (tab "Lokasi") — V2, dipertahankan
 *   - [V3] Fitur #12 Dashboard Stok Meter (tab "Stok") — baru
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ambilDataDashboard,
  ambilStatistikPetugas,
  ambilDaftarLokasi,
  ambilStokMeter,
  ambilDaftarUsers
} from '../services/appsScriptService';
import StatCard from '../components/StatCard';
import LoadingState, { ErrorState } from '../components/LoadingState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { WARNA_CHART, ROLE_ADMIN } from '../utils/constants';

const SUB_TAB = [
  { id: 'rekap', label: 'Rekap' },
  { id: 'petugas', label: 'Petugas' },
  { id: 'stok', label: 'Stok Meter' },
  { id: 'lokasi', label: 'Lokasi' }
];

export default function Dashboard({ user, token }) {
  const [subTabAktif, setSubTabAktif] = useState('rekap');

  return (
    <main className="dashboard-page">
      <div className="sub-tab-bar">
        {SUB_TAB.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`sub-tab-bar__item ${subTabAktif === tab.id ? 'sub-tab-bar__item--aktif' : ''}`}
            onClick={() => setSubTabAktif(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTabAktif === 'rekap' && <DashboardRekap />}
      {subTabAktif === 'petugas' && <StatistikPetugas user={user} token={token} />}
      {subTabAktif === 'stok' && <DashboardStokMeter />}
      {subTabAktif === 'lokasi' && <DashboardLokasi />}
    </main>
  );
}

// ============================================================================
// SUB-HALAMAN: DASHBOARD REKAP (Fitur #1, V2 dipertahankan)
// ============================================================================

function DashboardRekap() {
  const [data, setData] = useState(null);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [error, setError] = useState('');

  const muat = useCallback(() => {
    setSedangMemuat(true);
    setError('');
    ambilDataDashboard().then(setData).catch((err) => setError(err.message)).finally(() => setSedangMemuat(false));
  }, []);

  useEffect(() => { muat(); }, [muat]);

  if (sedangMemuat) return <LoadingState pesan="Memuat data dashboard..." />;
  if (error) return <ErrorState pesan={error} onCobaLagi={muat} />;
  if (!data) return null;

  const dataAlasanChart = [
    { nama: 'KWH TUA', jumlah: data.breakdownAlasan.kwhTua, warna: WARNA_CHART.kwhTua },
    { nama: 'Rusak', jumlah: data.breakdownAlasan.rusak, warna: WARNA_CHART.rusak },
    { nama: 'Buram', jumlah: data.breakdownAlasan.buram, warna: WARNA_CHART.buram },
    { nama: 'Terbakar', jumlah: data.breakdownAlasan.terbakar, warna: WARNA_CHART.terbakar }
  ];

  const dataJenisMeterChart = [
    { nama: 'Prabayar', jumlah: data.breakdownJenisMeter.prabayar },
    { nama: 'Pascabayar', jumlah: data.breakdownJenisMeter.pascabayar }
  ];

  return (
    <div className="dashboard-section">
      <h2 className="form-section__title" style={{ marginTop: 0 }}>Total Laporan</h2>
      <div className="stat-grid">
        <StatCard label="Hari Ini" value={data.totalHariIni} warna="biru" ukuranBesar />
        <StatCard label="Minggu Ini" value={data.totalMingguIni} warna="hijau" ukuranBesar />
        <StatCard label="Bulan Ini" value={data.totalBulanIni} warna="biru" ukuranBesar />
      </div>

      <h2 className="form-section__title">Jenis Meter</h2>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={dataJenisMeterChart} dataKey="jumlah" nameKey="nama" cx="50%" cy="50%" outerRadius={65} label={({ nama, jumlah }) => `${nama}: ${jumlah}`}>
              <Cell fill={WARNA_CHART.prabayar} />
              <Cell fill={WARNA_CHART.pascabayar} />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h2 className="form-section__title">Alasan Penggantian</h2>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dataAlasanChart}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
              {dataAlasanChart.map((entry, idx) => <Cell key={idx} fill={entry.warna} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="form-section__title">Laporan 7 Hari Terakhir</h2>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.grafikHarian}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="jumlah" fill={WARNA_CHART.prabayar} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="form-section__title">Laporan Per Bulan</h2>
      <div className="chart-card">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.grafikBulanan}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="jumlah" fill={WARNA_CHART.pascabayar} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="form-section__title">Ranking Petugas</h2>
      <div className="ranking-list">
        {data.rankingPetugas.map((item, idx) => (
          <div key={item.nama} className="ranking-list__item">
            <span className="ranking-list__posisi">{idx + 1}</span>
            <span className="ranking-list__nama">{item.nama}</span>
            <span className="ranking-list__jumlah">{item.jumlah} laporan</span>
          </div>
        ))}
        {data.rankingPetugas.length === 0 && <p className="dashboard-empty">Belum ada data laporan.</p>}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-HALAMAN: STATISTIK PETUGAS (Fitur #2, V2 dipertahankan + role gating V3)
// ============================================================================

function StatistikPetugas({ user, token }) {
  const isAdmin = user.role === ROLE_ADMIN;

  const [daftarPetugas, setDaftarPetugas] = useState([]);
  const [petugasMemuat, setPetugasMemuat] = useState(isAdmin);
  const [namaTerpilih, setNamaTerpilih] = useState(isAdmin ? '' : user.namaLengkap);
  const [data, setData] = useState(null);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    ambilDaftarUsers(token)
      .then((users) => setDaftarPetugas(users.map((u) => u.namaLengkap)))
      .catch(() => setDaftarPetugas([]))
      .finally(() => setPetugasMemuat(false));
  }, [isAdmin, token]);

  const handlePilihPetugas = useCallback((nama) => {
    setNamaTerpilih(nama);
    if (!nama) { setData(null); return; }
    setSedangMemuat(true);
    setError('');
    ambilStatistikPetugas(nama).then(setData).catch((err) => setError(err.message)).finally(() => setSedangMemuat(false));
  }, []);

  // Petugas biasa: langsung muat statistik miliknya sendiri, tanpa dropdown.
  useEffect(() => {
    if (!isAdmin) handlePilihPetugas(user.namaLengkap);
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dashboard-section">
      {isAdmin && (
        <>
          <h2 className="form-section__title" style={{ marginTop: 0 }}>Pilih Petugas</h2>
          <div className="field-select-wrap" style={{ marginBottom: 16 }}>
            <select
              className="field-select"
              value={namaTerpilih}
              onChange={(e) => handlePilihPetugas(e.target.value)}
              disabled={petugasMemuat}
            >
              <option value="">{petugasMemuat ? 'Memuat data...' : 'Pilih nama petugas'}</option>
              {daftarPetugas.map((nama) => <option key={nama} value={nama}>{nama}</option>)}
            </select>
            <svg className="field-select-arrow" width="14" height="9" viewBox="0 0 14 9" fill="none">
              <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </>
      )}

      {!isAdmin && <h2 className="form-section__title" style={{ marginTop: 0 }}>Statistik Saya</h2>}

      {sedangMemuat && <LoadingState pesan="Memuat statistik..." />}
      {error && <ErrorState pesan={error} onCobaLagi={() => handlePilihPetugas(namaTerpilih)} />}

      {data && !sedangMemuat && (
        <>
          <div className="stat-grid">
            <StatCard label="Hari Ini" value={data.hariIni} warna="biru" />
            <StatCard label="Minggu Ini" value={data.mingguIni} warna="hijau" />
            <StatCard label="Bulan Ini" value={data.bulanIni} warna="biru" />
          </div>

          <h2 className="form-section__title">Breakdown Jenis Meter</h2>
          <div className="stat-grid">
            <StatCard label="Prabayar" value={data.jumlahPrabayar} warna="biru" />
            <StatCard label="Pascabayar" value={data.jumlahPascabayar} warna="hijau" />
          </div>

          <h2 className="form-section__title">Breakdown Alasan</h2>
          <div className="stat-grid stat-grid--4">
            <StatCard label="KWH Tua" value={data.jumlahKwhTua} warna="biru" />
            <StatCard label="Rusak" value={data.jumlahRusak} warna="merah" />
            <StatCard label="Buram" value={data.jumlahBuram} warna="kuning" />
            <StatCard label="Terbakar" value={data.jumlahTerbakar} warna="ungu" />
          </div>
        </>
      )}

      {isAdmin && !namaTerpilih && !sedangMemuat && (
        <p className="dashboard-empty">Pilih nama petugas untuk melihat statistiknya.</p>
      )}
    </div>
  );
}

// ============================================================================
// [V3] SUB-HALAMAN: DASHBOARD STOK METER (Fitur #12)
// ============================================================================

function DashboardStokMeter() {
  const [data, setData] = useState(null);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [error, setError] = useState('');

  const muat = useCallback(() => {
    setSedangMemuat(true);
    setError('');
    ambilStokMeter().then(setData).catch((err) => setError(err.message)).finally(() => setSedangMemuat(false));
  }, []);

  useEffect(() => { muat(); }, [muat]);

  if (sedangMemuat) return <LoadingState pesan="Memuat data stok meter..." />;
  if (error) return <ErrorState pesan={error} onCobaLagi={muat} />;
  if (!data) return null;

  const totalKeseluruhan = data.totalReady + data.totalUsed + data.totalCancelled;

  return (
    <div className="dashboard-section">
      <h2 className="form-section__title" style={{ marginTop: 0 }}>Ringkasan Stok Meter Baru</h2>
      <div className="stat-grid">
        <StatCard label="READY" value={data.totalReady} warna="hijau" ukuranBesar />
        <StatCard label="USED" value={data.totalUsed} warna="biru" ukuranBesar />
        <StatCard label="CANCELLED" value={data.totalCancelled} warna="merah" ukuranBesar />
      </div>

      {totalKeseluruhan === 0 && (
        <p className="dashboard-empty">
          Belum ada data meter di database MASTER_METER_BARU. Tambahkan nomor meter lewat Panel Admin &rarr; Master Meter.
        </p>
      )}

      {totalKeseluruhan > 0 && (
        <>
          <h2 className="form-section__title">Pemakaian Meter — 7 Hari Terakhir</h2>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.grafikPenggunaan}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="jumlah" fill={WARNA_CHART.used} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// SUB-HALAMAN: DASHBOARD LOKASI (Fitur #11, V2 dipertahankan)
// ============================================================================

function DashboardLokasi() {
  const [daftarLokasi, setDaftarLokasi] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [error, setError] = useState('');

  const muat = useCallback(() => {
    setSedangMemuat(true);
    setError('');
    ambilDaftarLokasi().then(setDaftarLokasi).catch((err) => setError(err.message)).finally(() => setSedangMemuat(false));
  }, []);

  useEffect(() => { muat(); }, [muat]);

  if (sedangMemuat) return <LoadingState pesan="Memuat daftar lokasi..." />;
  if (error) return <ErrorState pesan={error} onCobaLagi={muat} />;

  return (
    <div className="dashboard-section">
      <h2 className="form-section__title" style={{ marginTop: 0 }}>Lokasi Laporan ({daftarLokasi.length})</h2>

      {daftarLokasi.length === 0 && (
        <p className="dashboard-empty">
          Belum ada laporan dengan data GPS. Data lokasi akan muncul di sini setelah petugas mengizinkan akses lokasi saat mengirim laporan.
        </p>
      )}

      <div className="lokasi-list">
        {daftarLokasi.map((item, idx) => (
          <a key={idx} href={item.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="lokasi-list__item">
            <div className="lokasi-list__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 22S4 14.5 4 9.5C4 5.4 7.6 2 12 2C16.4 2 20 5.4 20 9.5C20 14.5 12 22 12 22Z" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div className="lokasi-list__info">
              <span className="lokasi-list__nama">{item.namaPelanggan}</span>
              <span className="lokasi-list__detail">{item.petugasLapangan} &middot; {item.timestamp}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
