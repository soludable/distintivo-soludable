import { useState } from 'react';
import { calcStats, getNivel } from '../lib/evaluacion.js';
import { exportarPDF } from '../features/export/pdf.js';
import { exportarExcel } from '../features/export/excel.js';
import BrandFooter from './BrandFooter.jsx';

export default function Dashboard({ evalData }) {
  const { state, obs, files, tipo, locked, lockDate, cerrar } = evalData;
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

  function confirmarCierre() {
    cerrar();
    setModalOpen(false);
  }

  const payload = { state, obs, files, tipo };

  return (
    <div className="view active dash">
      <div className="level-card" style={{ background: levelBg }}>
        <div className="lv-label">Nivel del Distintivo</div>
        <div className="lv-val">{s.totalCumpl === 0 ? '— Comienza marcando BPs —' : nv.txt}</div>
        <div className="lv-sub">
          {s.totalCumpl === 0 ? 'Selecciona tu tipo de institución arriba' : nv.sub}
        </div>
      </div>

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

      <button className="lock-btn" disabled={locked} onClick={() => setModalOpen(true)}>
        {locked ? '🔒 Evaluación cerrada' : '🔒 Cerrar evaluación'}
      </button>
      {locked && (
        <div className="lock-banner" style={{ display: 'block' }}>
          🔒 Evaluación cerrada el{' '}
          {lockDate ? new Date(lockDate).toLocaleString('es-ES') : ''}. Ya no se pueden
          modificar las buenas prácticas.
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
