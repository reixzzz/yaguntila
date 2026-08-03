/**
 * validators.js
 * ----------------------------------------------------------------------------
 * Kumpulan fungsi untuk memeriksa apakah data yang diisi petugas sudah benar
 * SEBELUM dikirim ke server. Validasi yang SAMA juga dijalankan ulang di
 * Apps Script (server) sebagai lapis keamanan kedua.
 *
 * [V3] Nomor Meter Baru sekarang divalidasi FORMAT-nya secara longgar
 * (6-12 digit) di sini, karena validasi SEBENARNYA (apakah nomor tersebut
 * ada di database dan berstatus READY) dilakukan lewat
 * `useMeterBaruCheck` (lookup ke server) dan ditegakkan ulang di backend.
 * Nomor Meter Lama TIDAK berubah dari V2 (bug fix 6-12 digit dipertahankan).
 * ----------------------------------------------------------------------------
 */

import {
  PANJANG_ID_PELANGGAN,
  PANJANG_MIN_NOMOR_METER_LAMA,
  PANJANG_MAX_NOMOR_METER_LAMA,
  PANJANG_MIN_NOMOR_METER_BARU,
  PANJANG_MAX_NOMOR_METER_BARU
} from './constants';

function isDigitsWithLength(value, length) {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  return new RegExp('^\\d{' + length + '}$').test(str);
}

function isDigitsWithRange(value, min, max) {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) return false;
  return str.length >= min && str.length <= max;
}

export function validasiIdPelanggan(value) {
  if (!value || String(value).trim() === '') return 'ID Pelanggan wajib diisi.';
  if (!isDigitsWithLength(value, PANJANG_ID_PELANGGAN)) return 'ID Pelanggan harus terdiri dari 12 digit.';
  return '';
}

export function validasiNomorMeterLama(value) {
  if (!value || String(value).trim() === '') return 'Nomor Meter Lama wajib diisi.';
  if (!isDigitsWithRange(value, PANJANG_MIN_NOMOR_METER_LAMA, PANJANG_MAX_NOMOR_METER_LAMA)) {
    return `Nomor Meter Lama harus angka, ${PANJANG_MIN_NOMOR_METER_LAMA}-${PANJANG_MAX_NOMOR_METER_LAMA} digit.`;
  }
  return '';
}

/**
 * [V3] Validasi FORMAT Nomor Meter Baru saja (angka, 6-12 digit). Validasi
 * keberadaan & status READY di MASTER_METER_BARU ditangani terpisah oleh
 * `useMeterBaruCheck` supaya pesan error lebih spesifik ("sudah dipakai"
 * vs "tidak ditemukan" vs "format salah").
 */
export function validasiNomorMeterBaru(value) {
  if (!value || String(value).trim() === '') return 'Nomor Meter Baru wajib diisi.';
  if (!isDigitsWithRange(value, PANJANG_MIN_NOMOR_METER_BARU, PANJANG_MAX_NOMOR_METER_BARU)) {
    return `Nomor Meter Baru harus angka, ${PANJANG_MIN_NOMOR_METER_BARU}-${PANJANG_MAX_NOMOR_METER_BARU} digit.`;
  }
  return '';
}

export function validasiTeksWajib(value, namaField) {
  if (!value || String(value).trim() === '') return `${namaField} wajib diisi.`;
  return '';
}

export function validasiStandCabut(value, jenisMeter) {
  if (jenisMeter !== 'Pascabayar') return '';
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'Stand Cabut wajib diisi untuk meter Pascabayar.';
  }
  if (isNaN(Number(value)) || Number(value) < 0) return 'Stand Cabut harus berupa angka positif.';
  return '';
}

/**
 * [V2] Cross-check Nomor Meter Baru terhadap MASTER_PELANGGAN — dipertahankan
 * sebagai lapis validasi tambahan (independen dari status MASTER_METER_BARU).
 */
export function validasiNomorMeterBaruVsMaster(nomorMeterBaruInput, dataMaster) {
  if (!dataMaster || !dataMaster.ditemukan) return '';
  if (!dataMaster.nomorMeterBaru || String(dataMaster.nomorMeterBaru).trim() === '') return '';
  const inputBersih = String(nomorMeterBaruInput || '').trim();
  const masterBersih = String(dataMaster.nomorMeterBaru).trim();
  if (inputBersih !== masterBersih) return 'Nomor meter baru tidak sesuai database.';
  return '';
}

/**
 * [V3] Validasi status Nomor Meter Baru terhadap MASTER_METER_BARU (hasil
 * dari useMeterBaruCheck). Ditolak kecuali statusnya READY.
 */
