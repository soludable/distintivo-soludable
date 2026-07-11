// Edge Function: notificar-cierre
//
// Disparada por un Database Webhook en UPDATE sobre public.procesos.
// Se dispara en CUALQUIER update de esa tabla, así que aquí dentro se
// comprueba que el cambio real fue "pasar a cerrada" (y no cualquier
// otra actualización), para no mandar el aviso de más.
//
// Configura el webhook igual que notificar-solicitud (misma cabecera secreta).

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
    const nuevo = payload.record;
    const anterior = payload.old_record;

    // Solo nos interesa el instante en que pasa a 'cerrada'.
    if (nuevo.estado !== 'cerrada' || anterior?.estado === 'cerrada') {
      return new Response(JSON.stringify({ ok: true, ignorado: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await enviarEmail({
      to: EMAIL_ADMIN,
      subject: `Autoevaluación cerrada — ${nuevo.num_identificativo}`,
      html: plantillaEmail({
        titulo: '🔒 Autoevaluación cerrada',
        cuerpoHtml: `
          <p>El solicitante de <strong>${nuevo.centro_nombre || nuevo.num_identificativo}</strong>
          ha cerrado su autoevaluación.</p>
          <p><strong>Nº de proceso:</strong> ${nuevo.num_identificativo}</p>
          <p>Ya puedes entrar al panel de administración para revisar sus aportaciones.</p>
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
