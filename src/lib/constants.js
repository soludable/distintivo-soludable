// Constantes de la aplicación Distintivo Soludable

// ── Tipos de institución (activan estándares, fiel al v6) ──
export const TIPOS_INSTITUCION = [
  { id: 'general', label: '🏢 General' },
  { id: 'educativo', label: '🎓 Educativo' },
  { id: 'sanitario', label: '🏥 Sanitario' },
];

// ── Anexo I: categorías de entidades solicitantes (21 + Otros) ──
// mapaTipo: tipo de evaluación derivado (admin puede hacer override).
export const CATEGORIAS_ANEXO_I = [
  { id: 'ayuntamientos', label: 'Ayuntamientos y organismos públicos', mapaTipo: 'general' },
  { id: 'centros_escolares', label: 'Centros escolares', mapaTipo: 'educativo' },
  { id: 'universidades', label: 'Universidades', mapaTipo: 'educativo' },
  { id: 'centros_sanitarios', label: 'Centros sanitarios', mapaTipo: 'sanitario' },
  { id: 'federaciones_deportivas', label: 'Federaciones deportivas', mapaTipo: 'general' },
  { id: 'clubes_deportivos', label: 'Clubes deportivos', mapaTipo: 'general' },
  { id: 'escuelas_deportivas', label: 'Escuelas deportivas', mapaTipo: 'general' },
  { id: 'hoteles', label: 'Hoteles / alojamientos turísticos', mapaTipo: 'general' },
  { id: 'parques_ocio', label: 'Parques de ocio y aventura', mapaTipo: 'general' },
  { id: 'agencias_viajes', label: 'Agencias de viajes', mapaTipo: 'general' },
  { id: 'construccion', label: 'Empresas de la construcción', mapaTipo: 'general' },
  { id: 'limpieza', label: 'Empresas de limpieza', mapaTipo: 'general' },
  { id: 'jardineria', label: 'Empresas de jardinería', mapaTipo: 'general' },
  { id: 'mantenimiento', label: 'Empresas de mantenimiento', mapaTipo: 'general' },
  { id: 'socorrismo', label: 'Empresas de socorrismo', mapaTipo: 'general' },
  { id: 'eventos', label: 'Empresas de organización de eventos', mapaTipo: 'general' },
  { id: 'farmaceuticas', label: 'Empresas farmacéuticas', mapaTipo: 'sanitario' },
  { id: 'sombra', label: 'Empresas de instalación de elementos de sombra', mapaTipo: 'general' },
  { id: 'textiles', label: 'Empresas de textiles', mapaTipo: 'general' },
  { id: 'alimentacion', label: 'Empresas de alimentación', mapaTipo: 'general' },
  { id: 'comunicacion', label: 'Empresas de comunicación', mapaTipo: 'general' },
  { id: 'otros', label: 'Otros (especificar)', mapaTipo: 'general' },
];

// ── Estados del proceso de acreditación ──
export const ESTADOS_PROCESO = {
  SOLICITADA: 'solicitada',
  EN_REVISION: 'en_revision',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  EN_AUTOEVALUACION: 'en_autoevaluacion',
  CERRADA: 'cerrada',
  EN_REVISION_FINAL: 'en_revision_final',
};

export const ESTADO_LABELS = {
  solicitada: 'Solicitada',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  en_autoevaluacion: 'En autoevaluación',
  cerrada: 'Cerrada',
  en_revision_final: 'En revisión final',
};

// ── Número identificativo: SOL-YYYY-NNN-XX ──
// IMPORTANTE: la generación definitiva será en servidor (Postgres, Fase D).
// Este generador local es SOLO para la fase de datos simulados.
const SUFIJO_ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I, O (ambiguas)

export function generarNumIdentificativoLocal(correlativo, anio = new Date().getFullYear()) {
  const num = String(correlativo).padStart(3, '0');
  const suf =
    SUFIJO_ALFABETO[Math.floor(Math.random() * SUFIJO_ALFABETO.length)] +
    SUFIJO_ALFABETO[Math.floor(Math.random() * SUFIJO_ALFABETO.length)];
  return `SOL-${anio}-${num}-${suf}`;
}

// ── Enlaces y contacto ──
export const URL_MANUAL_ESTANDARES =
  'https://soludable.hcs.es/wp-content/uploads/2025/06/MANUAL-DE-BUENAS-PRACTICAS-2025_compressed.pdf';

export const EMAIL_ADMIN = 'soludable.digital@gmail.com';
export const EMAIL_MARCA = 'doncel.project@gmail.com';
export const FOOTER_TEXT = 'Desarrollado por DoncelProject · doncel.project@gmail.com';

// ── Adjuntos ──
export const MAX_PDF_BYTES = 2 * 1024 * 1024; // 2 MB por archivo
export const MAX_ARCHIVOS_POR_BP = 5; // varios adjuntos por estándar

// ── Clave temporal fase local (se sustituye por Supabase Auth en Fase E) ──
export const DEFAULT_PASS = 'soludable2026';
