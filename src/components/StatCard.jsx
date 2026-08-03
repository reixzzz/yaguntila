/**
 * StatCard.jsx
 * ----------------------------------------------------------------------------
 * [V2] Kartu kecil untuk menampilkan satu angka statistik (total laporan
 * hari ini, jumlah Prabayar, dsb) — dipakai berulang di halaman Dashboard
 * Rekap (#1) dan Statistik Petugas (#2).
 * ----------------------------------------------------------------------------
 */

export default function StatCard({ label, value, warna = 'biru', ukuranBesar = false }) {
  return (
    <div className={`stat-card stat-card--${warna}`}>
      <span className={`stat-card__value ${ukuranBesar ? 'stat-card__value--besar' : ''}`}>{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}
