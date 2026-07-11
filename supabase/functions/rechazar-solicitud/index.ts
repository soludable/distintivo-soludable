// Edge Function: rechazar-solicitud
// Llamada por el admin desde el panel. Rechaza y avisa por email.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { enviarEmail, plantillaEmail } from '../_shared/email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

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

    const { solicitud_id, motivo } = await req.json();
    if (!solicitud_id) {
      return new Response(JSON.stringify({ error: 'Falta solicitud_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: solicitud, error: errRech } = await userClient.rpc(
      'fn_rechazar_solicitud',
      { p_solicitud_id: solicitud_id, p_motivo: motivo ?? null }
    );
    if (errRech) throw errRech;

    const emailDestino = solicitud.ra_correo || solicitud.rl_correo;
    const nombreDestino = solicitud.ra_nombre || solicitud.rl_nombre || '';

    await enviarEmail({
      to: emailDestino,
      subject: 'Resultado de tu solicitud — Distintivo Soludable',
      html: plantillaEmail({
        titulo: 'Solicitud no aprobada',
        cuerpoHtml: `
          <p>Hola${nombreDestino ? ' ' + nombreDestino : ''},</p>
          <p>Tras revisar la solicitud de <strong>${solicitud.centro_nombre || 'tu centro'}</strong>,
          no ha sido posible aprobarla en esta ocasión.</p>
          ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
          <p>Si tienes dudas, puedes escribir a soludable.digital@gmail.com.</p>
        `,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
