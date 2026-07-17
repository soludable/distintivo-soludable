// ─────────────────────────────────────────────────────────────
// dataStore.js — CAPA DE DATOS ÚNICA (Fase E: Supabase real)
//
// Regla del proyecto: NINGÚN componente accede a Supabase directamente.
// Todo pasa por aquí. Sustituye a la versión localStorage de Fases A-C.
//
// NOTA DE DISEÑO IMPORTANTE (verificado contra el esquema real):
// el INSERT anónimo de una solicitud NUNCA debe encadenar `.select()`
// — Postgres exige que la fila devuelta cumpla también la política de
// SELECT (admin-only), así que un insert+select como anon rompe por RLS.
// Por eso el id de la solicitud se genera aquí, en el cliente, con
// crypto.randomUUID(), y el insert se hace "a ciegas".
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabaseClient.js';
import { BPS } from '../data/bps.js';

const BUCKET = 'evidencias';

// ── Auth ──────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Suscripción a cambios de sesión (login, logout, y el establecimiento
// asíncrono de sesión al llegar desde un enlace de invitación/recuperación
// del email). Devuelve la función para cancelar la suscripción.
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}

export async function getMiRol() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (error) return null;
  return data.role; // 'solicitante' | 'admin'
}

// Escucha cambios de sesión — en particular el evento PASSWORD_RECOVERY,
// que supabase-js dispara solo al detectar un enlace de invitación o
// recuperación en la URL. Se usa para mostrar la pantalla de "crea tu
// contraseña" en vez del login normal.
export async function actualizarPassword(nuevaPassword) {
  const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
  if (error) throw error;
}

// Verifica el token_hash de nuestro propio enlace (ver nota en la Edge
// Function aprobar-solicitud sobre por qué no usamos el action_link de
// Supabase directamente). Esto establece la sesión de verdad.
export async function verificarTokenAcceso(tokenHash, type) {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) throw error;
  return data;
}

// ── Solicitud (formulario público) ───────────────────────────

// Traduce los campos camelCase del formulario a las columnas snake_case
// reales de la tabla `solicitudes`. NO incluye tipo_derivado (lo calcula
// un trigger en servidor) ni estado (por defecto 'solicitada').
function mapSolicitudToRow(s) {
  return {
    centro_nombre: s.centroNombre || null,
    categoria: s.categoria,
    categoria_otros: s.categoriaOtros || null,
    direccion: s.direccion,
    codigo_postal: s.codigoPostal,
    provincia_id: s.provincia,
    municipio_ine: s.municipio,
    localidad: s.localidad || null,
    cif: s.cif,
    rl_tratamiento: s.rlTratamiento,
    rl_nombre: s.rlNombre,
    rl_apellido1: s.rlApellido1,
    rl_apellido2: s.rlApellido2 || null,
    rl_tipo_doc: s.rlTipoDoc,
    rl_documento: s.rlDocumento,
    rl_correo: s.rlCorreo,
    rl_telefono: s.rlTelefono || null,
    rl_cargo: s.rlCargo,
    ra_tratamiento: s.raTratamiento,
    ra_nombre: s.raNombre,
    ra_apellido1: s.raApellido1,
    ra_apellido2: s.raApellido2 || null,
    ra_tipo_doc: s.raTipoDoc,
    ra_documento: s.raDocumento,
    ra_correo: s.raCorreo,
    ra_telefono: s.raTelefono || null,
    ra_cargo: s.raCargo,
  };
}

export async function crearSolicitud(solicitud) {
  const id = crypto.randomUUID();
  const row = { id, ...mapSolicitudToRow(solicitud) };

  // Importante: SIN .select() (ver nota de diseño arriba).
  const { error } = await supabase.from('solicitudes').insert(row);
  if (error) throw error;

  return { id };
}

// ── Catálogo geográfico (para los selects dependientes) ──────

