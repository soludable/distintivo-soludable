import { useState, useRef, useEffect } from 'react';
import { signIn } from '../../lib/dataStore.js';

// Login real (Fase E): el admin invita al solicitante desde el panel;
// aquí solo se inicia sesión con el email+contraseña ya dados de alta
// en Supabase Auth.
export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [cargando, setCargando] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  async function tryLogin() {
    setErr('');
    if (!email.trim() || !pass) {
      setErr('Introduce tu correo y contraseña.');
      return;
    }
    setCargando(true);
    try {
      await signIn(email.trim(), pass);
      onSuccess();
    } catch (e) {
      setErr(
        e.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : e.message || 'No se pudo iniciar sesión.'
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-logo-box">
        <img src="/assets/logo-soludable.png" alt="Soludable" />
      </div>
      <div className="login-title">Distintivo Soludable</div>
      <div className="login-sub">Fotoprotección y Prevención del Cáncer de Piel</div>
      <div className="login-card">
        <div className="login-label">Correo electrónico</div>
        <input
          ref={emailRef}
          type="email"
          className="login-input"
          placeholder="tu-correo@ejemplo.com"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
        />
        <div className="login-label" style={{ marginTop: 12 }}>
          Contraseña
        </div>
        <input
          type="password"
          className="login-input"
          placeholder="••••••••"
          autoComplete="current-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
        />
        <div className="login-err">{err}</div>
        <button className="login-btn" disabled={cargando} onClick={tryLogin}>
          {cargando ? 'Accediendo…' : 'Acceder'}
        </button>
        <div className="no-key-note">
          ¿Aún no tienes credenciales? Recibirás un correo cuando tu solicitud sea aprobada.
        </div>
      </div>
    </div>
  );
}
