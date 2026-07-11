import { useNavigate } from 'react-router-dom';
import { CATEGORIAS_ANEXO_I, URL_MANUAL_ESTANDARES } from '../../lib/constants.js';
import BrandFooter from '../../components/BrandFooter.jsx';

// Portada pública: presenta el Distintivo, el Anexo I de entidades y el
// enlace al manual de estándares. Da paso a la solicitud y al acceso privado.
export default function Criterios() {
  const navigate = useNavigate();
  const cats = CATEGORIAS_ANEXO_I.filter((c) => c.id !== 'otros');

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="header">
        <div className="header-top">
          <img className="header-logo-img" src="/assets/logo-soludable.png" alt="Soludable" />
          <div className="header-title">
            <h1>Distintivo Soludable</h1>
            <p>Fotoprotección y Prevención del Cáncer de Piel</p>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, padding: 16, maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--r)',
            padding: 18,
            marginBottom: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,.05)',
          }}
        >
          <h2 style={{ color: 'var(--turq)', fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
            ¿Qué centros pueden solicitar el Distintivo?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            Son susceptibles de solicitar el Distintivo Soludable todas aquellas
            instituciones o empresas cuyos servicios o productos se encuentren recogidos en
            el Anexo I. Las principales se detallan a continuación:
          </p>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: 'var(--r)',
            padding: 16,
            marginBottom: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,.05)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 8,
            }}
          >
            {cats.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  padding: '7px 10px',
                  background: 'var(--turq-light)',
                  borderRadius: 8,
                }}
              >
                <span style={{ color: 'var(--turq)', fontWeight: 900 }}>●</span>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <a
          className="exp-btn"
          style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 12 }}
          href={URL_MANUAL_ESTANDARES}
          target="_blank"
          rel="noopener noreferrer"
        >
          📖 Consultar Manual de Estándares (PDF)
        </a>

        <button className="exp-btn" onClick={() => navigate('/solicitud')}>
          Iniciar solicitud de acreditación →
        </button>

        <button
          className="lock-btn"
          style={{ borderColor: 'var(--turq)', color: 'var(--turq)' }}
          onClick={() => navigate('/acceso')}
        >
          Ya tengo credenciales · Acceder
        </button>
      </div>
      <BrandFooter />
    </div>
  );
}
