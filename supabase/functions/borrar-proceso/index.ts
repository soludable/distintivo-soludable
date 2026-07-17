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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const BUCKET = 'evidencias';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta cabecera Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { proceso_id } = await req.json();
    if (!proceso_id) {
      return new Response(JSON.stringify({ error: 'Falta proceso_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente "como quien llama" — solo para comprobar que es admin,
    // respetando RLS de verdad (no nos fiamos de nada del cliente).
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: errUser } = await userClient.auth.getUser();
    if (errUser || !userData?.user) {
      return new Response(JSON.stringify({ error: 'No se pudo identificar al usuario' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: perfil, error: errPerfil } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
    if (errPerfil || perfil?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo un administrador puede borrar un proceso' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // A partir de aquí, cliente con clave de servicio: salta RLS
    // porque el borrado en cascada necesita tocar filas de otros
    // usuarios (el titular del proceso), no solo las del admin.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Confirmar que el proceso existe antes de nada.
    const { data: proceso, error: errProceso } = await adminClient
      .from('procesos')
      .select('id, num_identificativo')
      .eq('id', proceso_id)
      .single();
    if (errProceso || !proceso) {
      return new Response(JSON.stringify({ error: 'Proceso no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Recoger las rutas de Storage de todas las evidencias del proceso.
    const { data: aportaciones, error: errAport } = await adminClient
      .from('aportaciones')
      .select('id')
      .eq('proceso_id', proceso_id);
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

      // 2. Borrar los archivos físicos de Storage (si hay alguno).
      if (rutas.length > 0) {
        const { error: errRemove } = await adminClient.storage.from(BUCKET).remove(rutas);
        // No abortamos si falla el borrado de algún archivo huérfano;
        // lo registramos pero seguimos con el borrado de BD, que es
        // lo más importante para dejar el proceso limpio.
        if (errRemove) {
          console.error('[borrar-proceso] error borrando de Storage:', errRemove.message);
        }
      }

      // 3. Borrar filas de evidencias.
      const { error: errDelEvid } = await adminClient
        .from('evidencias')
        .delete()
        .in('aportacion_id', aportacionIds);
      if (errDelEvid) throw errDelEvid;
    }

    // 4. Borrar aportaciones.
    const { error: errDelAport } = await adminClient
      .from('aportaciones')
      .delete()
      .eq('proceso_id', proceso_id);
    if (errDelAport) throw errDelAport;

    // 5. Borrar el proceso.
    const { error: errDelProceso } = await adminClient
      .from('procesos')
      .delete()
      .eq('id', proceso_id);
    if (errDelProceso) throw errDelProceso;

    return new Response(
      JSON.stringify({
        ok: true,
        num_identificativo: proceso.num_identificativo,
        aportaciones_borradas: aportacionIds.length,
        evidencias_borradas: evidenciasBorradas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