export function validasiStatusMeterBaru(dataMeter) {
  if (!dataMeter) return ''; // belum selesai dicek / belum diketik lengkap
  if (dataMeter.gagalKoneksi) return '';
  if (!dataMeter.ditemukan) return 'Nomor meter tidak terdaftar di database stok meter.';
  if (dataMeter.status === 'USED') return 'Nomor meter ini sudah pernah digunakan.';
  if (dataMeter.status === 'CANCELLED') return 'Nomor meter ini berstatus dibatalkan (CANCELLED).';
  if (dataMeter.status !== 'READY') return 'Status nomor meter tidak valid.';
  return '';
}

/**
 * [PATCH BUGFIX] ID Pelanggan WAJIB terdaftar di MASTER_PELANGGAN sebelum
 * bisa dikirim — ini sesuai spesifikasi awal V3 ("Jika tidak ditemukan:
 * Submit dibatalkan"), yang sebelumnya HANYA ditampilkan sebagai pesan
 * tanpa benar-benar memblokir submit (celah: Nama Pelanggan bisa diisi
 * manual sebagai workaround, dan form tetap bisa dikirim).
 *
 * Perkecualian: saat gagal terhubung ke server (`gagalKoneksi`, misal
 * petugas sedang offline di lapangan), TIDAK diblokir di sisi client —
 * supaya fitur Antrian Offline (yang memang dirancang untuk kondisi sinyal
 * lemah) tetap bisa dipakai. ID Pelanggan tetap diverifikasi ulang oleh
 * SERVER saat laporan akhirnya disinkronkan (lihat Code.gs), jadi laporan
 * dengan ID palsu/salah tetap akan ditolak saat itu, bukan lolos begitu
 * saja hanya karena sempat offline.
 */
export function validasiIdPelangganTerdaftar(dataMaster) {
  if (!dataMaster) return ''; // belum selesai dicek (masih mengetik / debounce)
  if (dataMaster.gagalKoneksi) return '';
  if (!dataMaster.ditemukan) return 'ID Pelanggan tidak ditemukan pada database MASTER_PELANGGAN.';
  return '';
}

/**
 * Memvalidasi seluruh form sekaligus.
 *
 * [V3] Parameter ketiga `dataMeter` (hasil useMeterBaruCheck) ditambahkan
 * untuk menegakkan aturan stok meter di sisi client sebelum submit.
 *
 * [PATCH BUGFIX] Cross-check ke MASTER_PELANGGAN (`validasiNomorMeterBaruVsMaster`)
 * SENGAJA TIDAK LAGI dimasukkan ke sini sebagai blocking error. Dulu, kalau
 * kolom "Nomor Meter Baru" di sheet MASTER_PELANGGAN untuk suatu ID
 * Pelanggan sudah terisi (misal dari rencana SPK awal / data lama) dan
 * BERBEDA dengan nomor meter yang sebenarnya dipakai petugas di lapangan
 * (walau nomor itu valid & berstatus READY di MASTER_METER_BARU), submit
 * akan DITOLAK dengan pesan "Nomor meter baru tidak sesuai database." —
 * padahal MASTER_METER_BARU sudah menjadi sumber kebenaran utama status
 * meter sejak V3. Sekarang, ketidaksesuaian ini hanya ditampilkan sebagai
 * PERINGATAN (lihat FormGanmet.jsx) supaya tidak menghalangi pekerjaan
 * petugas karena data lama/salah ketik di MASTER_PELANGGAN.
 */
export function validasiSeluruhForm(formData, dataMaster = null, dataMeter = null) {
  const errors = {
    namaPelanggan: validasiTeksWajib(formData.namaPelanggan, 'Nama Pelanggan'),
    idPelanggan: validasiIdPelanggan(formData.idPelanggan),
    jenisMeter: validasiTeksWajib(formData.jenisMeter, 'Jenis Meter'),
    alasanPenggantian: validasiTeksWajib(formData.alasanPenggantian, 'Alasan Penggantian'),
    nomorMeterLama: validasiNomorMeterLama(formData.nomorMeterLama),
    nomorMeterBaru: validasiNomorMeterBaru(formData.nomorMeterBaru),
    standCabut: validasiStandCabut(formData.standCabut, formData.jenisMeter),
    fotoMeterLama: formData.fotoMeterLama ? '' : 'Foto Nomor Meter Lama wajib diambil.',
    fotoMeterBaru: formData.fotoMeterBaru ? '' : 'Foto Nomor Meter Baru wajib diambil.'
  };

  if (!errors.idPelanggan) {
    const errorMaster = validasiIdPelangganTerdaftar(dataMaster);
    if (errorMaster) errors.idPelanggan = errorMaster;
  }

  if (!errors.nomorMeterBaru) {
    const errorMeter = validasiStatusMeterBaru(dataMeter);
    if (errorMeter) errors.nomorMeterBaru = errorMeter;
  }

  const isValid = Object.values(errors).every((msg) => msg === '');
  return { errors, isValid };
}
