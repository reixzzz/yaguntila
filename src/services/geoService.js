/**
 * geoService.js
 * ----------------------------------------------------------------------------
 * [V2] Fitur #6 — GPS Otomatis. Mengambil lokasi petugas saat submit
 * menggunakan HTML5 Geolocation API, lalu menyiapkan link Google Maps.
 *
 * PRINSIP DESAIN: GPS bersifat BEST-EFFORT, bukan wajib. Banyak hal bisa
 * membuat GPS gagal di lapangan (petugas menolak izin lokasi, GPS HP
 * dimatikan, sinyal GPS lemah di dalam gedung, browser timeout). Jika
 * GPS gagal dengan alasan apapun, laporan TETAP HARUS bisa terkirim
 * tanpa data lokasi — fitur baru tidak boleh memblokir fitur lama
 * (Kirim Laporan) yang sudah berjalan baik di V1.
 * ----------------------------------------------------------------------------
 */

const GEO_TIMEOUT_MS = 8000; // jangan menunggu GPS terlalu lama saat submit

/**
 * Mengambil koordinat GPS saat ini.
 *
 * @returns {Promise<{berhasil: boolean, latitude?: number, longitude?: number, googleMapsUrl?: string, alasanGagal?: string}>}
 */
export function ambilLokasiGPS() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ berhasil: false, alasanGagal: 'Perangkat tidak mendukung GPS.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posisi) => {
        const { latitude, longitude } = posisi.coords;
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        resolve({ berhasil: true, latitude, longitude, googleMapsUrl });
      },
      (error) => {
        // Kode error Geolocation API: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
        let alasanGagal = 'Gagal mengambil lokasi GPS.';
        if (error.code === 1) alasanGagal = 'Izin lokasi ditolak.';
        if (error.code === 2) alasanGagal = 'Lokasi GPS tidak tersedia.';
        if (error.code === 3) alasanGagal = 'Waktu pengambilan lokasi GPS habis.';

        console.warn('GPS gagal:', alasanGagal);
        resolve({ berhasil: false, alasanGagal });
      },
      {
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 0
      }
    );
  });
}
