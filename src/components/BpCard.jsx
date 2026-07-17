import { useRef, useState } from 'react';
import { MAX_PDF_BYTES, MAX_ARCHIVOS_POR_BP } from '../lib/constants.js';
import { getUrlEvidencia } from '../lib/dataStore.js';

function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

const TAGS = {
  esen: { text: '● Esencial', cls: 'tag-esen' },
  'esen-edu': { text: '● Esencial Educativo', cls: 'tag-esp' },
  'esen-san': { text: '● Esencial Sanitario', cls: 'tag-esp' },
  'noe-san': { text: '○ No esencial (Sanitario)', cls: 'tag-esp' },
  noe: { text: '○ No esencial', cls: 'tag-noe' },
};

// Estilos inline autocontenidos — no dependen de soludable.css (no
// disponible al escribir este componente). Si se prefiere mover a
// clases CSS propias más adelante, es un cambio directo.
const pillBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 999,
  marginLeft: 8,
  whiteSpace: 'nowrap',
};

const pillOkStyle = { ...pillBaseStyle, background: 'rgba(0, 184, 212, 0.15)', color: '#00838F' };
const pillNoStyle = { ...pillBaseStyle, background: 'rgba(176, 190, 197, 0.25)', color: '#607D8B' };

const hintStyle = {
  fontSize: 10,
  color: '#B0BEC5',
  textAlign: 'center',
  lineHeight: 1.2,
  marginTop: 4,
  maxWidth: 60,
};

const subsanacionBannerStyle = {
  background: '#FFF3E0',
  border: '1px solid #FFB74D',
  borderRadius: 8,
  padding: '8px 10px',
  margin: '0 0 8px',
  fontSize: 12,
  color: '#E65100',
  lineHeight: 1.5,
};

export default function BpCard({
  bp,
  checked,
  obsValue,
  files, // array: [{evidenciaId, name, size, path}, ...]
  hidden,
  locked,
  requiereSubsanacion, // NUEVO: true si el evaluador pidió corrección en este estándar
  notaSubsanacion, // NUEVO: texto de qué hay que corregir
  onToggle,
  onObs,
  onAddFile,
  onRemoveFile,
}) {
  const [expanded, setExpanded] = useState(false);
  const [err, setErr] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  const lista = files || [];
  const tag = TAGS[bp.tipo] || TAGS.noe;
  const hasContent = !!(obsValue && obsValue.trim()) || lista.length > 0;
  const alcanzadoMax = lista.length >= MAX_ARCHIVOS_POR_BP;

  async function handleFileSelect(e) {
    if (locked) return;
    const f = e.target.files[0];
    setErr('');
    if (!f) return;
    if (alcanzadoMax) {
      setErr(`Máximo ${MAX_ARCHIVOS_POR_BP} archivos por estándar.`);
      e.target.value = '';
      return;
    }
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setErr('Solo se admiten archivos PDF.');
      e.target.value = '';
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setErr(`El archivo pesa ${fmtBytes(f.size)}. El máximo permitido es 2 MB por archivo.`);
      e.target.value = '';
      return;
    }
    setSubiendo(true);
    try {
      await onAddFile(bp.id, f);
    } catch (er) {
      setErr('No se pudo subir el archivo: ' + (er.message || er));
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  }

  async function viewFile(f) {
    try {
      const url = await getUrlEvidencia(f.path);
      const win = window.open();
      win.document.write(
        `<iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>`
      );
    } catch (er) {
      setErr('No se pudo abrir el archivo: ' + (er.message || er));
    }
  }

  const cardCls = [
    'bp-card',
    checked ? 'checked' : '',
    hasContent ? 'has-content' : '',
    hidden ? 'hidden' : '',
    expanded ? 'expanded' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardCls}
      data-bp={bp.id}
      data-tipo={bp.tipo}
      style={requiereSubsanacion ? { outline: '2px solid #FFB74D', outlineOffset: 2 } : undefined}
    >
      {requiereSubsanacion && (
        <div style={subsanacionBannerStyle}>
          <strong>⚠ Requiere corrección:</strong> {notaSubsanacion || 'El evaluador ha solicitado revisar este estándar.'}
        </div>
      )}

      <div className="bp-item">
        <div
          className="bp-dot-col"
          onClick={() => onToggle(bp.id)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div className="bp-dot"></div>
          {/* Aviso recordatorio: solo visible mientras el estándar NO esté
              marcado y sea editable. Desaparece en cuanto se hace check. */}
          {!checked && !locked && (
            <div style={hintStyle}>Toca para marcar cumplido</div>
          )}
        </div>
        <div className="bp-content" onClick={() => setExpanded((v) => !v)}>
          <div className="bp-code">
            {bp.id}
            <span style={checked ? pillOkStyle : pillNoStyle}>
              {checked ? '✅ Cumple' : '⬜ No cumple'}
            </span>
          </div>
          <div className="bp-text">{bp.text}</div>
          <span className={`bp-tipo-tag ${tag.cls}`}>{tag.text}</span>
        </div>
        <button className="bp-expand-btn" onClick={() => setExpanded((v) => !v)}>
          ▾
        </button>
      </div>

      <div className={`detail-panel${expanded ? ' open' : ''}`}>
        <div className="detail-block">
          <div className="detail-label">
            <span className="ic">🎯</span> Propósito
          </div>
          <div className="detail-text">{bp.proposito}</div>
        </div>
        <div className="detail-block">
          <div className="detail-label">
            <span className="ic">👁️</span> Criterios de evaluación
          </div>
          <div className="detail-text">{bp.criterios}</div>
        </div>
        <div className="detail-block">
          <div className="detail-label">
            <span className="ic">📋</span> Evidencias documentales
          </div>
          <div className="evid-box">
            <div className="evid-desc">{bp.evidencias}</div>
            <textarea
              className="obs-ta"
              placeholder="Notas, observaciones o detalle de las evidencias aportadas…"
              value={obsValue || ''}
              disabled={locked}
              onChange={(e) => onObs(bp.id, e.target.value)}
            />
            {!locked && (
              <div className="upload-row">
                <button
                  className="upload-btn"
                  disabled={locked || subiendo || alcanzadoMax}
                  onClick={() => inputRef.current?.click()}
                >
                  {subiendo ? '⏳ Subiendo…' : '📎 Adjuntar PDF'}
                </button>
                <span className="upload-info">
                  Máx. 2 MB/archivo · {lista.length}/{MAX_ARCHIVOS_POR_BP}
                </span>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileSelect}
            />
            {err && <div className="upload-err show">{err}</div>}
            {lista.map((f) => (
              <div className="file-chip" key={f.evidenciaId}>
                <span className="fic">📄</span>
                <span className="fname">{f.name}</span>
                <span className="fsize">{fmtBytes(f.size)}</span>
                <button className="fview" onClick={() => viewFile(f)}>
                  Ver
                </button>
                {!locked && (
                  <button className="frm-btn" onClick={() => onRemoveFile(bp.id, f.evidenciaId)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
