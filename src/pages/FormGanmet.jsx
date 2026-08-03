/**
 * FormGanmet.jsx
 * ----------------------------------------------------------------------------
 * Halaman utama aplikasi: form input penggantian meter.
 *
 * [V3] Perubahan dari V2:
 *   - Dropdown "Petugas Lapangan" DIHAPUS — nama petugas otomatis diambil
 *     dari sesi login (`useAuth`) dan ditampilkan sebagai info read-only.
 *   - Nomor Meter Baru kini diisi lewat Scan QR/Barcode (tombol membuka
 *     `BarcodeScannerModal`) dengan input manual tetap tersedia sebagai
 *     cadangan. Status stok (READY/USED/tidak ditemukan) diperiksa
 *     otomatis lewat `useMeterBaruCheck` dan ditampilkan sebagai hint/
 *     error sebelum petugas sempat submit.
 *   - `kirimLaporan` dan antrian offline kini menyertakan token sesi.
 *   - OCR sepenuhnya dihapus (lihat CameraField.jsx).
 *
 * Fitur V1/V2 yang dipertahankan: autofill Nama Pelanggan dari Master
 * Pelanggan, GPS otomatis, Offline Queue, Draft Otomatis, kirim WhatsApp.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect } from 'react';
import TextField from '../components/TextField';
import SelectField from '../components/SelectField';
import CameraField from '../components/CameraField';
import Toast from '../components/Toast';
import OfflineBanner from '../components/OfflineBanner';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { useFormGanmet } from '../hooks/useFormGanmet';
import { useMasterPelanggan } from '../hooks/useMasterPelanggan';
import { useMeterBaruCheck } from '../hooks/useMeterBaruCheck';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { kirimLaporan } from '../services/appsScriptService';
import { kirimKeWhatsApp } from '../services/whatsappService';
import { ambilLokasiGPS } from '../services/geoService';
import { tambahKeAntrianOffline } from '../utils/localStorage';
import { validasiNomorMeterBaruVsMaster } from '../utils/validators';
import {
  JENIS_METER_OPTIONS,
  ALASAN_PENGGANTIAN_OPTIONS,
  PANJANG_ID_PELANGGAN,
  PANJANG_MAX_NOMOR_METER_BARU,
  PESAN
} from '../utils/constants';

export default function FormGanmet({ user, token }) {
  const { formData, errors, setField, setFoto, validasi, resetForm } = useFormGanmet();

  const { dataMaster, sedangMencari: sedangMencariMaster } = useMasterPelanggan(formData.idPelanggan);
  const { dataMeter, sedangMemeriksa: sedangMemeriksaMeter } = useMeterBaruCheck(formData.nomorMeterBaru);

  const online = useOnlineStatus();
  const { jumlahAntrian, segarkanJumlah } = useOfflineQueue();

  const [sedangKirim, setSedangKirim] = useState(false);
  const [toast, setToast] = useState({ tipe: '', pesan: '' });
  const [laporanTerakhir, setLaporanTerakhir] = useState(null);
  const [scannerTampil, setScannerTampil] = useState(false);

  useEffect(() => {
    if (dataMaster && dataMaster.ditemukan && dataMaster.namaPelanggan) {
      setField('namaPelanggan', dataMaster.namaPelanggan);
    } else if (dataMaster && !dataMaster.ditemukan && !dataMaster.gagalKoneksi) {
      // [PATCH BUGFIX] ID dipastikan TIDAK ada di database (bukan sekadar
      // gagal koneksi) — kosongkan Nama Pelanggan supaya tidak ada sisa
      // nama dari hasil pencarian ID sebelumnya yang membingungkan, dan
      // field tetap terkunci (lihat namaPelangganBisaDiketik di bawah).
      setField('namaPelanggan', '');
    }
  }, [dataMaster]); // eslint-disable-line react-hooks/exhaustive-deps

  function tutupToast() {
    setToast({ tipe: '', pesan: '' });
  }

  function handleHasilScan(nomor) {
    setField('nomorMeterBaru', nomor.slice(0, PANJANG_MAX_NOMOR_METER_BARU));
    setScannerTampil(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (sedangKirim) return;

    const valid = validasi(dataMaster, dataMeter);
    if (!valid) {
      const firstErrorEl = document.querySelector('.field-input--error, .camera-button--error');
      if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSedangKirim(true);
    setToast({ tipe: 'loading', pesan: PESAN.LOADING_SUBMIT });

    const lokasi = await ambilLokasiGPS();

    const payload = {
      namaPelanggan: formData.namaPelanggan.trim(),
      idPelanggan: formData.idPelanggan,
      jenisMeter: formData.jenisMeter,
      alasanPenggantian: formData.alasanPenggantian,
      nomorMeterLama: formData.nomorMeterLama,
      nomorMeterBaru: formData.nomorMeterBaru,
      standCabut: formData.standCabut,
      fotoMeterLamaBase64: formData.fotoMeterLama.base64,
      fotoMeterBaruBase64: formData.fotoMeterBaru.base64,
      latitude: lokasi.berhasil ? lokasi.latitude : '',
      longitude: lokasi.berhasil ? lokasi.longitude : '',
      googleMapsUrl: lokasi.berhasil ? lokasi.googleMapsUrl : ''
    };

    if (!online) {
      const hasilAntri = tambahKeAntrianOffline({ ...payload, token });
      setSedangKirim(false);
      if (hasilAntri.success) {
        setToast({ tipe: 'sukses', pesan: PESAN.TERSIMPAN_OFFLINE });
        resetForm();
        segarkanJumlah();
      } else {
        setToast({ tipe: 'gagal', pesan: hasilAntri.message });
      }
      return;
    }

    const hasil = await kirimLaporan(payload, token);
    setSedangKirim(false);

    if (hasil.success) {
      const timestamp = (hasil.data && hasil.data.timestamp) || formatWaktuLokal();
      setLaporanTerakhir({ formData: { ...formData, petugasLapangan: user.namaLengkap }, timestamp });
      setToast({ tipe: 'sukses', pesan: PESAN.SUKSES_SUBMIT });
      resetForm();
    } else {
      const pesanGagal = hasil.message || PESAN.GAGAL_SUBMIT;
      const kemungkinanJaringan = pesanGagal === PESAN.GAGAL_SUBMIT;

      if (kemungkinanJaringan) {
        const hasilAntri = tambahKeAntrianOffline({ ...payload, token });
        if (hasilAntri.success) {
          setToast({ tipe: 'sukses', pesan: PESAN.TERSIMPAN_OFFLINE });
          resetForm();
          segarkanJumlah();
          return;
        }
      }
      setToast({ tipe: 'gagal', pesan: pesanGagal });
    }
  }

  function handleKirimWhatsApp() {
    if (!laporanTerakhir) return;
    kirimKeWhatsApp(laporanTerakhir.formData, laporanTerakhir.timestamp);
  }

  const tampilkanStandCabut = formData.jenisMeter === 'Pascabayar';

  // [PATCH BUGFIX] Sesuai spesifikasi awal V3: ID Pelanggan yang TIDAK
  // ditemukan di MASTER_PELANGGAN harus memblokir submit, dan Nama
  // Pelanggan TIDAK boleh diisi manual sebagai workaround. Sebelumnya,
  // field Nama hanya "readonly saat ditemukan" — begitu ID tidak
  // ditemukan, field itu malah jadi bisa diketik bebas, sehingga petugas
  // bisa lolos submit dengan ID palsu/salah ketik. Sekarang field Nama
  // HANYA bisa diketik manual saat status verifikasinya benar-benar tidak
  // bisa dipastikan (`gagalKoneksi`, misal petugas sedang offline di
  // lapangan) — supaya Antrian Offline tetap bisa dipakai. Server tetap
  // memverifikasi ulang ID ini saat laporan disinkronkan.
  const idPelangganDitemukan = !!(dataMaster && dataMaster.ditemukan);
  const idPelangganTidakDitemukan = !!(dataMaster && !dataMaster.ditemukan && !dataMaster.gagalKoneksi);
  const sedangOfflineTanpaVerifikasi = !!(dataMaster && dataMaster.gagalKoneksi);
  const namaPelangganBisaDiketikManual = sedangOfflineTanpaVerifikasi;

  // [PATCH BUGFIX] Peringatan (BUKAN error blocking) jika nomor yang
  // diketik/discan berbeda dari nilai yang "terkunci" di MASTER_PELANGGAN
  // untuk ID Pelanggan ini. Petugas tetap bisa submit — nomor akan tetap
  // divalidasi tegas lewat status READY di MASTER_METER_BARU (lihat
  // hintMeter di bawah). Ini mencegah data lama/salah ketik di
  // MASTER_PELANGGAN memblokir pekerjaan lapangan yang sebenarnya benar.
  const peringatanMaster = validasiNomorMeterBaruVsMaster(formData.nomorMeterBaru, dataMaster);

  const hintMeter = sedangMemeriksaMeter
    ? 'Memeriksa status meter...'
    : dataMeter && dataMeter.ditemukan && dataMeter.status === 'READY'
      ? 'Meter tersedia (READY) — siap digunakan.'
      : `${PANJANG_MAX_NOMOR_METER_BARU} digit — scan QR/Barcode atau isi manual`;

  return (
    <main className="form-page">
      <OfflineBanner online={online} jumlahAntrian={jumlahAntrian} />

      <div className="petugas-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 20C5 16.5 8 14.5 12 14.5C16 14.5 19 16.5 19 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span>Petugas: <strong>{user.namaLengkap}</strong></span>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        <section className="form-section">
          <h2 className="form-section__title">Data Pelanggan</h2>

          <TextField
            label="ID Pelanggan"
            value={formData.idPelanggan}
            onChange={(v) => setField('idPelanggan', v)}
            error={errors.idPelanggan}
            tipe="numeric"
            maxLength={PANJANG_ID_PELANGGAN}
            placeholder="172000000000"
            hint={
              sedangMencariMaster
                ? 'Mencari data pelanggan...'
                : sedangOfflineTanpaVerifikasi
                  ? 'Tidak dapat memeriksa database (offline) — laporan tetap bisa dikirim/diantrikan, ID akan diverifikasi ulang saat tersinkron.'
                  : idPelangganTidakDitemukan
                    ? 'ID Pelanggan tidak ditemukan pada database. Submit tidak bisa dilanjutkan.'
                    : `${PANJANG_ID_PELANGGAN} digit angka`
            }
            disabled={sedangKirim}
          />

          <TextField
            label="Nama Pelanggan"
            value={formData.namaPelanggan}
            onChange={(v) => setField('namaPelanggan', v)}
            error={errors.namaPelanggan}
            placeholder={namaPelangganBisaDiketikManual ? 'Contoh: Kartijo' : 'Menunggu ID Pelanggan valid...'}
            disabled={sedangKirim || !namaPelangganBisaDiketikManual}
            hint={
              idPelangganDitemukan
                ? 'Otomatis terisi dari database pelanggan.'
                : namaPelangganBisaDiketikManual
                  ? 'Sedang offline — isi nama secara manual, pastikan ID Pelanggan sudah benar.'
                  : idPelangganTidakDitemukan
                    ? 'Tidak bisa diisi karena ID Pelanggan belum terdaftar.'
                    : null
            }
          />

          <SelectField
            label="Jenis Meter"
            value={formData.jenisMeter}
            onChange={(v) => setField('jenisMeter', v)}
            options={JENIS_METER_OPTIONS}
            error={errors.jenisMeter}
            disabled={sedangKirim}
          />

          <SelectField
            label="Alasan Penggantian"
            value={formData.alasanPenggantian}
            onChange={(v) => setField('alasanPenggantian', v)}
            options={ALASAN_PENGGANTIAN_OPTIONS}
            error={errors.alasanPenggantian}
            disabled={sedangKirim}
          />
        </section>

        <section className="form-section">
          <h2 className="form-section__title">Data Meter</h2>

          <TextField
            label="Nomor Meter Lama"
            value={formData.nomorMeterLama}
            onChange={(v) => setField('nomorMeterLama', v)}
            error={errors.nomorMeterLama}
            tipe="numeric"
            maxLength={12}
            placeholder="45678901234"
            hint="6-12 digit angka"
            disabled={sedangKirim}
          />

          <div className="field-group">
            <label className="field-label">Nomor Meter Baru<span className="field-wajib"> *</span></label>
            <div className="field-input-wrap">
              <input
                className={`field-input field-input--mono ${errors.nomorMeterBaru ? 'field-input--error' : ''}`}
                type="text"
                inputMode="numeric"
                value={formData.nomorMeterBaru}
                onChange={(e) => setField('nomorMeterBaru', e.target.value.replace(/[^0-9]/g, '').slice(0, PANJANG_MAX_NOMOR_METER_BARU))}
                placeholder="56789012345"
                disabled={sedangKirim}
              />
              <button
                type="button"
                className="field-right-slot field-right-slot--button"
                onClick={() => setScannerTampil(true)}
                disabled={sedangKirim}
              >
                Scan
              </button>
            </div>
            {errors.nomorMeterBaru ? (
              <p className="field-error" role="alert">{errors.nomorMeterBaru}</p>
            ) : (
              <>
                <p className={`field-hint ${dataMeter && dataMeter.ditemukan && dataMeter.status === 'READY' ? 'field-hint--sukses' : ''}`}>
                  {hintMeter}
                </p>
                {peringatanMaster && (
                  <p className="field-hint field-hint--warning">
                    ⚠ Berbeda dari data MASTER_PELANGGAN untuk ID ini — silakan cek kembali sebelum mengirim, tapi tetap bisa dikirim jika nomor ini yang benar dipakai di lapangan.
                  </p>
                )}
              </>
            )}
          </div>

          {tampilkanStandCabut && (
            <TextField
              label="Stand Cabut"
              value={formData.standCabut}
              onChange={(v) => setField('standCabut', v)}
              error={errors.standCabut}
              tipe="numeric"
              placeholder="12345"
              disabled={sedangKirim}
            />
          )}
        </section>

        <section className="form-section">
          <h2 className="form-section__title">Dokumentasi Foto</h2>

          <CameraField
            label="Foto Nomor Meter Lama"
            fotoData={formData.fotoMeterLama}
            onFotoSiap={(data) => setFoto('fotoMeterLama', data)}
            error={errors.fotoMeterLama}
          />

          <CameraField
            label="Foto Nomor Meter Baru"
            fotoData={formData.fotoMeterBaru}
            onFotoSiap={(data) => setFoto('fotoMeterBaru', data)}
            error={errors.fotoMeterBaru}
          />
        </section>

        <button type="submit" className="btn-submit" disabled={sedangKirim}>
          {sedangKirim ? (
            <>
              <span className="btn-submit__spinner" />
              {PESAN.LOADING_SUBMIT}
            </>
          ) : (
            'Kirim Laporan'
          )}
        </button>

        {laporanTerakhir && !sedangKirim && (
          <button type="button" className="btn-whatsapp" onClick={handleKirimWhatsApp}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.6 6.32A8.86 8.86 0 0 0 12.05 4C7.4 4 3.6 7.8 3.6 12.45c0 1.48.4 2.93 1.16 4.2L3.5 20.5l3.95-1.04a8.85 8.85 0 0 0 4.6 1.28h.01c4.65 0 8.45-3.8 8.45-8.45a8.4 8.4 0 0 0-2.91-5.97z" />
            </svg>
            Kirim ke WhatsApp (Laporan Terakhir)
          </button>
        )}
      </form>

      {scannerTampil && (
        <BarcodeScannerModal onHasil={handleHasilScan} onTutup={() => setScannerTampil(false)} />
      )}

      <Toast tipe={toast.tipe} pesan={toast.tipe === 'loading' ? '' : toast.pesan} onTutup={tutupToast} />
    </main>
  );
}

function formatWaktuLokal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
