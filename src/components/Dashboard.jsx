import { useState } from 'react';
import { calcStats, getNivel, NIVEL_LABELS } from '../lib/evaluacion.js';
import { PASOS_PROCESO } from '../lib/constants.js';
import { BPS } from '../data/bps.js';
import { exportarPDF } from '../features/export/pdf.js';
import { exportarExcel } from '../features/export/excel.js';
import BrandFooter from './BrandFooter.jsx';

function fmtFecha(f) {
  return f ? new Date(f).toLocaleString('es-ES') : '';
}

// Stepper visual del estado del proceso. Pinta cada paso ya superado en
// verde, el paso actual resaltado, y los futuros en gris. Si el estado
// actual no está en la lista (no debería pasar aquí, pero por seguridad),
// no rompe — simplemente no resalta ningún paso como "actual".
function EstadoStepper({ estadoActual }) {
  const idxActual = PASOS_PROCESO.findIndex((p) => p.estado === estadoActual);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '4px 0 16px', flexWrap: 'wrap' }}>
      {PASOS_PROCESO.map((paso, i) => {
        const superado = idxActual >= 0 && i < idxActual;
        const actual = i === idxActual;
        const color = actual ? '#00B8C8' : superado ? '#4CAF50' : '#CFD8DC';
        return (
          <div key={paso.estado} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: actual ? 900 : 700,
                color: actual || superado ? '#fff' : '#607D8B',
                background: color,
                padding: '4px 9px',
                borderRadius: 20,
                whiteSpace: 'nowrap',
              }}
            >
              {superado ? '✔ ' : ''}
              {paso.label}
            </div>
            {i < PASOS_PROCESO.length - 1 && (
              <div style={{ width: 10, height: 2, background: '#CFD8DC' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard({ evalData }) {
  const { state, obs, files, subsanacion, tipo, proceso, locked, lockDate, enSubsanacion, cerrar } = evalData;
  const [modalOpen, setModalOpen] = useState(false);

  const s = calcStats(state, tipo);
  const nv = getNivel(s);
  const esenOk = s.esenCumpl === s.esenTotal && s.esenTotal > 0;
  const need50 = Math.ceil(s.noeTotal * 0.5);
  const need75 = Math.ceil(s.noeTotal * 0.75);
  const noeColor = s.pNoe >= 75 ? '#4CAF50' : s.pNoe >= 50 ? '#00B8C8' : '#F5C800';
  const levelBg =
    nv.color === '#F5C800'
      ? 'linear-gradient(135deg, #F5C800, #FFB300)'
      : nv.color === '#BDBDBD'
        ? 'linear-gradient(135deg,#aaa,#888)'
        : 'var(--turq)';

  const estadoActual = proceso?.estado;
  // El proceso puede (re)cerrarse tanto desde autoevaluación normal como,
  // tras subsanar, desde en_subsanacion — fn_cerrar_evaluacion en
  // servidor ya acepta ambos orígenes.
  const puedeCerrar = estadoActual === 'en_autoevaluacion' || enSubsanacion;

  const reqs = [
    {
      icon: '●',
      name: `Esenciales al 100% (${s.esenTotal} requeridas)`,
      detail: `${s.esenCumpl}/${s.esenTotal} cumplidas`,
      ok: esenOk,
    },
    {
      icon: '🏅',
      name: `AVANZADO: no esenciales ≥50% (${need50} de ${s.noeTotal})`,
      detail: `${s.noeCumpl}/${s.noeTotal} — ${s.pNoe}%`,
      ok: esenOk && s.pNoe >= 50,
    },
    {
      icon: '⭐',
      name: `EXCELENTE: no esenciales ≥75% (${need75} de ${s.noeTotal})`,
      detail: `${s.noeCumpl}/${s.noeTotal} — ${s.pNoe}%`,
      ok: esenOk && s.pNoe >= 75,
    },
  ];

  // Lista de estándares marcados por el evaluador como pendientes de
  // corrección, con su nota. Visible tanto en subsanación activa como
  // más adelante (histórico), para que quede constancia de qué se pidió.
  const itemsSubsanacion = Object.entries(subsanacion || {})
    .filter(([, v]) => v.requiere)
    .map(([bpId, v]) => ({
      bpId,
      nota: v.nota,
      texto: BPS.find((b) => b.id === bpId)?.text || bpId,
    }));

  function confirmarCierre() {
    cerrar();
    setModalOpen(false);
  }

  const payload = { state, obs, files, tipo };

  return (
    <div className="view active dash">
      {estadoActual && <EstadoStepper estadoActual={estadoActual} />}

      <div className="level-card" style={{ background: levelBg }}>
        <div className="lv-label">Nivel del Distintivo</div>
        <div className="lv-val">{s.totalCumpl === 0 ? '— Comienza marcando BPs —' : nv.txt}</div>
        <div className="lv-sub">
          {s.totalCumpl === 0 ? 'Selecciona tu tipo de institución arriba' : nv.sub}
        </div>
      </div>

      {/* Mensaje específico según la fase del proceso, además del banner
          de bloqueo genérico de más abajo. */}
      {estadoActual === 'en_evaluacion' && (
        <div style={{ background: '#E3F2FD', border: '1px solid #2196F3', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13, color: '#0D47A1', fontWeight: 700 }}>
          🔍 Tu proceso está siendo evaluado en este momento por el equipo revisor.
        </div>
      )}
      {estadoActual === 'en_revision_final' && (
        <div style={{ background: '#E8F5E9', border: '1px solid #4CAF50', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13, color: '#1B5E20', fontWeight: 700, lineHeight: 1.6 }}>
          🏁 Evaluación final completada. Nivel conseguido:{' '}
          <strong>{NIVEL_LABELS[proceso?.nivel_conseguido] || '—'}</strong>.
          <br />
          En las próximas semanas recibirás un certificado oficial que acredita tu nivel.
        </div>
      )}

      {/* Informe de subsanaciones: visible siempre que exista al menos un
          estándar marcado, tanto para el solicitante (aquí) como para el
          evaluador (misma información se muestra en el panel admin). */}
      {itemsSubsanacion.length > 0 && (
        <div style={{ background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#E65100', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
            ⚠ Informe de subsanaciones ({itemsSubsanacion.length})
          </div>
          {itemsSubsanacion.map((it) => (
            <div key={it.bpId} style={{ fontSize: 12, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #FFE0B2' }}>
              <div style={{ fontWeight: 800, color: '#E65100' }}>{it.bpId} — {it.texto}</div>
              <div style={{ color: '#5D4037', marginTop: 2 }}>{it.nota || 'Sin detalle adicional.'}</div>
            </div>
          ))}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--turq)' }}>
            {s.totalCumpl}/{s.totalActive}
          </div>
          <div className="stat-lbl">Buenas prácticas cumplidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--yellow)' }}>
            {s.esenCumpl}/{s.esenTotal}
          </div>
          <div className="stat-lbl">Esenciales cumplidas</div>
        </div>
      </div>

      <div className="prog-sec">
        <div className="prog-title">Progreso por bloque</div>
        <div className="prog-item">
          <div className="prog-hdr">
            <span className="prog-name">Esenciales</span>
            <span className="prog-pct" style={{ color: 'var(--yellow)' }}>
              {s.pEsen}%
            </span>
          </div>
          <div className="prog-bar">
            <div
              className={`prog-fill ${esenOk ? 'prog-ok' : 'prog-pend'}`}
              style={{ width: `${s.pEsen}%` }}
            ></div>
          </div>
          <div className="prog-req">{esenOk ? '✔ 100% de esenciales cumplidas' : `Faltan ${s.esenTotal - s.esenCumpl} esenciales`}</div>
        </div>
        <div className="prog-item">
          <div className="prog-hdr">
            <span className="prog-name">No esenciales</span>
            <span className="prog-pct" style={{ color: noeColor }}>
              {s.pNoe}%
            </span>
          </div>
          <div className="prog-bar">
            <div
              className="prog-fill"
              style={{ width: `${s.pNoe}%`, background: noeColor }}
            ></div>
          </div>
          <div className="prog-req">{`Avanzado: ≥50% (${need50}/${s.noeTotal}) · Excelente: ≥75% (${need75}/${s.noeTotal})`}</div>
        </div>
      </div>

      <div className="sec-title">Requisitos por nivel</div>
      <div className="req-list">
        {reqs.map((r) => (
          <div key={r.name} className={`req-row ${r.ok ? 'ok' : 'fail'}`}>
            <div className="req-icon">{r.icon}</div>
            <div className="req-text">
              <div className="req-name">{r.name}</div>
              <div className="req-detail">{r.detail}</div>
            </div>
            <div className="req-status">{r.ok ? '✔ OK' : '✖ Pendiente'}</div>
          </div>
        ))}
      </div>

      <div className="legend-card">
        <div className="legend-title">Leyenda</div>
        <div className="legend-row">
          <div className="legend-dot dot-esen"></div>
          <span className="legend-text">Esencial (obligatoria para el Distintivo)</span>
        </div>
        <div className="legend-row">
          <div className="legend-dot dot-noe"></div>
          <span className="legend-text">No esencial (suma para Avanzado y Excelente)</span>
        </div>
        <div className="legend-row">
          <div className="legend-dot dot-esen-esp"></div>
          <span className="legend-text">Esencial específica (Educativo / Sanitario)</span>
        </div>
      </div>

      <button className="exp-btn" onClick={() => exportarPDF(payload)}>
        🖨️ Exportar Resumen (PDF)
      </button>
      <button
        className="exp-btn export-btn-xls"
        style={{ marginTop: 10 }}
        onClick={() => exportarExcel(payload)}
      >
        📊 Exportar Resumen (Excel)
      </button>

      <button className="lock-btn" disabled={!puedeCerrar} onClick={() => setModalOpen(true)}>
        {puedeCerrar
          ? enSubsanacion
            ? '🔒 Volver a cerrar (tras corrección)'
            : '🔒 Cerrar evaluación'
          : '🔒 Evaluación no editable ahora mismo'}
      </button>

      {estadoActual === 'cerrada' && (
        <div className="lock-banner" style={{ display: 'block' }}>
          🔒 Evaluación cerrada el {fmtFecha(lockDate)}. Pendiente de que el equipo evaluador
          la revise.
        </div>
      )}
      {enSubsanacion && (
        <div className="lock-banner" style={{ display: 'block', background: '#FFF3E0', color: '#E65100' }}>
          ⚠ Corrige los estándares señalados arriba y vuelve a cerrar la evaluación cuando
          termines.
        </div>
      )}

      <BrandFooter />

      <div className={`modal-overlay${modalOpen ? ' open' : ''}`}>
        <div className="modal-box">
          <div className="modal-icon">🔒</div>
          <div className="modal-title">¿Cerrar la evaluación?</div>
          <div className="modal-text">
            Al cerrar, <strong>no podrás modificar</strong> las buenas prácticas, las
            observaciones ni los archivos adjuntos. Esta acción no se puede deshacer.
          </div>
          <div className="modal-btns">
            <button className="modal-btn cancel" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="modal-btn confirm" onClick={confirmarCierre}>
              Cerrar evaluación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
