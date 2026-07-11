import { Routes, Route, Navigate } from 'react-router-dom';
import Criterios from './pages/publico/Criterios.jsx';
import SolicitudForm from './pages/publico/SolicitudForm.jsx';
import Autoevaluacion from './pages/solicitante/Autoevaluacion.jsx';
import Admin from './pages/admin/Admin.jsx';

// Rutas Fase C:
//   /            → Criterios + Anexo I (portada pública)
//   /solicitud   → formulario de solicitud (público)
//   /acceso      → autoevaluación (login solicitante + checklist v6)
//   /admin       → panel de administración
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Criterios />} />
      <Route path="/solicitud" element={<SolicitudForm />} />
      <Route path="/acceso" element={<Autoevaluacion />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
