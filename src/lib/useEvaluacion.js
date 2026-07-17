import { useEffect, useRef, useState, useCallback } from 'react';
import * as store from '../lib/dataStore.js';

// Debounce de observaciones por bpId, para no golpear la BD en cada tecla.
const DEBOUNCE_MS = 700;

/**
 * Hook central de la autoevaluación. Única fuente de verdad en la UI.
 *
 * Diseño (Fase E): el tipo de institución queda FIJADO al aprobar la
 * solicitud (proceso.tipo_institucion) — el solicitante ya no puede
 * cambiarlo desde aquí, a diferencia del botón libre que tenía el v6.
 *
 * @param {boolean} enabled - El componente que llama a este hook debe
 *   pasar `true` solo cuando la sesión de Supabase ya está confirmada
 *   y estable (login normal completado, o verifyOtp + contraseña ya
 *   establecida). Antes de eso, el hook no intenta cargar nada.
 *
 *   Motivo: Autoevaluacion.jsx resuelve la sesión de forma asíncrona
 *   (login normal, o verificación de token_hash + SetPassword). Si este
 *   hook lanzaba su fetch nada más montarse, podía adelantarse a ese
 *   proceso y leer todavía la sesión ANTERIOR que quedara en el
 *   navegador (p.ej. de una prueba previa sin cerrar sesión), trayendo
 *   el proceso de otro usuario/cuenta — y al no depender de nada que
 *   cambiase después, se quedaba mostrando esos datos viejos hasta que
 *   el usuario recargaba la página a mano. Al esperar a `enabled`, el
 *   fetch solo arranca una vez la sesión correcta ya está en firme.
 */
export function useEvaluacion(enabled) {
  const [ready, setReady] = useState(false);
  const [proceso, setProceso] = useState(null);
  const [state, setState] = useState({});
  const [obs, setObs] = useState({});
  const [files, setFiles] = useState({});
  // Mapa bp_id -> {aportacionId, requiere, nota}. Solo relevante cuando
  // proceso.estado === 'en_subsanacion': indica qué estándares concretos
  // puede seguir editando el solicitante y con qué nota del evaluador.
  const [subsanacion, setSubsanacion] = useState({});
  const [error, setError] = useState(null);
  const timers = useRef({});

  useEffect(() => {
    if (!enabled) return;

    let cancelado = false;
    (async () => {
      try {
        const p = await store.getMiProceso();
        if (cancelado) return;
        setProceso(p);
        if (p) {
          const ev = await store.getEvaluacion(p.id);
          if (cancelado) return;
          setState(ev.state);
          setObs(ev.obs);
          setFiles(ev.files);
          setSubsanacion(ev.subsanacion || {});
        }
      } catch (e) {
        if (!cancelado) setError(e.message || String(e));
      } finally {
        if (!cancelado) setReady(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [enabled]);

  const tipo = proceso?.tipo_institucion || 'general';

  // `locked` se mantiene como el flag GLOBAL de "¿está todo el proceso
  // abierto para edición general?" — sigue usándose para mostrar/ocultar
  // controles como el botón de cerrar, exportar, etc.
  const locked = proceso ? proceso.estado !== 'en_autoevaluacion' : true;
  const enSubsanacion = proceso?.estado === 'en_subsanacion';
  const lockDate = proceso?.cierre_en || null;

  // Editable POR ESTÁNDAR: en autoevaluación normal, todo es editable;
  // en subsanación, SOLO los estándares que el admin marcó con
  // requiere_subsanacion = true (esto además está reforzado por RLS en
  // servidor — si algo se cuela aquí, la BD lo rechaza igualmente).
  const bpEditable = useCallback(
    (id) => {
      if (!proceso) return false;
      if (proceso.estado === 'en_autoevaluacion') return true;
      if (proceso.estado === 'en_subsanacion') return !!subsanacion[id]?.requiere;
      return false;
    },
    [proceso, subsanacion]
  );

  const toggleBp = useCallback(
    (id) => {
      if (!bpEditable(id) || !proceso) return;
      setState((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        store.upsertAportacion(proceso.id, id, { cumplido: next[id] }).catch((e) =>
          setError(e.message || String(e))
        );
        return next;
      });
    },
    [bpEditable, proceso]
  );

  const setObservacion = useCallback(
    (id, value) => {
      if (!bpEditable(id) || !proceso) return;
      setObs((prev) => ({ ...prev, [id]: value }));

      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        store
          .upsertAportacion(proceso.id, id, { observaciones: value })
          .catch((e) => setError(e.message || String(e)));
      }, DEBOUNCE_MS);
    },
    [bpEditable, proceso]
  );

  const addFile = useCallback(
    async (id, file) => {
      if (!bpEditable(id) || !proceso) return;
      try {
        const meta = await store.subirEvidencia(proceso.id, id, file);
        setFiles((prev) => ({ ...prev, [id]: [...(prev[id] || []), meta] }));
      } catch (e) {
        setError(e.message || String(e));
        throw e;
      }
    },
    [bpEditable, proceso]
  );

  const removeFile = useCallback(
    async (id, evidenciaId) => {
      if (!bpEditable(id) || !proceso) return;
      try {
        const lista = files[id] || [];
        const existing = lista.find((f) => f.evidenciaId === evidenciaId);
        if (existing) await store.eliminarEvidencia(existing.evidenciaId, existing.path);
        setFiles((prev) => ({
          ...prev,
          [id]: (prev[id] || []).filter((f) => f.evidenciaId !== evidenciaId),
        }));
      } catch (e) {
        setError(e.message || String(e));
      }
    },
    [bpEditable, proceso, files]
  );

  // Cierra (o re-cierra, si venimos de subsanación) la evaluación.
  // fn_cerrar_evaluacion en servidor ya acepta ambos estados de origen.
  const cerrar = useCallback(async () => {
    if (!proceso) return;
    try {
      const actualizado = await store.cerrarEvaluacion(proceso.id);
      setProceso(actualizado);
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [proceso]);

  return {
    ready,
    proceso,
    error,
    state,
    obs,
    files,
    subsanacion,
    enSubsanacion,
    bpEditable,
    tipo,
    locked,
    lockDate,
    toggleBp,
    setObservacion,
    addFile,
    removeFile,
    cerrar,
  };
}
