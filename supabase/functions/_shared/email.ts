// Helper para enviar emails vía Resend, usando un dominio propio
// verificado (doncelproject.com).
//
// Requiere:
//   1. Dominio doncelproject.com añadido y VERIFICADO en Resend.
//   2. Secreto RESEND_API_KEY:
//        supabase secrets set RESEND_API_KEY=re_xxxxx
//   3. Secreto REMITENTE_EMAIL:
//        supabase secrets set REMITENTE_EMAIL=soludable@doncelproject.com

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const REMITENTE_EMAIL = Deno.env.get('REMITENTE_EMAIL') || 'soludable@doncelproject.com';
const REMITENTE_NOMBRE = 'Distintivo Soludable';

// CN-013: enmascara el email para los logs (ej. j***@dominio.com).
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local[0]}***@${domain}`;
}

export async function enviarEmail({ to, subject, html }: { to: string | string[]; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    throw new Error('Falta el secreto RESEND_API_KEY en el proyecto Supabase');
  }
  const destinatarios = Array.isArray(to) ? to : [to];

  // CN-013: solo logueamos emails enmascarados, nunca la dirección completa.
  const destinatariosMasked = destinatarios.map(maskEmail);
  console.log('[email] enviando a', destinatariosMasked, '| asunto:', subject);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${REMITENTE_NOMBRE} <${REMITENTE_EMAIL}>`,
        to: destinatarios,
        subject,
        html,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('Resend no respondió en 8 segundos (timeout). Revisa la API key y el dominio verificado.');
    }
    throw new Error('Fallo de red llamando a Resend: ' + (e.message || e));
  } finally {
    clearTimeout(timeoutId);
  }

  const body = await res.json();
  console.log('[email] Resend respondió con status', res.status);

  if (!res.ok) {
    console.error('[email] Resend error body:', JSON.stringify(body));
    throw new Error(`Resend error: ${res.status} ${JSON.stringify(body)}`);
  }
  return { ok: true, status: res.status, id: body.id };
}

const FOOTER = `
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #EEE;font-size:11px;color:#999;text-align:center;">
    Desarrollado por DoncelProject · doncel.project@gmail.com
  </div>
`;

export function plantillaEmail({ titulo, cuerpoHtml }: { titulo: string; cuerpoHtml: string }) {
  return `
  <div style="font-family:'Nunito',Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2C2C2C;">
    <div style="background:#00B8C8;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
      <strong style="font-size:15px;">${titulo}</strong>
    </div>
    <div style="background:#fff;border:1px solid #EEE;border-top:none;padding:20px;border-radius:0 0 12px 12px;font-size:14px;line-height:1.6;">
      ${cuerpoHtml}
    </div>
    ${FOOTER}
  </div>`;
}
