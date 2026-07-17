// Edge Function: enviar-subsanacion
//
// Llamada por el admin desde el panel. Hace, en un único paso:
//   1. Ejecuta fn_enviar_subsanacion (valida admin y que haya al
//      menos un estándar marcado — todo eso ya vive en la RPC).
//   2. Recoge los estándares marcados y sus notas.
//   3. Envía al solicitante un email con el detalle de qué debe
//      corregir y un enlace directo a su autoevaluación.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { enviarEmail, plantillaEmail } from '../_shared/email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

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

    // Cliente "como el admin que llama" — la propia RPC valida is_admin().
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Transición de estado (en_evaluacion -> en_subsanacion).
    const { data: proceso, error: errRpc } = await userClient.rpc('fn_enviar_subsanacion', {
      p_proceso_id: proceso_id,
    });
    if (errRpc) throw errRpc;

    // 2. Estándares marcados con su nota, para detallarlos en el email.
    const { data: pendientes, error: errPend } = await userClient
      .from('aportaciones')
      .select('bp_id, nota_subsanacion')
      .eq('proceso_id', proceso_id)
      .eq('requiere_subsanacion', true);
    if (errPend) throw errPend;

    // 3. Datos de contacto, vía la solicitud original vinculada al proceso.
    const { data: solicitud, error: errSol } = await userClient
      .from('solicitudes')
      .select('ra_correo, ra_nombre, rl_correo, rl_nombre, centro_nombre')
      .eq('id', proceso.solicitud_id)
      .single();
    if (errSol) throw errSol;

    const emailDestino = solicitud.ra_correo || solicitud.rl_correo;
    const nombreDestino = solicitud.ra_nombre || solicitud.rl_nombre || '';

    const listaHtml = (pendientes || [])
      .map(
        (p: { bp_id: string; nota_subsanacion: string | null }) =>
          `<li style="margin-bottom:8px;"><strong>${p.bp_id}</strong>: ${
            p.nota_subsanacion || 'El evaluador ha solicitado revisar este estándar.'
          }</li>`
      )
      .join('');

    const resultadoEmail = await enviarEmail({
      to: emailDestino,
      subject: `Se requieren correcciones — ${proceso.num_identificativo}`,
      html: plantillaEmail({
        titulo: '⚠ Subsanación requerida',
        cuerpoHtml: `
          <p>Hola${nombreDestino ? ' ' + nombreDestino : ''},</p>
          <p>Tras revisar la autoevaluación de <strong>${solicitud.centro_nombre || 'tu centro'}</strong>
          (nº <strong>${proceso.num_identificativo}</strong>), el equipo evaluador solicita corregir
          los siguientes estándares antes de continuar:</p>
          <ul style="padding-left:18px;">${listaHtml}</ul>
          <p><strong>Le rogamos aporte la información o documentación requerida en el plazo de
          dos meses naturales</strong> desde la fecha de este correo.</p>
          <p>Accede a tu autoevaluación para corregirlos y vuelve a cerrarla cuando termines:</p>
          <p style="text-align:center;margin:20px 0;">
            <a href="${APP_URL}/acceso" style="background:#FF7043;color:#fff;padding:12px 24px;
              border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
              Ir a mi autoevaluación
            </a>
          </p>
          <p style="font-size:12px;color:#888;">Si no esperabas este correo, puedes ignorarlo.</p>
        `,
      }),
    });

    return jsonResponse(200, {
      ok: true,
      num_identificativo: proceso.num_identificativo,
      estandares_notificados: (pendientes || []).length,
      email_status: resultadoEmail.status,
      enviado_a: emailDestino,
    });
  } catch (e) {
    return jsonResponse(400, { error: e.message || String(e) });
  }
});
