// Export PDF fiel al v6: genera HTML de resumen y lanza window.print().
import { BPS, DIM_NAMES } from '../../data/bps.js';
import { isActive, isEsencial, calcStats, getNivel } from '../../lib/evaluacion.js';
import { FOOTER_TEXT } from '../../lib/constants.js';

function esc(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

export function exportarPDF({ state, obs, files, tipo }) {
  const s = calcStats(state, tipo);
  const nv = getNivel(s);
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const tipos = { general: 'General', educativo: 'Educativo', sanitario: 'Sanitario' };

  const cumplidas = [];
  const noCumplidas = [];

  BPS.forEach((bp) => {
    if (!isActive(bp, tipo)) return;
    const esenMark = isEsencial(bp, tipo)
      ? ' <span class="pdf-esen-tag">ESENCIAL</span>'
      : '';
    const notas =
      obs[bp.id] && obs[bp.id].trim()
        ? `<div class="pdf-notas">📝 ${esc(obs[bp.id].trim())}</div>`
        : '';
    const adj =
      files[bp.id] && files[bp.id].length > 0
        ? files[bp.id]
            .map((f) => `<div class="pdf-adj">📎 Adjunto: ${esc(f.name)} (${fmtBytes(f.size)})</div>`)
            .join('')
        : '';
    const row = `
      <div class="pdf-bp-row">
        <div class="pdf-bp-head"><strong>${bp.id}</strong>${esenMark} — ${DIM_NAMES[bp.dim]}</div>
        <div class="pdf-bp-text">${esc(bp.text)}</div>
        ${notas}${adj}
      </div>`;
    if (state[bp.id]) cumplidas.push(row);
    else noCumplidas.push(row);
  });

  const reqEsenOk = s.esenCumpl === s.esenTotal;
  const reqAvOk = reqEsenOk && s.pNoe >= 50;
  const reqExOk = reqEsenOk && s.pNoe >= 75;
  const logoUrl = `${location.origin}/assets/logo-soludable.png`;
  const brandUrl = `${location.origin}/assets/logo-doncelproject.png`;

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Resumen Distintivo Soludable</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Nunito', Arial, sans-serif; color: #2C2C2C; margin: 0; padding: 28px; }
  .pdf-header { display:flex; align-items:center; gap:14px; border-bottom: 4px solid #00B8C8; padding-bottom: 14px; margin-bottom: 18px; }
  .pdf-header img { height: 46px; }
  .pdf-title { font-size: 15px; font-weight: 900; color:#006B7C; }
  .pdf-sub { font-size: 11px; color:#888; margin-top:2px; }
  .pdf-meta { display:flex; justify-content:space-between; font-size:12px; color:#555; margin-bottom:16px; background:#F5F5F5; padding:10px 14px; border-radius:10px; }
  .pdf-level { background:#00B8C8; color:white; border-radius:12px; padding:16px 18px; margin-bottom:18px; }
  .pdf-level .lv-l { font-size:10px; text-transform:uppercase; letter-spacing:.1em; opacity:.85; }
  .pdf-level .lv-v { font-size:20px; font-weight:900; margin-top:4px; }
  .pdf-level .lv-s { font-size:11px; opacity:.9; margin-top:4px; }
  .pdf-reqs { display:flex; gap:10px; margin-bottom:20px; }
  .pdf-req { flex:1; border-radius:10px; padding:10px 12px; font-size:11px; font-weight:700; border-left:4px solid #BDBDBD; background:#FAFAFA; }
  .pdf-req.ok { border-left-color:#4CAF50; background:#F1F8F1; }
  .pdf-req .rq-t { font-size:10px; text-transform:uppercase; color:#888; letter-spacing:.05em; margin-bottom:3px; }
  .pdf-req.ok .rq-s { color:#4CAF50; } .pdf-req:not(.ok) .rq-s { color:#BDBDBD; }
  .pdf-section-title { font-size:13px; font-weight:900; margin: 22px 0 10px; padding-bottom:6px; border-bottom: 2px solid #EEE; }
  .pdf-section-title.ok { color:#2E7D32; border-bottom-color:#A5D6A7; }
  .pdf-section-title.no { color:#9E5400; border-bottom-color:#FFCC80; }
  .pdf-bp-row { padding: 9px 12px; margin-bottom: 7px; border-radius: 8px; border:1px solid #EEE; page-break-inside: avoid; }
  .pdf-bp-row.is-ok { background:#F4FBF4; border-color:#C8E6C9; }
  .pdf-bp-row.is-no { background:#FFFBF2; border-color:#FFE0B2; }
  .pdf-bp-head { font-size:11px; color:#666; margin-bottom:3px; }
  .pdf-bp-text { font-size:12px; font-weight:600; line-height:1.4; }
  .pdf-notas { font-size:11px; color:#555; margin-top:5px; background:white; padding:6px 9px; border-radius:6px; }
  .pdf-adj { font-size:11px; color:#006B7C; margin-top:4px; font-weight:700; }
  .pdf-esen-tag { background:#F5C800; color:white; font-size:9px; font-weight:800; padding:1px 6px; border-radius:5px; margin-left:4px; }
  .pdf-footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #EEE; font-size: 10px; color: #999; text-align:center; }
  .pdf-brand { margin-top: 10px; text-align:center; }
  .pdf-brand img { height: 20px; opacity:.7; }
  .pdf-brand div { font-size: 9px; color: #aaa; font-weight:700; margin-top:3px; }
  @media print { body { padding: 12px; } }
</style></head>
<body>
  <div class="pdf-header">
    <img src="${logoUrl}" alt="Soludable">
    <div>
      <div class="pdf-title">RESUMEN DE AUTOEVALUACIÓN · DISTINTIVO SOLUDABLE</div>
      <div class="pdf-sub">Fotoprotección y Prevención del Cáncer de Piel</div>
    </div>
  </div>

  <div class="pdf-meta">
    <span><strong>Tipo de institución:</strong> ${tipos[tipo]}</span>
    <span><strong>Fecha:</strong> ${fecha}</span>
  </div>

  <div class="pdf-level">
    <div class="lv-l">Nivel del Distintivo</div>
    <div class="lv-v">${nv.txt}</div>
    <div class="lv-s">${nv.sub}</div>
  </div>

  <div class="pdf-reqs">
    <div class="pdf-req ${reqEsenOk ? 'ok' : ''}">
      <div class="rq-t">Esenciales 100%</div>
      ${s.esenCumpl}/${s.esenTotal} <span class="rq-s">${reqEsenOk ? '✔ Cumple' : '✖ Falta'}</span>
    </div>
    <div class="pdf-req ${reqAvOk ? 'ok' : ''}">
      <div class="rq-t">Avanzado (≥50% no esen.)</div>
      ${s.pNoe}% <span class="rq-s">${reqAvOk ? '✔ Cumple' : '✖ Falta'}</span>
    </div>
    <div class="pdf-req ${reqExOk ? 'ok' : ''}">
      <div class="rq-t">Excelente (≥75% no esen.)</div>
      ${s.pNoe}% <span class="rq-s">${reqExOk ? '✔ Cumple' : '✖ Falta'}</span>
    </div>
  </div>

  <div class="pdf-section-title ok">✔ Buenas prácticas CUMPLIDAS (${cumplidas.length})</div>
  ${
    cumplidas.map((r) => r.replace('pdf-bp-row', 'pdf-bp-row is-ok')).join('') ||
    '<p style="font-size:12px;color:#999;">Ninguna registrada todavía.</p>'
  }

  <div class="pdf-section-title no">✖ Buenas prácticas PENDIENTES (${noCumplidas.length})</div>
  ${
    noCumplidas.map((r) => r.replace('pdf-bp-row', 'pdf-bp-row is-no')).join('') ||
    '<p style="font-size:12px;color:#999;">¡Todas las buenas prácticas aplicables están cumplidas!</p>'
  }

  <div class="pdf-footer">
    Documento generado automáticamente por la app de seguimiento del Distintivo Soludable · Hospital Universitario Costa del Sol · ${fecha}
    <div class="pdf-brand">
      <img src="${brandUrl}" alt="DoncelProject">
      <div>${FOOTER_TEXT}</div>
    </div>
  </div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = function () {
    win.focus();
    win.print();
  };
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* noop */
    }
  }, 600);
}
