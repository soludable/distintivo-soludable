// Edge Function: evaluacion-final
//
// Llamada por el admin desde el panel. Hace, en un único paso:
//   1. Ejecuta fn_evaluacion_final (valida admin, que no queden
//      subsanaciones pendientes, y guarda el nivel conseguido —
//      todo eso ya vive en la RPC).
//   2. Envía al solicitante un email anunciando el nivel conseguido
//      y el aviso del certificado oficial.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { enviarEmail, plantillaEmail } from '../_shared/email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Traducción de los 4 códigos de nivel a texto legible en español.
// Se mantiene AQUÍ, independiente de src/lib/evaluacion.js, porque esta
// función corre en Deno (servidor), no comparte el bundle del frontend.
const NIVEL_LABELS_ES: Record<string, string> = {
  sin_nivel: 'Sin nivel',
  esenciales_ok: 'Esenciales completas',
  avanzado: 'Avanzado',
  excelente: 'Excelente',
};

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

    const { proceso_id, nivel } = await req.json();
    if (!proceso_id) return jsonResponse(400, { error: 'Falta proceso_id' });
    if (!nivel) return jsonResponse(400, { error: 'Falta nivel' });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Transición de estado (en_evaluacion -> en_revision_final),
    // guarda nivel_conseguido. La propia RPC valida admin y que no
    // queden subsanaciones pendientes sin resolver.
    const { data: proceso, error: errRpc } = await userClient.rpc('fn_evaluacion_final', {
      p_proceso_id: proceso_id,
      p_nivel: nivel,
    });
    if (errRpc) throw errRpc;

    // 2. Datos de contacto, vía la solicitud original.
    const { data: solicitud, error: errSol } = await userClient
      .from('solicitudes')
      .select('ra_correo, ra_nombre, rl_correo, rl_nombre, centro_nombre')
      .eq('id', proceso.solicitud_id)
      .single();
    if (errSol) throw errSol;

    const emailDestino = solicitud.ra_correo || solicitud.rl_correo;
    const nombreDestino = solicitud.ra_nombre || solicitud.rl_nombre || '';
    const nivelTexto = NIVEL_LABELS_ES[nivel] || nivel;

    const resultadoEmail = await enviarEmail({
      to: emailDestino,
      subject: `Resultado final de tu Distintivo Soludable — ${proceso.num_identificativo}`,
      html: plantillaEmail({
        titulo: '🏁 Evaluación final completada',
        cuerpoHtml: `
          <p>Hola${nombreDestino ? ' ' + nombreDestino : ''},</p>
          <p>La evaluación de <strong>${solicitud.centro_nombre || 'tu centro'}</strong>
          (nº <strong>${proceso.num_identificativo}</strong>) ha finalizado.</p>
          <p style="text-align:center;margin:20px 0;">
            <span style="display:inline-block;background:#00B8C8;color:#fff;padding:10px 22px;
              border-radius:8px;font-weight:800;font-size:16px;">
              Nivel conseguido: ${nivelTexto}
            </span>
          </p>
          <p>En las próximas semanas recibirás un <strong>certificado oficial</strong> que acredita
          tu nivel del Distintivo Soludable.</p>
          <p style="font-size:12px;color:#888;">Si no esperabas este correo, puedes ignorarlo.</p>
        `,
      }),
    });

    return jsonResponse(200, {
      ok: true,
      num_identificativo: proceso.num_identificativo,
      nivel,
      email_status: resultadoEmail.status,
      enviado_a: emailDestino,
    });
  } catch (e) {
    return jsonResponse(400, { error: e.message || String(e) });
  }
});
