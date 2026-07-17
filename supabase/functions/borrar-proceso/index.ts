// Edge Function: borrar-proceso
//
// Borrado FÍSICO e IRREVERSIBLE de un proceso completo: evidencias
// (Storage + BD), aportaciones y el propio proceso. Pensado para
// limpieza de pruebas — el frontend debe exigir doble confirmación
// (escribir "BORRAR" a mano) antes de llamar a esta función.
//
// Requiere clave de servicio porque el borrado de archivos en Storage
// no puede hacerse desde una simple RPC de SQL.

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

    const { proceso_id } = await req.json();
    if (!proceso_id) return jsonResponse(400, { error: 'Falta proceso_id' });

    // Cliente "como quien llama" — solo para comprobar que es admin,
    // respetando RLS de verdad (no nos fiamos de nada del cliente).
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
      return jsonResponse(403, { error: 'Solo un administrador puede borrar un proceso' });
    }

    // A partir de aquí, cliente con clave de servicio: salta RLS
    // porque el borrado en cascada necesita tocar filas de otros
    // usuarios (el titular del proceso), no solo las del admin.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: proceso, error: errProceso } = await adminClient
      .from('procesos')
      .select('id, num_identificativo')
      .eq('id', proceso_id)
      .single();
    if (errProceso || !proceso) {
      return jsonResponse(404, { error: 'Proceso no encontrado' });
    }

    const resultado = await borrarProcesoCascada(adminClient, proceso_id);

    return jsonResponse(200, {
      ok: true,
      num_identificativo: proceso.num_identificativo,
      ...resultado,
    });
  } catch (e) {
    return jsonResponse(400, { error: e.message || String(e) });
  }
});
