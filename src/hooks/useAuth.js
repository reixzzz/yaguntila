/**
 * useAuth.js
 * ----------------------------------------------------------------------------
 * [V3] Fitur #1 — Sistem Login. Hook ini adalah satu-satunya sumber
 * kebenaran (single source of truth) untuk status login di seluruh
 * aplikasi: siapa yang login, apa role-nya, dan token sesi yang dipakai
 * untuk setiap request ke backend yang butuh otentikasi (submit laporan,
 * riwayat, aksi Panel Admin).
 *
 * Sesi dimuat dari localStorage saat aplikasi pertama dibuka (supaya
 * petugas tidak perlu login ulang tiap kali membuka PWA), dan otomatis
 * dianggap tidak valid lagi begitu token kedaluwarsa (dicek dari field
 * `exp` yang disematkan server di dalam token — lihat Code.gs `buatToken`).
 * ----------------------------------------------------------------------------
 */

import { useState, useCallback, useEffect } from 'react';
import { login as loginKeServer } from '../services/appsScriptService';
import { simpanSesi, ambilSesi, hapusSesi } from '../utils/localStorage';

function decodeExpDariToken(token) {
  try {
    const payloadBase64 = token.substring(0, token.lastIndexOf('.'));
    const payload = JSON.parse(atob(payloadBase64));
    return payload.exp || 0;
  } catch (error) {
    return 0;
  }
}

function sesiMasihValid(sesi) {
  if (!sesi || !sesi.token || !sesi.user) return false;
  const exp = decodeExpDariToken(sesi.token);
  return exp > Date.now();
}

export function useAuth() {
  const [sesi, setSesi] = useState(() => {
    const tersimpan = ambilSesi();
    return sesiMasihValid(tersimpan) ? tersimpan : null;
  });
  const [sedangLogin, setSedangLogin] = useState(false);

  // Bersihkan localStorage jika ternyata sesi tersimpan sudah kedaluwarsa
  // (misal petugas tidak membuka aplikasi selama beberapa hari).
  useEffect(() => {
    const tersimpan = ambilSesi();
    if (tersimpan && !sesiMasihValid(tersimpan)) {
      hapusSesi();
    }
  }, []);

  const handleLogin = useCallback(async (username, password) => {
    setSedangLogin(true);
    const hasil = await loginKeServer(username, password);
    setSedangLogin(false);

    if (hasil.success) {
      const sesiBaru = { token: hasil.token, user: hasil.user };
      simpanSesi(sesiBaru);
      setSesi(sesiBaru);
    }

    return hasil;
  }, []);

  const handleLogout = useCallback(() => {
    hapusSesi();
    setSesi(null);
  }, []);

  return {
    sudahLogin: !!sesi,
    user: sesi ? sesi.user : null,
    token: sesi ? sesi.token : null,
    isAdmin: !!sesi && sesi.user.role === 'ADMIN',
    sedangLogin,
    login: handleLogin,
    logout: handleLogout
  };
}
