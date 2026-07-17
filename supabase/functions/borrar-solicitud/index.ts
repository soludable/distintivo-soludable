// Edge Function: borrar-solicitud
//
// Borrado FÍSICO e IRREVERSIBLE de una solicitud. Si la solicitud ya
// tiene un proceso de acreditación aprobado vinculado, ese proceso
// (con sus aportaciones/evidencias) se borra PRIMERO — la restricción
// procesos_solicitud_id_fkey es NO ACTION, así que Postgres no deja
// borrar la solicitud mientras un proceso siga apuntando a ella.
//
// Pensado para limpieza de pruebas — el frontend debe exigir doble
// confirmación (escribir "BORRAR" a mano) antes de llamar aquí.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { borrarProcesoCascada } from '../_shared/borrarProcesoCascada.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse(401, { error: 'Falta cabecera Authorization' });

    const { solicitud_id } = await req.json();
    if (!solicitud_id) return jsonResponse(400, { error: 'Falta solicitud_id' });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: errUser } = await userClient.auth.getUser();
    if (errUser || !userData?.user) {
      return jsonResponse(401, { error: 'No se pudo identificar al usuario' });
    }

    const { data: perfil, error: errPerfil } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
    if (errPerfil || perfil?.role !== 'admin') {
      return jsonResponse(403, { error: 'Solo un administrador puede borrar una solicitud' });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: solicitud, error: errSol } = await adminClient
      .from('solicitudes')
      .select('id, centro_nombre, num_identificativo')
      .eq('id', solicitud_id)
      .single();
    if (errSol || !solicitud) {
      return jsonResponse(404, { error: 'Solicitud no encontrada' });
    }

    // ¿Tiene un proceso de acreditación vinculado? Si lo tiene, hay que
    // borrarlo primero (con su cascada completa) o la clave foránea
    // procesos_solicitud_id_fkey (NO ACTION) bloqueará el borrado.
    const { data: procesoVinculado, error: errProc } = await adminClient
      .from('procesos')
      .select('id, num_identificativo')
      .eq('solicitud_id', solicitud_id)
      .maybeSingle();
    if (errProc) throw errProc;

    let resultadoProceso = { aportaciones_borradas: 0, evidencias_borradas: 0 };
    if (procesoVinculado) {
      resultadoProceso = await borrarProcesoCascada(adminClient, procesoVinculado.id);
    }

    const { error: errDelSol } = await adminClient.from('solicitudes').delete().eq('id', solicitud_id);
    if (errDelSol) throw errDelSol;

    return jsonResponse(200, {
      ok: true,
      centro_nombre: solicitud.centro_nombre,
      proceso_borrado: !!procesoVinculado,
      ...resultadoProceso,
    });
  } catch (e) {
    return jsonResponse(400, { error: e.message || String(e) });
  }
});