export async function getProvincias() {
  const { data, error } = await supabase
    .from('provincias')
    .select('id, nombre')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function getMunicipios(provinciaId) {
  if (!provinciaId) return [];
  const { data, error } = await supabase
    .from('municipios')
    .select('ine, nombre')
    .eq('provincia_id', provinciaId)
    .order('nombre');
  if (error) throw error;
  return data;
}

// ── Admin: solicitudes y procesos ────────────────────────────

export async function getSolicitudes() {
  const { data, error } = await supabase
    .from('solicitudes')
    .select('*, provincias(nombre), municipios(nombre)')
    .order('creada_en', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProcesos() {
  const { data, error } = await supabase
    .from('procesos')
    .select('*')
    .order('creado_en', { ascending: false });
  if (error) throw error;
  return data;
}

// Aprobar ahora hace TODO en un paso (Edge Function): aprueba, crea la
// cuenta del solicitante, la vincula al proceso y envía el email con el
// enlace de acceso. Sustituye al flujo manual de Fase E1/E2.
export async function aprobarSolicitud(solicitudId, tipoOverride = null) {
  const { data, error } = await supabase.functions.invoke('aprobar-solicitud', {
    body: { solicitud_id: solicitudId, tipo_override: tipoOverride },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Se mantiene por si hiciera falta vincular a mano en algún caso raro
// (ej. el email de invitación se perdió y hay que reenlazar manualmente).
export async function vincularProcesoUsuario(procesoId, email) {
  const { data, error } = await supabase.rpc('fn_vincular_proceso_usuario', {
    p_proceso_id: procesoId,
    p_email: email,
  });
  if (error) throw error;
  return data;
}

export async function rechazarSolicitud(solicitudId, motivo = null) {
  const { data, error } = await supabase.functions.invoke('rechazar-solicitud', {
    body: { solicitud_id: solicitudId, motivo },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Admin: máquina de estados de evaluación ──────────────────

// cerrada -> en_evaluacion (el admin empieza a revisar).
export async function iniciarEvaluacion(procesoId) {
  const { data, error } = await supabase.rpc('fn_iniciar_evaluacion', {
    p_proceso_id: procesoId,
  });
  if (error) throw error;
  return data;
}

// Marca (o desmarca) un estándar concreto como "requiere subsanación",
// con la nota explicando qué debe corregir el solicitante. Se hace con
// un UPDATE normal (no RPC) porque la política RLS ya permite a un
// admin editar aportaciones sin restricción (is_admin() en la policy).
export async function marcarSubsanacionAportacion(aportacionId, requiere, nota) {
  const { error } = await supabase
    .from('aportaciones')
    .update({ requiere_subsanacion: requiere, nota_subsanacion: nota ?? null })
    .eq('id', aportacionId);
  if (error) throw error;
}

// en_evaluacion -> en_subsanacion (exige al menos un estándar marcado).
// Edge Function: hace la transición Y envía el email con el detalle de
// qué debe corregir el solicitante, en un solo paso.
export async function enviarASubsanacion(procesoId) {
  const { data, error } = await supabase.functions.invoke('enviar-subsanacion', {
    body: { proceso_id: procesoId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// en_evaluacion -> en_revision_final, con el nivel conseguido.
// nivelCodigo debe ser uno de: 'sin_nivel' | 'esenciales_ok' | 'avanzado' | 'excelente'
// Edge Function: hace la transición Y envía el email anunciando el
// nivel conseguido y el aviso del certificado oficial, en un solo paso.
export async function evaluacionFinal(procesoId, nivelCodigo) {
  const { data, error } = await supabase.functions.invoke('evaluacion-final', {
    body: { proceso_id: procesoId, nivel: nivelCodigo },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Reapertura excepcional: vuelve el proceso a 'en_autoevaluacion' desde
// cualquier estado, y resetea las marcas de cierre/evaluación final.
export async function reabrirProceso(procesoId) {
  const { data, error } = await supabase.rpc('fn_reabrir_proceso', {
    p_proceso_id: procesoId,
  });
  if (error) throw error;
  return data;
}

// Borrado físico e irreversible de un proceso completo (evidencias +
// aportaciones + proceso). Pensado para limpieza de pruebas. El
// componente que llame a esto DEBE pedir doble confirmación antes.
export async function borrarProceso(procesoId) {
  const { data, error } = await supabase.functions.invoke('borrar-proceso', {
    body: { proceso_id: procesoId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Borrado físico e irreversible de una SOLICITUD. Si ya tiene un
// proceso vinculado, ese proceso (con su cascada completa) se borra
// primero en servidor — la FK procesos_solicitud_id_fkey es NO ACTION
// y bloquearía el borrado si no. El componente que llame a esto DEBE
// pedir doble confirmación antes, igual que con borrarProceso.
export async function borrarSolicitud(solicitudId) {
  const { data, error } = await supabase.functions.invoke('borrar-solicitud', {
    body: { solicitud_id: solicitudId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Autoevaluación (solicitante autenticado) ─────────────────

// Asunción de diseño (Fase E): cada solicitante tiene UN proceso activo,
// localizado por usuario_id = su propio auth.uid(). Si en el futuro un
// mismo centro repite proceso (ej. año siguiente), esto habrá que
// revisarlo — no se decide aquí en silencio.
export async function getMiProceso() {
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('procesos')
    .select('*')
    .eq('usuario_id', session.user.id)
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Carga aportaciones + evidencias del proceso y las adapta a la forma
// {state, obs, files, subsanacion} que conocen los componentes (BpCard,
// Dashboard). `subsanacion` es nuevo: mapa bp_id -> {aportacionId,
// requiere, nota}, usado tanto por el panel admin (para marcar/leer
// qué hay que corregir) como por la autoevaluación del solicitante
// (para saber qué estándares puede tocar durante 'en_subsanacion').
export async function getEvaluacion(procesoId) {
  const { data, error } = await supabase
    .from('aportaciones')
    .select(
      'id, bp_id, cumplido, observaciones, requiere_subsanacion, nota_subsanacion, evidencias(id, storage_path, filename, size)'
    )
    .eq('proceso_id', procesoId);
  if (error) throw error;

  const state = {};
  const obs = {};
  const files = {};
  const subsanacion = {};
  for (const row of data) {
    state[row.bp_id] = row.cumplido;
    obs[row.bp_id] = row.observaciones || '';
    files[row.bp_id] = (row.evidencias || []).map((ev) => ({
      evidenciaId: ev.id,
      name: ev.filename,
      size: ev.size,
      path: ev.storage_path,
    }));
    subsanacion[row.bp_id] = {
      aportacionId: row.id,
      requiere: !!row.requiere_subsanacion,
      nota: row.nota_subsanacion || '',
    };
  }
  return { state, obs, files, subsanacion };
}

// Upsert de una aportación (marcar/desmarcar cumplido y/o observaciones).
export async function upsertAportacion(procesoId, bpId, { cumplido, observaciones }) {
  const patch = { proceso_id: procesoId, bp_id: bpId };
  if (cumplido !== undefined) patch.cumplido = cumplido;
  if (observaciones !== undefined) patch.observaciones = observaciones;

  const { data, error } = await supabase
    .from('aportaciones')
    .upsert(patch, { onConflict: 'proceso_id,bp_id' })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

// Sube un PDF de evidencia a Storage y registra su metadato. Se pueden
// subir VARIOS por estándar (hasta MAX_ARCHIVOS_POR_BP) — el prefijo
// aleatorio evita que dos archivos con el mismo nombre se pisen entre sí.
// Ruta: {uid}/{proceso_id}/{bp_id}/{prefijo}-{filename} — el primer
// segmento debe ser el propio uid, así lo exige la política de Storage.
export async function subirEvidencia(procesoId, bpId, file) {
  const session = await getSession();
  if (!session) throw new Error('No hay sesión activa');

  const aportacion = await upsertAportacion(procesoId, bpId, {});
  const prefijo = crypto.randomUUID().slice(0, 8);
  const path = `${session.user.id}/${procesoId}/${bpId}/${prefijo}-${file.name}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('evidencias')
    .insert({
      aportacion_id: aportacion.id,
      storage_path: path,
      filename: file.name,
      size: file.size,
    })
    .select('id')
    .single();
  if (error) throw error;

  return { evidenciaId: data.id, name: file.name, size: file.size, path };
}

export async function eliminarEvidencia(evidenciaId, storagePath) {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from('evidencias').delete().eq('id', evidenciaId);
  if (error) throw error;
}

// URL firmada temporal para ver el PDF (bucket privado).
export async function getUrlEvidencia(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 120); // 2 minutos
  if (error) throw error;
  return data.signedUrl;
}

export async function cerrarEvaluacion(procesoId) {
  const { data, error } = await supabase.rpc('fn_cerrar_evaluacion', {
    p_proceso_id: procesoId,
  });
  if (error) throw error;
  return data;
}

// Lista de ids válidos, útil para validar antes de tocar la BD.
export const BP_IDS_VALIDOS = BPS.map((b) => b.id);
