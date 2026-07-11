// Edge Function: notificar-solicitud
//
// Disparada por un Database Webhook de Supabase en INSERT sobre
// public.solicitudes. Se despliega con --no-verify-jwt (no hay usuario
// logueado, es la propia BD quien llama), así que en su lugar se
// comprueba un secreto compartido en la cabecera para que nadie más
// pueda invocarla desde fuera.
//
// Configura el webhook en Database → Webhooks con una cabecera:
//   x-webhook-secret: <el mismo valor que WEBHOOK_SECRET>

import { corsHeaders } from '../_shared/cors.ts';
import { enviarEmail, plantillaEmail } from '../_shared/email.ts';

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
const EMAIL_ADMIN = 'soludable.digital@gmail.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    const payload = await req.json();
    const s = payload.record; // fila insertada en solicitudes

    await enviarEmail({
      to: EMAIL_ADMIN,
      subject: `Nueva solicitud recibida — ${s.centro_nombre || s.categoria}`,
      html: plantillaEmail({
        titulo: '📥 Nueva solicitud de acreditación',
        cuerpoHtml: `
          <p>Se ha recibido una nueva solicitud del Distintivo Soludable.</p>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="color:#888;padding:4px 0;">Centro</td><td><strong>${s.centro_nombre || '—'}</strong></td></tr>
            <tr><td style="color:#888;padding:4px 0;">Categoría</td><td>${s.categoria}</td></tr>
            <tr><td style="color:#888;padding:4px 0;">CIF</td><td>${s.cif}</td></tr>
            <tr><td style="color:#888;padding:4px 0;">Responsable legal</td><td>${s.rl_nombre} ${s.rl_apellido1}</td></tr>
            <tr><td style="color:#888;padding:4px 0;">Correo</td><td>${s.rl_correo}</td></tr>
          </table>
          <p style="margin-top:16px;">Entra al panel de administración para revisarla y aprobarla o rechazarla.</p>
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
