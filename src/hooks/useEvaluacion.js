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
  const locked = proceso ? proceso.estado !== 'en_autoevaluacion' : true;
  const lockDate = proceso?.cierre_en || null;

  const toggleBp = useCallback(
    (id) => {
      if (locked || !proceso) return;
      setState((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        store.upsertAportacion(proceso.id, id, { cumplido: next[id] }).catch((e) =>
          setError(e.message || String(e))
        );
        return next;
      });
    },
    [locked, proceso]
  );

  const setObservacion = useCallback(
    (id, value) => {
      if (locked || !proceso) return;
      setObs((prev) => ({ ...prev, [id]: value }));

      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        store
          .upsertAportacion(proceso.id, id, { observaciones: value })
          .catch((e) => setError(e.message || String(e)));
      }, DEBOUNCE_MS);
    },
    [locked, proceso]
  );

  const addFile = useCallback(
    async (id, file) => {
      if (locked || !proceso) return;
      try {
        const meta = await store.subirEvidencia(proceso.id, id, file);
        setFiles((prev) => ({ ...prev, [id]: [...(prev[id] || []), meta] }));
      } catch (e) {
        setError(e.message || String(e));
        throw e;
      }
    },
    [locked, proceso]
  );

  const removeFile = useCallback(
    async (id, evidenciaId) => {
      if (locked || !proceso) return;
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
    [locked, proceso, files]
  );

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
