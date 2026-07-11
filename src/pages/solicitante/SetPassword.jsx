import { useState } from 'react';
import { actualizarPassword } from '../../lib/dataStore.js';

// Se muestra cuando supabase-js detecta un enlace de invitación o
// recuperación en la URL (evento PASSWORD_RECOVERY). El solicitante
// aún no tiene contraseña propia — la crea aquí, una única vez.
export default function SetPassword({ onDone }) {
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [err, setErr] = useState('');
  const [cargando, setCargando] = useState(false);

  async function confirmar() {
    setErr('');
    if (pass.length < 8) {
      setErr('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (pass !== pass2) {
      setErr('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await actualizarPassword(pass);
      onDone();
    } catch (e) {
      setErr(e.message || 'No se pudo guardar la contraseña. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-logo-box">
        <img src="/assets/logo-soludable.png" alt="Soludable" />
      </div>
      <div className="login-title">Crea tu contraseña</div>
      <div className="login-sub">
        Es la primera vez que accedes — establece tu contraseña para continuar
      </div>
      <div className="login-card">
        <div className="login-label">Nueva contraseña</div>
        <input
          type="password"
          className="login-input"
          placeholder="Mínimo 8 caracteres"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <div className="login-label" style={{ marginTop: 12 }}>
          Repite la contraseña
        </div>
        <input
          type="password"
          className="login-input"
          value={pass2}
          onChange={(e) => setPass2(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
        />
        <div className="login-err">{err}</div>
        <button className="login-btn" disabled={cargando} onClick={confirmar}>
          {cargando ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </div>
    </div>
  );
}
