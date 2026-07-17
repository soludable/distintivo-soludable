// Helper compartido: borra en cascada TODO lo relacionado con un
// proceso (evidencias en Storage + filas de evidencias/aportaciones +
// el propio proceso). Usado tanto por borrar-proceso como por
// borrar-solicitud (cuando la solicitud ya tiene un proceso vinculado
// y hay que quitarlo primero por la restricción de clave foránea
// procesos_solicitud_id_fkey, que es NO ACTION — Postgres no deja
// borrar la solicitud si un proceso sigue apuntando a ella).

const BUCKET = 'evidencias';

export async function borrarProcesoCascada(adminClient, procesoId) {
  const { data: aportaciones, error: errAport } = await adminClient
    .from('aportaciones')
    .select('id')
    .eq('proceso_id', procesoId);
  if (errAport) throw errAport;

  const aportacionIds = (aportaciones || []).map((a) => a.id);
  let evidenciasBorradas = 0;

  if (aportacionIds.length > 0) {
    const { data: evidencias, error: errEvid } = await adminClient
      .from('evidencias')
      .select('id, storage_path')
      .in('aportacion_id', aportacionIds);
    if (errEvid) throw errEvid;

    const rutas = (evidencias || []).map((e) => e.storage_path).filter(Boolean);
    evidenciasBorradas = evidencias?.length || 0;

    if (rutas.length > 0) {
      const { error: errRemove } = await adminClient.storage.from(BUCKET).remove(rutas);
      // No abortamos si falla el borrado de algún archivo huérfano en
      // Storage; seguimos con el borrado de BD, que es lo prioritario.
      if (errRemove) {
        console.error('[borrarProcesoCascada] error borrando de Storage:', errRemove.message);
      }
    }

    const { error: errDelEvid } = await adminClient
      .from('evidencias')
      .delete()
      .in('aportacion_id', aportacionIds);
    if (errDelEvid) throw errDelEvid;
  }

  const { error: errDelAport } = await adminClient
    .from('aportaciones')
    .delete()
    .eq('proceso_id', procesoId);
  if (errDelAport) throw errDelAport;

  const { error: errDelProceso } = await adminClient.from('procesos').delete().eq('id', procesoId);
  if (errDelProceso) throw errDelProceso;

  return {
    aportaciones_borradas: aportacionIds.length,
    evidencias_borradas: evidenciasBorradas,
  };
}
