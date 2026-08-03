/**
 * imageService.js
 * ----------------------------------------------------------------------------
 * Mengurus 2 hal terkait foto:
 *   1. Mengompres foto sebelum dikirim (PRD §30) — agar upload tetap cepat
 *      walau sinyal internet di lapangan kurang stabil.
 *   2. Mengubah file foto menjadi teks Base64 — karena JSON tidak bisa
 *      membawa file gambar langsung, harus diubah jadi teks dulu.
 * ----------------------------------------------------------------------------
 */

import imageCompression from 'browser-image-compression';
import { FOTO_MAX_WIDTH_PX, FOTO_MAX_SIZE_MB } from '../utils/constants';

/**
 * Mengompres file foto agar:
 *   - Lebar maksimal 1280px (PRD §30)
 *   - Ukuran file target di bawah 500KB (PRD §30)
 *   - Format JPG/JPEG (PRD §30)
 *   - Nomor meter tetap terbaca jelas setelah kompresi
 *
 * @param {File} file - File foto asli dari kamera HP
 * @returns {Promise<File>} - File foto yang sudah dikompres
 */
export async function kompresFoto(file) {
  const opsiKompresi = {
    maxWidthOrHeight: FOTO_MAX_WIDTH_PX,
    maxSizeMB: FOTO_MAX_SIZE_MB,
    useWebWorker: true,
    fileType: 'image/jpeg',
    // Kualitas awal cukup tinggi (0.8) supaya digit angka meter tetap
    // terbaca jelas; library akan menurunkan kualitas secara bertahap
    // hanya jika diperlukan untuk mencapai target ukuran file.
    initialQuality: 0.8
  };

  try {
    const fileTerkompresi = await imageCompression(file, opsiKompresi);
    return fileTerkompresi;
  } catch (error) {
    console.warn('Kompresi foto gagal, menggunakan file asli:', error.message);
    // Jika kompresi gagal karena alasan apapun, tetap lanjutkan dengan
    // file asli agar petugas tidak terblokir mengirim laporan.
    return file;
  }
}

/**
 * Mengubah File menjadi string Base64 (format data URL) agar bisa
 * dimasukkan ke dalam JSON dan dikirim lewat fetch().
 *
 * @param {File} file
 * @returns {Promise<string>} - contoh: "data:image/jpeg;base64,/9j/4AAQ..."
 */
export function fileKeBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Proses lengkap: kompres foto, lalu ubah ke Base64.
 * Ini fungsi utama yang dipanggil komponen saat foto diambil.
 *
 * @param {File} file
 * @returns {Promise<{base64: string, previewUrl: string, sizeKB: number}>}
 */
export async function prosesFotoUntukUpload(file) {
  const fileTerkompresi = await kompresFoto(file);
  const base64 = await fileKeBase64(fileTerkompresi);
  const previewUrl = URL.createObjectURL(fileTerkompresi);
  const sizeKB = Math.round(fileTerkompresi.size / 1024);

  return { base64, previewUrl, sizeKB, file: fileTerkompresi };
}
