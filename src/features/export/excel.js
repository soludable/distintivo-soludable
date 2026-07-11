// Export Excel fiel al v6, con SheetJS importado por npm (antes CDN).
import * as XLSX from 'xlsx';
import { BPS, DIM_NAMES } from '../../data/bps.js';
import { isActive, isEsencial, calcStats, getNivel } from '../../lib/evaluacion.js';

export function exportarExcel({ state, obs, files, tipo }) {
  const s = calcStats(state, tipo);
  const nv = getNivel(s);
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const tipos = { general: 'General', educativo: 'Educativo', sanitario: 'Sanitario' };

  const rows = [];
  BPS.forEach((bp) => {
    if (!isActive(bp, tipo)) return;
    rows.push({
      Código: bp.id,
      Dimensión: DIM_NAMES[bp.dim],
      Tipo: isEsencial(bp, tipo) ? 'Esencial' : 'No esencial',
      'Buena práctica': bp.text,
      Propósito: bp.proposito,
      'Criterios de evaluación': bp.criterios,
      'Evidencias requeridas': bp.evidencias,
      Estado: state[bp.id] ? 'Cumplida' : 'Pendiente',
      'Notas / aportaciones': obs[bp.id] ? obs[bp.id].trim() : '',
      'Archivos adjuntos': (files[bp.id] || []).map((f) => f.name).join('; '),
    });
  });

  const wb = XLSX.utils.book_new();

  const resumenData = [
    ['RESUMEN DE AUTOEVALUACIÓN · DISTINTIVO SOLUDABLE'],
    ['Fotoprotección y Prevención del Cáncer de Piel'],
    [],
    ['Tipo de institución', tipos[tipo]],
    ['Fecha', fecha],
    ['Nivel alcanzado', nv.txt.replace(/[⚠⭐🏅📋]/g, '').trim()],
    ['Detalle', nv.sub],
    [],
    ['Esenciales cumplidas', `${s.esenCumpl}/${s.esenTotal}`],
    ['No esenciales cumplidas', `${s.noeCumpl}/${s.noeTotal} (${s.pNoe}%)`],
    ['Total cumplidas', `${s.totalCumpl}/${s.totalActive}`],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  wsResumen['!cols'] = [{ wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  const wsBps = XLSX.utils.json_to_sheet(rows);
  wsBps['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 14 },
    { wch: 50 },
    { wch: 45 },
    { wch: 55 },
    { wch: 45 },
    { wch: 12 },
    { wch: 40 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBps, 'Estándares y aportaciones');

  const fname = `Distintivo_Soludable_${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fname);
}
