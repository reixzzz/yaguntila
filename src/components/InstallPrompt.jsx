/**
 * InstallPrompt.jsx
 * ----------------------------------------------------------------------------
 * Menampilkan banner kecil yang mengundang petugas memasang YAGUNTILA ke
 * Home Screen Android (PRD §26). Memakai event "beforeinstallprompt" yang
 * disediakan Android Chrome untuk PWA yang sudah memenuhi syarat instalasi.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState(null);
  const [tampil, setTampil] = useState(false);
  const [sudahDitutup, setSudahDitutup] = useState(false);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setDeferredEvent(e);
      setTampil(true);
    }

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredEvent) return;
    deferredEvent.prompt();
    await deferredEvent.userChoice;
    setTampil(false);
  }

  if (!tampil || sudahDitutup) return null;

  return (
    <div className="install-banner">
      <div className="install-banner__icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 3V15M12 15L7 10M12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 19H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="install-banner__text">Pasang YAGUNTILA ke Home Screen untuk akses lebih cepat di lapangan.</p>
      <button className="install-banner__btn" onClick={handleInstall}>Pasang</button>
      <button className="install-banner__close" onClick={() => setSudahDitutup(true)} aria-label="Tutup">×</button>
    </div>
  );
}
