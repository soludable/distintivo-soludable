import { createClient } from '@supabase/supabase-js';

// Variables de entorno (Vite): definidas en .env.local (no versionar) y
// en Netlify (Site settings → Environment variables) para producción.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falla ruidoso a propósito: mejor un error claro en consola que un
  // fallo silencioso de red más adelante.
  console.error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env.local'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
