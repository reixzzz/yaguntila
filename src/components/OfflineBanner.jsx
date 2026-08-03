/**
 * OfflineBanner.jsx
 * ----------------------------------------------------------------------------
 * [V2] Fitur #9 — Banner kecil yang muncul di bawah header saat aplikasi
 * mendeteksi tidak ada koneksi internet, supaya petugas tahu bahwa
 * laporan yang dikirim akan masuk ke antrian offline dahulu, bukan
 * langsung tersimpan ke Spreadsheet.
 * ----------------------------------------------------------------------------
 */

export default function OfflineBanner({ online, jumlahAntrian }) {
  if (online && jumlahAntrian === 0) return null;

  return (
    <div className={`offline-banner ${online ? 'offline-banner--sinkron' : 'offline-banner--offline'}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        {online ? (
          <path d="M12 2L13.5 8.5L20 7L15.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L8.5 12L4 7L10.5 8.5L12 2Z" fill="currentColor" />
        ) : (
          <>
            <path d="M2 8.5C7.5 3.5 16.5 3.5 22 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
            <path d="M5.5 12C9 9 15 9 18.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
            <path d="M9 15.5C10.5 14.3 13.5 14.3 15 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="19" r="1.2" fill="currentColor" />
            <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span className="offline-banner__text">
        {!online && 'Mode offline — laporan akan disimpan ke antrian.'}
        {online && jumlahAntrian > 0 && `Menyinkronkan ${jumlahAntrian} laporan dari antrian offline...`}
      </span>
    </div>
  );
}
