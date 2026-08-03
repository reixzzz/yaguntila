/**
 * whatsappService.js
 * ----------------------------------------------------------------------------
 * Membuka WhatsApp dengan template laporan yang sudah terisi otomatis
 * (PRD §12 dan §29). Pengguna tetap memilih sendiri kontak/grup tujuan —
 * versi 1 tidak mengunci nomor tujuan tertentu.
 * ----------------------------------------------------------------------------
 */

/**
 * Menyusun teks template laporan WhatsApp dari data form, mengikuti
 * format contoh di PRD §12.
 */
export function buatTemplateWhatsApp(formData, timestamp) {
  const baris = [
    `*LAPORAN PENGGANTIAN kWh METER*`,
    `_YAGUNTILA - Ganmet Afif Man_`,
    ``,
    `Tanggal/Jam: ${timestamp}`,
    `Nama Pelanggan: ${formData.namaPelanggan || '-'}`,
    `ID Pelanggan: ${formData.idPelanggan || '-'}`,
    `Jenis Meter: ${formData.jenisMeter || '-'}`,
    `Alasan: ${formData.alasanPenggantian || '-'}`,
    `Nomor Meter Lama: ${formData.nomorMeterLama || '-'}`,
    `Nomor Meter Baru: ${formData.nomorMeterBaru || '-'}`
  ];

  if (formData.jenisMeter === 'Pascabayar') {
    baris.push(`Stand Cabut: ${formData.standCabut || '-'}`);
  }

  baris.push(`Petugas: ${formData.petugasLapangan || '-'}`);

  return baris.join('\n');
}

/**
 * Membuka aplikasi WhatsApp (atau WhatsApp Web di desktop) dengan teks
 * laporan yang sudah terisi. Pengguna memilih sendiri kontak/grup tujuan.
 */
export function kirimKeWhatsApp(formData, timestamp) {
  const teks = buatTemplateWhatsApp(formData, timestamp);
  const url = `https://wa.me/?text=${encodeURIComponent(teks)}`;
  window.open(url, '_blank');
}
