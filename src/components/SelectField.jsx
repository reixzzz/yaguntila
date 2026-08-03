/**
 * SelectField.jsx
 * ----------------------------------------------------------------------------
 * Komponen dropdown (select) serbaguna. Dipakai untuk Jenis Meter, Alasan
 * Penggantian, dan Petugas Lapangan.
 * ----------------------------------------------------------------------------
 */

export default function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  wajib = true,
  placeholder = 'Pilih salah satu',
  disabled = false,
  sedangMemuat = false
}) {
  return (
    <div className="field-group">
      <label className="field-label">
        {label}
        {wajib && <span className="field-wajib"> *</span>}
      </label>

      <div className="field-select-wrap">
        <select
          className={`field-select ${error ? 'field-input--error' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || sedangMemuat}
        >
          <option value="">{sedangMemuat ? 'Memuat data...' : placeholder}</option>
          {options.map((opsi) => (
            <option key={opsi} value={opsi}>{opsi}</option>
          ))}
        </select>
        <svg className="field-select-arrow" width="14" height="9" viewBox="0 0 14 9" fill="none">
          <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
