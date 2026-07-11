// Edge Function: aprobar-solicitud
//
// Llamada por el admin desde el panel (supabase.functions.invoke).
// Requiere JWT válido de un usuario con role='admin' (se comprueba
// en la propia RPC fn_aprobar_solicitud vía is_admin(), respetando RLS).
//
// Hace, en un único paso, lo que antes era manual:
//   1. Aprueba la solicitud (RPC, genera el nº identificativo).
//   2. Crea (o reutiliza) la cuenta de Auth del solicitante.
//   3. Vincula el proceso a esa cuenta.
//   4. Envía el email con el enlace de acceso.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { enviarEmail, plantillaEmail } from '../_shared/email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// URL de la app donde el solicitante inicia sesión. En local, Vite usa 5173;
// cuando esté en Netlify, cambia este secreto: supabase secrets set APP_URL=...
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';

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

    const { solicitud_id, tipo_override } = await req.json();
    if (!solicitud_id) {
      return new Response(JSON.stringify({ error: 'Falta solicitud_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente "como el admin que llama" — respeta RLS/is_admin() de verdad.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Aprobar (esto ya valida que quien llama es admin; si no, lanza error).
    const { data: proceso, error: errAprobar } = await userClient.rpc(
      'fn_aprobar_solicitud',
      { p_solicitud_id: solicitud_id, p_tipo_override: tipo_override ?? null }
    );
    if (errAprobar) throw errAprobar;

    // Traer datos de la solicitud para el email (correo, nombre, cargo).
    const { data: solicitud, error: errSol } = await userClient
      .from('solicitudes')
      .select('ra_correo, ra_nombre, rl_correo, rl_nombre, centro_nombre')
      .eq('id', solicitud_id)
      .single();
    if (errSol) throw errSol;

    const emailDestino = solicitud.ra_correo || solicitud.rl_correo;
    const nombreDestino = solicitud.ra_nombre || solicitud.rl_nombre || '';

    // 2. Crear la cuenta del solicitante (o generar link si ya existe).
    // Requiere la service_role key — nunca se expone al cliente, solo vive aquí.
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // IMPORTANTE: no usamos linkData.properties.action_link (el enlace que
    // apunta directo a supabase.co/auth/v1/verify). Ese enlace es de un
    // solo uso y cualquier escáner de seguridad de email, o la precarga de
    // algunos navegadores al pegar una URL, lo "gasta" antes de que la
    // persona haga clic de verdad — dejándolo inválido/caducado.
    //
    // En su lugar, construimos NUESTRO PROPIO enlace con el token_hash, y
    // es la propia app (Autoevaluacion.jsx) quien llama a
    // supabase.auth.verifyOtp() al cargar, solo cuando el usuario de
    // verdad interactúa con la página — no con un simple GET de escaneo.
    let hashedToken;
    let tipoVerificacion;
    const { data: linkData, error: errLink } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: emailDestino,
      options: { redirectTo: `${APP_URL}/acceso` },
    });

    if (!errLink) {
      hashedToken = linkData.properties.hashed_token;
      tipoVerificacion = 'invite';
    } else if (String(errLink.message || '').toLowerCase().includes('already')) {
      // Ya existía la cuenta (ej. proceso anterior): mandamos link de recuperación
      // de contraseña en vez de invitación, para que pueda volver a entrar.
      const { data: recData, error: errRec } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: emailDestino,
        options: { redirectTo: `${APP_URL}/acceso` },
      });
      if (errRec) throw errRec;
      hashedToken = recData.properties.hashed_token;
      tipoVerificacion = 'recovery';
    } else {
      throw errLink;
    }

    const actionLink = `${APP_URL}/acceso?token_hash=${hashedToken}&type=${tipoVerificacion}`;

    // 3. Vincular el proceso recién creado a esa cuenta.
    const { error: errVincular } = await userClient.rpc('fn_vincular_proceso_usuario', {
      p_proceso_id: proceso.id,
      p_email: emailDestino,
    });
    if (errVincular) throw errVincular;

    // 4. Enviar el email con el enlace de acceso.
    const resultadoEmail = await enviarEmail({
      to: emailDestino,
      subject: `Tu Distintivo Soludable ha sido aprobado — ${proceso.num_identificativo}`,
      html: plantillaEmail({
        titulo: '✔ Solicitud aprobada',
        cuerpoHtml: `
          <p>Hola${nombreDestino ? ' ' + nombreDestino : ''},</p>
          <p>La solicitud de <strong>${solicitud.centro_nombre || 'tu centro'}</strong> para el
          Distintivo Soludable ha sido <strong>aprobada</strong>.</p>
          <p>Tu número de proceso es <strong>${proceso.num_identificativo}</strong>.</p>
          <p>Pulsa el siguiente enlace para establecer tu contraseña y empezar tu autoevaluación:</p>
          <p style="text-align:center;margin:20px 0;">
            <a href="${actionLink}" style="background:#00B8C8;color:#fff;padding:12px 24px;
              border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
              Acceder a mi autoevaluación
            </a>
          </p>
          <p style="font-size:12px;color:#888;">Si no esperabas este correo, puedes ignorarlo.</p>
        `,
      }),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        num_identificativo: proceso.num_identificativo,
        // Red de seguridad: si el email no llega (algunos proveedores
        // "consumen" el enlace de un solo uso al escanearlo antes del
        // clic real), el admin puede copiarlo y pasarlo a mano.
        action_link: actionLink,
        // Diagnóstico directo: qué código devolvió SendGrid de verdad.
        email_status: resultadoEmail.status,
        enviado_a: emailDestino,
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
