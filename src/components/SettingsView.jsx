import { EMAIL_MARCA, URL_MANUAL_ESTANDARES } from '../lib/constants.js';
import BrandFooter from './BrandFooter.jsx';

export default function SettingsView({ onSignOut }) {
  return (
    <div className="view active settings-panel">
      <div className="settings-block">
        <label>Manual de estándares</label>
        <div className="settings-help">
          Consulta el Manual de Buenas Prácticas 2025 con todos los estándares del
          Distintivo Soludable.
        </div>
        <a
          className="exp-btn"
          style={{ display: 'block', textAlign: 'center', marginTop: 10, textDecoration: 'none' }}
          href={URL_MANUAL_ESTANDARES}
          target="_blank"
          rel="noopener noreferrer"
        >
          📖 Abrir manual (PDF)
        </a>
      </div>
      <div className="settings-block">
        <label>Acerca de</label>
        <div className="settings-help">
          Distintivo Soludable — Fotoprotección y Prevención del Cáncer de Piel.
          <br />
          Desarrollado por <strong>DoncelProject</strong> ·{' '}
          <a
            href={`mailto:${EMAIL_MARCA}`}
            style={{ color: 'var(--turq)', fontWeight: 800 }}
          >
            {EMAIL_MARCA}
          </a>
        </div>
      </div>
      {onSignOut && (
        <button className="lock-btn" onClick={onSignOut}>
          Cerrar sesión
        </button>
      )}
      <BrandFooter />
    </div>
  );
}
