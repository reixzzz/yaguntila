/**
 * TextField.jsx
 * ----------------------------------------------------------------------------
 * Komponen input teks/angka serbaguna dengan label, pesan error, dan
 * keterangan tambahan (hint). Dipakai untuk Nama Pelanggan, ID Pelanggan,
 * Nomor Meter Lama/Baru, dan Stand Cabut.
 *
 * Catatan teknis penting: untuk field angka berdigit panjang (ID Pelanggan
 * 12 digit, Nomor Meter 11 digit) kita SENGAJA tidak memakai
 * <input type="number">, karena tipe itu di banyak browser Android akan:
 *   - Memotong/menghapus angka 0 di awal (leading zero).
 *   - Memunculkan tombol spinner naik/turun yang tidak relevan di sini.
 * Sebagai gantinya kita pakai type="text" dengan inputMode="numeric" dan
 * pattern, supaya keyboard yang muncul tetap keyboard angka, tapi nilainya
 * tetap diperlakukan sebagai teks (sehingga digit-counting akurat).
 * ----------------------------------------------------------------------------
 */

export default function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  wajib = true,
  tipe = 'text',     // 'text' | 'numeric'
  maxLength,
  placeholder,
  disabled = false,
  rightSlot = null    // elemen tambahan di kanan input, misal status OCR
}) {
  const inputProps = tipe === 'numeric'
    ? { inputMode: 'numeric', pattern: '[0-9]*' }
    : {};

  function handleChange(e) {
    let val = e.target.value;
    if (tipe === 'numeric') {
      // Saring agar hanya digit yang masuk, mencegah karakter aneh
      // tersisip saat pengguna paste teks campuran.
      val = val.replace(/[^0-9]/g, '');
    }
    if (maxLength && val.length > maxLength) {
      val = val.slice(0, maxLength);
    }
    onChange(val);
  }

  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {wajib && <span className="field-wajib"> *</span>}
      </label>

      <div className="field-input-wrap">
        <input
          className={`field-input ${tipe === 'numeric' ? 'field-input--mono' : ''} ${error ? 'field-input--error' : ''}`}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          {...inputProps}
        />
        {rightSlot && <div className="field-right-slot">{rightSlot}</div>}
      </div>

      {error ? (
        <p className="field-error" role="alert">{error}</p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}
