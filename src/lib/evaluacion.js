// Lógica de negocio de la autoevaluación — migrada FIELMENTE del v6.
// Cualquier cambio de reglas debe contrastarse con el Manual de Buenas Prácticas.

import { BPS } from '../data/bps.js';

/** ¿El estándar aplica al tipo de institución actual? (fiel v6) */
export function isActive(bp, tipoActual) {
  if (bp.tipo === 'esen' || bp.tipo === 'noe') return true;
  if (bp.tipo === 'esen-edu') return tipoActual === 'educativo';
  if (bp.tipo === 'esen-san') return tipoActual === 'sanitario';
  if (bp.tipo === 'noe-san') return tipoActual === 'sanitario';
  return true;
}

/** ¿El estándar es esencial para el tipo actual? (fiel v6) */
export function isEsencial(bp, tipoActual) {
  if (bp.tipo === 'esen') return true;
  if (bp.tipo === 'esen-edu' && tipoActual === 'educativo') return true;
  if (bp.tipo === 'esen-san' && tipoActual === 'sanitario') return true;
  return false;
}

/** Estadísticas de cumplimiento (fiel v6). state = { [bpId]: boolean } */
export function calcStats(state, tipoActual) {
  const activeBps = BPS.filter((bp) => isActive(bp, tipoActual));
  const esenBps = activeBps.filter((bp) => isEsencial(bp, tipoActual));
  const noeBps = activeBps.filter((bp) => !isEsencial(bp, tipoActual));

  const esenTotal = esenBps.length;
  const noeTotal = noeBps.length;
  const esenCumpl = esenBps.filter((bp) => state[bp.id]).length;
  const noeCumpl = noeBps.filter((bp) => state[bp.id]).length;
  const totalCumpl = activeBps.filter((bp) => state[bp.id]).length;

  const pEsen = esenTotal > 0 ? Math.round((esenCumpl / esenTotal) * 100) : 0;
  const pNoe = noeTotal > 0 ? Math.round((noeCumpl / noeTotal) * 100) : 0;

  return {
    esenTotal,
    noeTotal,
    esenCumpl,
    noeCumpl,
    totalCumpl,
    totalActive: activeBps.length,
    pEsen,
    pNoe,
  };
}

/** Nivel alcanzado (fiel v6): 100% esenciales; Avanzado ≥50% noe; Excelente ≥75% noe. */
export function getNivel(s) {
  const esenOk = s.esenCumpl === s.esenTotal && s.esenTotal > 0;
  if (!esenOk)
    return {
      txt: '⚠ Sin nivel',
      color: '#BDBDBD',
      sub: `Esenciales: ${s.esenCumpl}/${s.esenTotal} — necesitas cumplir el 100%`,
    };
  if (s.pNoe >= 75)
    return {
      txt: '⭐ EXCELENTE',
      color: '#F5C800',
      sub: '¡Nivel Excelente alcanzado! No esenciales: ' + s.pNoe + '% (≥75%)',
    };
  if (s.pNoe >= 50)
    return {
      txt: '🏅 AVANZADO',
      color: '#00B8C8',
      sub:
        'Nivel Avanzado. Para Excelente necesitas ≥75% no esenciales (' +
        s.noeTotal +
        ' total)',
    };
  return {
    txt: '📋 Esenciales OK',
    color: '#4CAF50',
    sub: `Esenciales completas. Para Avanzado necesitas ≥50% no esenciales (${Math.ceil(
      s.noeTotal * 0.5
    )} de ${s.noeTotal})`,
  };
}

/**
 * Código estable del nivel (para guardar en BD vía fn_evaluacion_final).
 * NO cambia las reglas de negocio — solo traduce el mismo resultado de
 * getNivel() a uno de los 4 códigos que acepta la BD: 'sin_nivel',
 * 'esenciales_ok', 'avanzado', 'excelente'.
 */
export function getNivelCodigo(s) {
  const esenOk = s.esenCumpl === s.esenTotal && s.esenTotal > 0;
  if (!esenOk) return 'sin_nivel';
  if (s.pNoe >= 75) return 'excelente';
  if (s.pNoe >= 50) return 'avanzado';
  return 'esenciales_ok';
}

/** Etiquetas legibles de cada código de nivel, para mostrar en UI. */
export const NIVEL_LABELS = {
  sin_nivel: '⚠ Sin nivel',
  esenciales_ok: '📋 Esenciales OK',
  avanzado: '🏅 AVANZADO',
  excelente: '⭐ EXCELENTE',
};
