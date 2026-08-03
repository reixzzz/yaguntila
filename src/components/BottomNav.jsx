/**
 * BottomNav.jsx
 * ----------------------------------------------------------------------------
 * Navigasi bawah (bottom tab bar) untuk berpindah antar halaman: Form
 * (input laporan), Riwayat, Dashboard, dan Admin.
 *
 * Pola "bottom nav" dipilih (bukan sidebar/hamburger) karena target
 * pengguna adalah petugas LAPANGAN yang memegang HP dengan satu tangan —
 * tab di bawah lebih mudah dijangkau jempol dibanding menu atas.
 *
 * [V3] Tab "Admin" hanya dirender jika `tampilkanAdmin` true (yaitu role
 * user yang sedang login adalah ADMIN) — petugas biasa tidak lagi
 * melihat tab ini sama sekali, sejalan dengan panel admin yang sekarang
 * digerbangi oleh sistem login sungguhan, bukan sekadar PIN di UI.
 * ----------------------------------------------------------------------------
 */

const TAB_LIST_DASAR = [
  { id: 'form', label: 'Laporan', icon: IconForm },
  { id: 'riwayat', label: 'Riwayat', icon: IconRiwayat },
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard }
];

const TAB_ADMIN = { id: 'admin', label: 'Admin', icon: IconAdmin };

export default function BottomNav({ halamanAktif, onPindahHalaman, badgeAntrian = 0, tampilkanAdmin = false }) {
  const daftarTab = tampilkanAdmin ? [...TAB_LIST_DASAR, TAB_ADMIN] : TAB_LIST_DASAR;

  return (
    <nav className="bottom-nav">
      {daftarTab.map((tab) => {
        const Icon = tab.icon;
        const aktif = halamanAktif === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`bottom-nav__item ${aktif ? 'bottom-nav__item--aktif' : ''}`}
            onClick={() => onPindahHalaman(tab.id)}
          >
            <span className="bottom-nav__icon-wrap">
              <Icon />
              {tab.id === 'form' && badgeAntrian > 0 && (
                <span className="bottom-nav__badge">{badgeAntrian}</span>
              )}
            </span>
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function IconForm() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M7 3H14L19 8V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V5C5 3.9 5.9 3 7 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3V8H19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 13H15.5M8.5 16.5H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconRiwayat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 8V12L15 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 9A8 8 0 1 1 5 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 5V9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="12" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="7" width="4" height="13" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <rect x="16" y="4" width="4" height="16" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20C5 16.5 8 14.5 12 14.5C16 14.5 19 16.5 19 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
