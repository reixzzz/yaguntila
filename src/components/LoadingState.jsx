/**
 * LoadingState.jsx
 * ----------------------------------------------------------------------------
 * [V2] Indikator loading generik (spinner + teks) dipakai di halaman
 * Dashboard, Riwayat, dan Statistik Petugas saat menunggu data dari
 * server (Apps Script).
 * ----------------------------------------------------------------------------
 */

export default function LoadingState({ pesan = 'Memuat data...' }) {
  return (
    <div className="loading-state">
      <span className="loading-state__spinner" />
      <p className="loading-state__pesan">{pesan}</p>
    </div>
  );
}

export function ErrorState({ pesan, onCobaLagi }) {
  return (
    <div className="loading-state loading-state--error">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
      <p className="loading-state__pesan">{pesan}</p>
      {onCobaLagi && (
        <button type="button" className="loading-state__retry" onClick={onCobaLagi}>
          Coba Lagi
        </button>
      )}
    </div>
  );
}
