/**
 * Toast.jsx
 * ----------------------------------------------------------------------------
 * Notifikasi popup yang muncul singkat di bagian bawah layar untuk
 * memberi tahu hasil pengiriman (sukses/gagal), sesuai PRD §31.
 * ----------------------------------------------------------------------------
 */

import { useEffect } from 'react';

export default function Toast({ tipe, pesan, onTutup }) {
  useEffect(() => {
    if (tipe === 'sukses') {
      const timer = setTimeout(onTutup, 3500);
      return () => clearTimeout(timer);
    }
  }, [tipe, onTutup]);

  if (!pesan) return null;

  return (
    <div className={`toast toast--${tipe}`} role="status">
      <div className="toast__icon">
        {tipe === 'sukses' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        )}
      </div>
      <p className="toast__pesan">{pesan}</p>
      <button className="toast__tutup" onClick={onTutup} aria-label="Tutup notifikasi">×</button>
    </div>
  );
}
