// Estructura del formulario de solicitud — fiel a los campos reales (beltia.org).
// 3 bloques: datos del centro · responsable legal · responsable de autoevaluación.
// Este esquema alimenta el formulario (Fase C) y mapeará a la tabla `solicitudes` (Fase D).

// Tratamiento (campo select "Tratamiento *" del formulario real)
export const TRATAMIENTOS = ['Sr.', 'Sra.', 'Dr.', 'Dra.', 'D.', 'Dª.'];

// Tipo de documento identificativo (campo select "Tipo documento *")
export const TIPOS_DOCUMENTO = ['DNI', 'NIE', 'Pasaporte', 'Otro'];

// Provincias de Andalucía (ámbito del Distintivo). Ampliable si procede.
// NOTA: LEGADO de Fase C (demo con localStorage). El formulario real
// (Fase E) usa el catálogo completo de España desde Supabase
// (tablas provincias/municipios), no esta lista estática.
export const PROVINCIAS = [
  'Almería',
  'Cádiz',
  'Córdoba',
  'Granada',
  'Huelva',
  'Jaén',
  'Málaga',
  'Sevilla',
];

// Definición declarativa de los campos por bloque.
// req: obligatorio (marca * en el formulario real).
// tipo: text | email | tel | select
export const BLOQUES_SOLICITUD = [
  {
    id: 'centro',
    titulo: 'Datos del centro',
    campos: [
      { id: 'centroNombre', label: 'Centro u organismo solicitante', tipo: 'text', req: false, ayuda: 'Nombre del centro u organismo solicitante' },
      { id: 'categoria', label: 'Categoría (Anexo I)', tipo: 'categoria', req: true, ayuda: 'Tipo de entidad según el Anexo I' },
      { id: 'categoriaOtros', label: 'Especificar (si es "Otros")', tipo: 'text', req: false, dependeDe: 'categoria', dependeValor: 'otros' },
      { id: 'direccion', label: 'Dirección', tipo: 'text', req: true, ayuda: 'Dirección completa del centro' },
      { id: 'codigoPostal', label: 'Código Postal', tipo: 'text', req: true },
      { id: 'provincia', label: 'Provincia', tipo: 'geo', geoTipo: 'provincia', req: true },
      { id: 'municipio', label: 'Municipio', tipo: 'geo', geoTipo: 'municipio', req: true },
      { id: 'localidad', label: 'Localidad', tipo: 'text', req: false },
      { id: 'cif', label: 'CIF o código identificativo', tipo: 'text', req: true },
    ],
  },
  {
    id: 'responsableLegal',
    titulo: 'Responsable legal',
    campos: [
      { id: 'rlNombre', label: 'Nombre', tipo: 'text', req: true },
      { id: 'rlApellido1', label: 'Primer apellido', tipo: 'text', req: true },
      { id: 'rlApellido2', label: 'Segundo apellido', tipo: 'text', req: false },
      { id: 'rlTratamiento', label: 'Tratamiento', tipo: 'select', req: true, opciones: TRATAMIENTOS },
      { id: 'rlTipoDoc', label: 'Tipo documento', tipo: 'select', req: true, opciones: TIPOS_DOCUMENTO, ayuda: 'Tipo de documento identificativo' },
      { id: 'rlDocumento', label: 'Documento identidad', tipo: 'text', req: true, ayuda: 'Número de D.N.I. o documento identificativo' },
      { id: 'rlCorreo', label: 'Correo electrónico', tipo: 'email', req: true },
      { id: 'rlTelefono', label: 'Teléfono de contacto', tipo: 'tel', req: false },
      { id: 'rlCargo', label: 'Cargo en el centro', tipo: 'text', req: true, ayuda: 'Cargo que ocupa en el centro' },
    ],
  },
  {
    id: 'responsableAutoeval',
    titulo: 'Responsable de autoevaluación',
    campos: [
      { id: 'raNombre', label: 'Nombre', tipo: 'text', req: true },
      { id: 'raApellido1', label: 'Primer apellido', tipo: 'text', req: true },
      { id: 'raApellido2', label: 'Segundo apellido', tipo: 'text', req: false },
      { id: 'raTratamiento', label: 'Tratamiento', tipo: 'select', req: true, opciones: TRATAMIENTOS },
      { id: 'raTipoDoc', label: 'Tipo documento', tipo: 'select', req: true, opciones: TIPOS_DOCUMENTO, ayuda: 'Tipo de documento identificativo' },
      { id: 'raDocumento', label: 'Documento identidad', tipo: 'text', req: true, ayuda: 'Número de D.N.I. o documento identificativo' },
      { id: 'raCorreo', label: 'Correo electrónico', tipo: 'email', req: true },
      { id: 'raTelefono', label: 'Teléfono de contacto', tipo: 'tel', req: false },
      { id: 'raCargo', label: 'Cargo en el centro', tipo: 'text', req: true, ayuda: 'Cargo que ocupa en el centro' },
    ],
  },
];
