/**
 * Admin.jsx
 * ----------------------------------------------------------------------------
 * [V3] Fitur #13 — Panel Admin diperluas. Menggantikan Panel Admin Petugas
 * V2 (PIN tunggal + CRUD nama saja) dengan panel penuh yang hanya bisa
 * diakses oleh user berrole ADMIN (sudah login lewat halaman Login):
 *
 *   - Kelola User: tambah/edit/nonaktifkan akun (username, password, nama,
 *     role). Menonaktifkan TIDAK menghapus baris (Upgrade Specification
 *     §1: "Admin dapat menonaktifkan akun tanpa menghapus data").
 *   - Kelola Master Pelanggan: tambah/edit/hapus data ID+Nama+Nomor Meter
 *     rencana SPK.
 *   - Kelola Master Meter: tambah nomor meter baru (satu per satu atau
 *     banyak sekaligus), ubah status (READY/USED/CANCELLED), hapus.
 *
 * Setiap aksi tulis di sini diverifikasi ULANG di server berdasarkan role
 * di dalam token (lihat `wajibAdmin` di Code.gs) — gating di UI hanyalah
 * kenyamanan, bukan satu-satunya lapis keamanan.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ambilDaftarUsers, tambahUser, editUser, ubahStatusUser,
  ambilSeluruhMasterPelanggan, tambahMasterPelanggan, editMasterPelanggan, hapusMasterPelanggan,
  ambilSeluruhMasterMeter, tambahMasterMeter, tambahBanyakMasterMeter, ubahStatusMeter, hapusMasterMeter
} from '../services/appsScriptService';
import Toast from '../components/Toast';
import LoadingState from '../components/LoadingState';
import { ROLE_ADMIN, ROLE_PETUGAS, STATUS_METER } from '../utils/constants';

const SUB_TAB = [
  { id: 'users', label: 'User' },
  { id: 'pelanggan', label: 'Pelanggan' },
  { id: 'meter', label: 'Meter' }
];

export default function Admin({ user, token }) {
  const [subTabAktif, setSubTabAktif] = useState('users');

  if (user.role !== ROLE_ADMIN) {
    return (
      <main className="admin-page">
        <section className="form-section">
          <h2 className="form-section__title" style={{ marginTop: 0 }}>Akses Terbatas</h2>
          <p className="admin-intro">Halaman ini hanya dapat diakses oleh akun dengan role Admin.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="sub-tab-bar">
        {SUB_TAB.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`sub-tab-bar__item ${subTabAktif === tab.id ? 'sub-tab-bar__item--aktif' : ''}`}
            onClick={() => setSubTabAktif(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTabAktif === 'users' && <AdminUsers token={token} />}
      {subTabAktif === 'pelanggan' && <AdminPelanggan token={token} />}
      {subTabAktif === 'meter' && <AdminMeter token={token} />}
    </main>
  );
}

// ============================================================================
// SUB-HALAMAN: KELOLA USER
// ============================================================================

function AdminUsers({ token }) {
  const [daftar, setDaftar] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [toast, setToast] = useState({ tipe: '', pesan: '' });
  const [sedangProses, setSedangProses] = useState(false);

  const [formTambah, setFormTambah] = useState({ username: '', password: '', namaLengkap: '', role: ROLE_PETUGAS });
  const [editTarget, setEditTarget] = useState(null);
  const [formEdit, setFormEdit] = useState({ namaLengkap: '', role: ROLE_PETUGAS, passwordBaru: '' });

  const muat = useCallback(() => {
    setSedangMemuat(true);
    ambilDaftarUsers(token).then(setDaftar).catch(() => setDaftar([])).finally(() => setSedangMemuat(false));
  }, [token]);

  useEffect(() => { muat(); }, [muat]);

  async function handleTambah(e) {
    e.preventDefault();
    if (!formTambah.username.trim() || !formTambah.password || !formTambah.namaLengkap.trim()) return;

    setSedangProses(true);
    const hasil = await tambahUser(token, formTambah.username.trim(), formTambah.password, formTambah.namaLengkap.trim(), formTambah.role);
    setSedangProses(false);

    if (hasil.success) {
      setFormTambah({ username: '', password: '', namaLengkap: '', role: ROLE_PETUGAS });
      setToast({ tipe: 'sukses', pesan: 'User berhasil ditambahkan.' });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal menambah user.' });
    }
  }

  function mulaiEdit(u) {
    setEditTarget(u.username);
    setFormEdit({ namaLengkap: u.namaLengkap, role: u.role, passwordBaru: '' });
  }

  async function handleSimpanEdit(e) {
    e.preventDefault();
    setSedangProses(true);
    const hasil = await editUser(token, editTarget, formEdit.namaLengkap, formEdit.role, formEdit.passwordBaru || undefined);
    setSedangProses(false);

    if (hasil.success) {
      setEditTarget(null);
      setToast({ tipe: 'sukses', pesan: 'User berhasil diubah.' });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal mengubah user.' });
    }
  }

  async function handleToggleStatus(u) {
    const aksi = u.statusAktif ? 'menonaktifkan' : 'mengaktifkan';
    const konfirmasi = window.confirm(`Yakin ingin ${aksi} akun "${u.username}"?`);
    if (!konfirmasi) return;

    setSedangProses(true);
    const hasil = await ubahStatusUser(token, u.username, !u.statusAktif);
    setSedangProses(false);

    if (hasil.success) {
      setToast({ tipe: 'sukses', pesan: hasil.message });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal mengubah status user.' });
    }
  }

  return (
    <div className="dashboard-section">
      <section className="form-section">
        <h2 className="form-section__title" style={{ marginTop: 0 }}>Tambah User Baru</h2>
        <form onSubmit={handleTambah} className="admin-form-grid">
          <input type="text" className="field-input" placeholder="Username" value={formTambah.username}
            onChange={(e) => setFormTambah((f) => ({ ...f, username: e.target.value }))} disabled={sedangProses} />
          <input type="password" className="field-input" placeholder="Password" value={formTambah.password}
            onChange={(e) => setFormTambah((f) => ({ ...f, password: e.target.value }))} disabled={sedangProses} />
          <input type="text" className="field-input" placeholder="Nama Lengkap" value={formTambah.namaLengkap}
            onChange={(e) => setFormTambah((f) => ({ ...f, namaLengkap: e.target.value }))} disabled={sedangProses} />
          <select className="field-select" value={formTambah.role}
            onChange={(e) => setFormTambah((f) => ({ ...f, role: e.target.value }))} disabled={sedangProses}>
            <option value={ROLE_PETUGAS}>PETUGAS</option>
            <option value={ROLE_ADMIN}>ADMIN</option>
          </select>
          <button type="submit" className="btn-admin-aksi btn-admin-aksi--tambah" disabled={sedangProses}>
            Tambah User
          </button>
        </form>
      </section>

      <section className="form-section">
        <h2 className="form-section__title" style={{ marginTop: 0 }}>Daftar User ({daftar.length})</h2>

        {sedangMemuat && <LoadingState pesan="Memuat daftar user..." />}

        {!sedangMemuat && daftar.map((u) => (
          <div key={u.username} className="admin-list-item admin-list-item--stack">
            {editTarget === u.username ? (
              <form onSubmit={handleSimpanEdit} className="admin-form-grid">
                <input type="text" className="field-input" value={formEdit.namaLengkap}
                  onChange={(e) => setFormEdit((f) => ({ ...f, namaLengkap: e.target.value }))} disabled={sedangProses} autoFocus />
                <select className="field-select" value={formEdit.role}
                  onChange={(e) => setFormEdit((f) => ({ ...f, role: e.target.value }))} disabled={sedangProses}>
                  <option value={ROLE_PETUGAS}>PETUGAS</option>
                  <option value={ROLE_ADMIN}>ADMIN</option>
                </select>
                <input type="password" className="field-input" placeholder="Password baru (opsional)" value={formEdit.passwordBaru}
                  onChange={(e) => setFormEdit((f) => ({ ...f, passwordBaru: e.target.value }))} disabled={sedangProses} />
                <div className="admin-list-item__aksi">
                  <button type="submit" className="btn-admin-aksi btn-admin-aksi--tambah" disabled={sedangProses}>Simpan</button>
                  <button type="button" className="btn-admin-aksi btn-admin-aksi--batal" onClick={() => setEditTarget(null)}>Batal</button>
                </div>
              </form>
            ) : (
              <>
                <div className="admin-list-item__info">
                  <span className="admin-list-item__nama">{u.namaLengkap} <span className="badge-role">{u.role}</span></span>
                  <span className="admin-list-item__sub">@{u.username} &middot; {u.statusAktif ? 'Aktif' : 'Nonaktif'}</span>
                </div>
                <div className="admin-list-item__aksi">
                  <button type="button" className="btn-admin-aksi btn-admin-aksi--edit" onClick={() => mulaiEdit(u)} disabled={sedangProses}>Edit</button>
                  <button
                    type="button"
                    className={`btn-admin-aksi ${u.statusAktif ? 'btn-admin-aksi--hapus' : 'btn-admin-aksi--tambah'}`}
                    onClick={() => handleToggleStatus(u)}
                    disabled={sedangProses}
                  >
                    {u.statusAktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </section>

      <Toast tipe={toast.tipe} pesan={toast.pesan} onTutup={() => setToast({ tipe: '', pesan: '' })} />
    </div>
  );
}

// ============================================================================
// SUB-HALAMAN: KELOLA MASTER PELANGGAN
// ============================================================================

function AdminPelanggan({ token }) {
  const [daftar, setDaftar] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [toast, setToast] = useState({ tipe: '', pesan: '' });
  const [sedangProses, setSedangProses] = useState(false);

  const [formTambah, setFormTambah] = useState({ idPelanggan: '', namaPelanggan: '', nomorMeterBaru: '' });
  const [editTarget, setEditTarget] = useState(null);
  const [formEdit, setFormEdit] = useState({ namaPelanggan: '', nomorMeterBaru: '' });

  const muat = useCallback(() => {
    setSedangMemuat(true);
    ambilSeluruhMasterPelanggan(token).then(setDaftar).catch(() => setDaftar([])).finally(() => setSedangMemuat(false));
  }, [token]);

  useEffect(() => { muat(); }, [muat]);

  async function handleTambah(e) {
    e.preventDefault();
    if (!formTambah.idPelanggan.trim() || !formTambah.namaPelanggan.trim()) return;

    setSedangProses(true);
    const hasil = await tambahMasterPelanggan(token, formTambah.idPelanggan.trim(), formTambah.namaPelanggan.trim(), formTambah.nomorMeterBaru.trim());
    setSedangProses(false);

    if (hasil.success) {
      setFormTambah({ idPelanggan: '', namaPelanggan: '', nomorMeterBaru: '' });
      setToast({ tipe: 'sukses', pesan: 'Data pelanggan berhasil ditambahkan.' });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal menambah data pelanggan.' });
    }
  }

  function mulaiEdit(p) {
    setEditTarget(p.idPelanggan);
    setFormEdit({ namaPelanggan: p.namaPelanggan, nomorMeterBaru: p.nomorMeterBaru });
  }

  async function handleSimpanEdit(e) {
    e.preventDefault();
    setSedangProses(true);
    const hasil = await editMasterPelanggan(token, editTarget, formEdit.namaPelanggan, formEdit.nomorMeterBaru);
    setSedangProses(false);

    if (hasil.success) {
      setEditTarget(null);
      setToast({ tipe: 'sukses', pesan: 'Data pelanggan berhasil diubah.' });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal mengubah data pelanggan.' });
    }
  }

  async function handleHapus(idPelanggan) {
    const konfirmasi = window.confirm(`Hapus data pelanggan "${idPelanggan}"?`);
    if (!konfirmasi) return;

    setSedangProses(true);
    const hasil = await hapusMasterPelanggan(token, idPelanggan);
    setSedangProses(false);

    if (hasil.success) {
      setToast({ tipe: 'sukses', pesan: 'Data pelanggan berhasil dihapus.' });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal menghapus data pelanggan.' });
    }
  }

  return (
    <div className="dashboard-section">
      <section className="form-section">
        <h2 className="form-section__title" style={{ marginTop: 0 }}>Tambah Data Pelanggan</h2>
        <p className="admin-intro">Kolom "Nomor Meter Baru" boleh dikosongkan jika belum ada rencana SPK untuk pelanggan ini.</p>
        <form onSubmit={handleTambah} className="admin-form-grid">
          <input type="text" inputMode="numeric" className="field-input" placeholder="ID Pelanggan (12 digit)" value={formTambah.idPelanggan}
            onChange={(e) => setFormTambah((f) => ({ ...f, idPelanggan: e.target.value.replace(/[^0-9]/g, '') }))} disabled={sedangProses} />
          <input type="text" className="field-input" placeholder="Nama Pelanggan" value={formTambah.namaPelanggan}
            onChange={(e) => setFormTambah((f) => ({ ...f, namaPelanggan: e.target.value }))} disabled={sedangProses} />
          <input type="text" inputMode="numeric" className="field-input" placeholder="Nomor Meter Baru (opsional)" value={formTambah.nomorMeterBaru}
            onChange={(e) => setFormTambah((f) => ({ ...f, nomorMeterBaru: e.target.value.replace(/[^0-9]/g, '') }))} disabled={sedangProses} />
          <button type="submit" className="btn-admin-aksi btn-admin-aksi--tambah" disabled={sedangProses}>Tambah</button>
        </form>
      </section>

      <section className="form-section">
        <h2 className="form-section__title" style={{ marginTop: 0 }}>Daftar Pelanggan ({daftar.length})</h2>

        {sedangMemuat && <LoadingState pesan="Memuat daftar pelanggan..." />}

        {!sedangMemuat && daftar.map((p) => (
          <div key={p.idPelanggan} className="admin-list-item admin-list-item--stack">
            {editTarget === p.idPelanggan ? (
              <form onSubmit={handleSimpanEdit} className="admin-form-grid">
                <input type="text" className="field-input" value={formEdit.namaPelanggan}
                  onChange={(e) => setFormEdit((f) => ({ ...f, namaPelanggan: e.target.value }))} disabled={sedangProses} autoFocus />
                <input type="text" inputMode="numeric" className="field-input" placeholder="Nomor Meter Baru" value={formEdit.nomorMeterBaru}
                  onChange={(e) => setFormEdit((f) => ({ ...f, nomorMeterBaru: e.target.value.replace(/[^0-9]/g, '') }))} disabled={sedangProses} />
                <div className="admin-list-item__aksi">
                  <button type="submit" className="btn-admin-aksi btn-admin-aksi--tambah" disabled={sedangProses}>Simpan</button>
                  <button type="button" className="btn-admin-aksi btn-admin-aksi--batal" onClick={() => setEditTarget(null)}>Batal</button>
                </div>
              </form>
            ) : (
              <>
                <div className="admin-list-item__info">
                  <span className="admin-list-item__nama">{p.namaPelanggan}</span>
                  <span className="admin-list-item__sub">ID {p.idPelanggan} {p.nomorMeterBaru && `\u00b7 Meter terkunci: ${p.nomorMeterBaru}`}</span>
                </div>
                <div className="admin-list-item__aksi">
                  <button type="button" className="btn-admin-aksi btn-admin-aksi--edit" onClick={() => mulaiEdit(p)} disabled={sedangProses}>Edit</button>
                  <button type="button" className="btn-admin-aksi btn-admin-aksi--hapus" onClick={() => handleHapus(p.idPelanggan)} disabled={sedangProses}>Hapus</button>
                </div>
              </>
            )}
          </div>
        ))}
      </section>

      <Toast tipe={toast.tipe} pesan={toast.pesan} onTutup={() => setToast({ tipe: '', pesan: '' })} />
    </div>
  );
}

// ============================================================================
// SUB-HALAMAN: KELOLA MASTER METER BARU (stok)
// ============================================================================

function AdminMeter({ token }) {
  const [daftar, setDaftar] = useState([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [toast, setToast] = useState({ tipe: '', pesan: '' });
  const [sedangProses, setSedangProses] = useState(false);

  const [nomorTunggal, setNomorTunggal] = useState('');
  const [nomorBanyak, setNomorBanyak] = useState('');
  const [filterStatus, setFilterStatus] = useState('SEMUA');

  const muat = useCallback(() => {
    setSedangMemuat(true);
    ambilSeluruhMasterMeter(token).then(setDaftar).catch(() => setDaftar([])).finally(() => setSedangMemuat(false));
  }, [token]);

  useEffect(() => { muat(); }, [muat]);

  async function handleTambahTunggal(e) {
    e.preventDefault();
    if (!nomorTunggal.trim()) return;
    setSedangProses(true);
    const hasil = await tambahMasterMeter(token, nomorTunggal.trim());
    setSedangProses(false);
    if (hasil.success) {
      setNomorTunggal('');
      setToast({ tipe: 'sukses', pesan: hasil.message });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal menambah nomor meter.' });
    }
  }

  async function handleTambahBanyak(e) {
    e.preventDefault();
    const daftarNomor = nomorBanyak.split('\n').map((s) => s.trim()).filter(Boolean);
    if (daftarNomor.length === 0) return;

    setSedangProses(true);
    const hasil = await tambahBanyakMasterMeter(token, daftarNomor);
    setSedangProses(false);

    if (hasil.success) {
      setNomorBanyak('');
      setToast({ tipe: 'sukses', pesan: hasil.message });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal menambah banyak nomor meter.' });
    }
  }

  async function handleUbahStatus(nomorMeter, statusBaru) {
    setSedangProses(true);
    const hasil = await ubahStatusMeter(token, nomorMeter, statusBaru);
    setSedangProses(false);
    if (hasil.success) {
      setToast({ tipe: 'sukses', pesan: hasil.message });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal mengubah status meter.' });
    }
  }

  async function handleHapus(nomorMeter) {
    const konfirmasi = window.confirm(`Hapus nomor meter "${nomorMeter}" dari database?`);
    if (!konfirmasi) return;
    setSedangProses(true);
    const hasil = await hapusMasterMeter(token, nomorMeter);
    setSedangProses(false);
    if (hasil.success) {
      setToast({ tipe: 'sukses', pesan: 'Nomor meter berhasil dihapus.' });
      muat();
    } else {
      setToast({ tipe: 'gagal', pesan: hasil.message || 'Gagal menghapus nomor meter.' });
    }
  }

  const daftarTerfilter = filterStatus === 'SEMUA' ? daftar : daftar.filter((m) => m.status === filterStatus);

  return (
    <div className="dashboard-section">
      <section className="form-section">
        <h2 className="form-section__title" style={{ marginTop: 0 }}>Tambah Satu Nomor Meter</h2>
        <form onSubmit={handleTambahTunggal} className="admin-form-inline">
          <input type="text" inputMode="numeric" className="field-input" placeholder="Nomor meter baru" value={nomorTunggal}
            onChange={(e) => setNomorTunggal(e.target.value.replace(/[^0-9]/g, ''))} disabled={sedangProses} />
          <button type="submit" className="btn-admin-aksi btn-admin-aksi--tambah" disabled={sedangProses || !nomorTunggal.trim()}>Tambah</button>
        </form>
      </section>

      <section className="form-section">
        <h2 className="form-section__title" style={{ marginTop: 0 }}>Tambah Banyak Sekaligus</h2>
        <p className="admin-intro">Tempel daftar nomor meter dari SPK/faktur, satu nomor per baris. Semua akan berstatus READY.</p>
        <form onSubmit={handleTambahBanyak}>
          <textarea
            className="field-input admin-textarea"
            rows={5}
            placeholder={'50912975054\n50912996456\n50912976813'}
            value={nomorBanyak}
            onChange={(e) => setNomorBanyak(e.target.value)}
            disabled={sedangProses}
          />
          <button type="submit" className="btn-admin-aksi btn-admin-aksi--tambah" style={{ marginTop: 8 }} disabled={sedangProses || !nomorBanyak.trim()}>
            Tambah Semua
          </button>
        </form>
      </section>

      <section className="form-section">
        <div className="admin-meter-header">
          <h2 className="form-section__title" style={{ marginTop: 0 }}>Daftar Meter ({daftarTerfilter.length})</h2>
          <select className="field-select field-select--kecil" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="SEMUA">Semua Status</option>
            <option value={STATUS_METER.READY}>READY</option>
            <option value={STATUS_METER.USED}>USED</option>
            <option value={STATUS_METER.CANCELLED}>CANCELLED</option>
          </select>
        </div>

        {sedangMemuat && <LoadingState pesan="Memuat daftar meter..." />}

        {!sedangMemuat && daftarTerfilter.length === 0 && (
          <p className="dashboard-empty">Tidak ada data meter untuk filter ini.</p>
        )}

        {!sedangMemuat && daftarTerfilter.map((m) => (
          <div key={m.nomorMeter} className="admin-list-item admin-list-item--stack">
            <div className="admin-list-item__info">
              <span className="admin-list-item__nama">
                {m.nomorMeter} <span className={`badge-status badge-status--${m.status.toLowerCase()}`}>{m.status}</span>
              </span>
              {m.status !== STATUS_METER.READY && (
                <span className="admin-list-item__sub">
                  {m.dipakaiOleh && `ID Pelanggan: ${m.dipakaiOleh} \u00b7 `}{m.petugas && `${m.petugas} \u00b7 `}{m.tanggal}
                </span>
              )}
            </div>
            <div className="admin-list-item__aksi">
              {m.status !== STATUS_METER.READY && (
                <button type="button" className="btn-admin-aksi btn-admin-aksi--tambah" onClick={() => handleUbahStatus(m.nomorMeter, STATUS_METER.READY)} disabled={sedangProses}>
                  Jadikan READY
                </button>
              )}
              {m.status !== STATUS_METER.CANCELLED && (
                <button type="button" className="btn-admin-aksi btn-admin-aksi--batal" onClick={() => handleUbahStatus(m.nomorMeter, STATUS_METER.CANCELLED)} disabled={sedangProses}>
                  Batalkan
                </button>
              )}
              <button type="button" className="btn-admin-aksi btn-admin-aksi--hapus" onClick={() => handleHapus(m.nomorMeter)} disabled={sedangProses}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </section>

      <Toast tipe={toast.tipe} pesan={toast.pesan} onTutup={() => setToast({ tipe: '', pesan: '' })} />
    </div>
  );
}
