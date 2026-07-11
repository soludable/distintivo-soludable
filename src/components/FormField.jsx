import { CATEGORIAS_ANEXO_I } from '../lib/constants.js';

// Campo genérico del formulario de solicitud. Estilo fiel v6 (login-input / settings).
export default function FormField({ campo, value, error, onChange }) {
  const base = {
    width: '100%',
    border: `2px solid ${error ? 'var(--red)' : 'var(--gray2)'}`,
    borderRadius: 'var(--rs)',
    padding: '12px 14px',
    fontSize: '14px',
    fontFamily: 'var(--font)',
    fontWeight: 700,
    color: 'var(--text)',
    background: 'white',
    outline: 'none',
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--text2)',
          marginBottom: 6,
        }}
      >
        {campo.label}
        {campo.req && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>

      {campo.tipo === 'select' && (
        <select style={base} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Seleccionar —</option>
          {campo.opciones.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}

      {campo.tipo === 'categoria' && (
        <select style={base} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Seleccionar —</option>
          {CATEGORIAS_ANEXO_I.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}

      {campo.tipo === 'geo' && (
        <select
          style={base}
          value={value || ''}
          disabled={campo.disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {campo.disabled ? campo.placeholderDisabled || '— Selecciona provincia primero —' : '— Seleccionar —'}
          </option>
          {(campo.opciones || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {['text', 'email', 'tel'].includes(campo.tipo) && (
        <input
          type={campo.tipo}
          style={base}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {campo.ayuda && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontWeight: 600 }}>
          {campo.ayuda}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 700 }}>
          {error}
        </div>
      )}
    </div>
  );
}
