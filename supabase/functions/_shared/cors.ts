const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'https://soludable.netlify.app').split(',').map((o) => o.trim());

export function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}
