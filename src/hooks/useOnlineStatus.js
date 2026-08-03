/**
 * useOnlineStatus.js
 * ----------------------------------------------------------------------------
 * [V2] Fitur #9 — mendeteksi status koneksi internet browser saat ini,
 * dipakai untuk menampilkan indikator "Mode Offline" di UI dan untuk
 * memutuskan apakah laporan baru harus langsung dikirim atau dimasukkan
 * ke antrian offline dahulu.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() { setOnline(true); }
    function handleOffline() { setOnline(false); }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
