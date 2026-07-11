import { useEffect, useRef, useState } from 'react';
import { calcStats } from '../../lib/evaluacion.js';
import { getSession, getMiRol, signOut, verificarTokenAcceso } from '../../lib/dataStore.js';
import { TIPOS_INSTITUCION } from '../../lib/constants.js';
import { useEvaluacion } from '../../hooks/useEvaluacion.js';
import Login from './Login.jsx';
import SetPassword from './SetPassword.jsx';
import Dashboard from '../../components/Dashboard.jsx';
import DimView from '../../components/DimView.jsx';
import SettingsView from '../../components/SettingsView.jsx';
import BrandFooter from '../../components/BrandFooter.jsx';

const TABS = [
  { id: 'dash', label: '📊 Panel' },
  { id: 'dim1', label: '1. Liderazgo' },
  { id: 'dim2', label: '2. Comunicación' },
  { id: 'dim3', label: '3. Implementación' },
  { id: 'dim4', label: '4. Formación' },
  { id: 'dim5', label: '5. Investigación' },
  { id: 'dim6', label: '6. Monitorización' },
  { id: 'dim7', label: '7. Evaluación' },
  { id: 'settings', label: '⚙️ Ajustes' },
];

export default function Autoevaluacion() {
  const [needsPassword, setNeedsPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [tab, setTab] = useState('dash');
  // enabled=authed: useEvaluacion no carga nada hasta que la sesión esté
  // realmente confirmada (login normal, o token_hash + contraseña ya
  // establecida). Evita que coja por carrera una sesión vieja que aún
  // quedara en el navegador antes de que la nueva termine de establecerse
  // (bug: mostraba el proceso cerrado de una prueba anterior hasta que
  // el usuario recargaba la página a mano).
  const evalData = useEvaluacion(authed);
  // Guardia contra doble ejecución del efecto por React.StrictMode en
  // desarrollo (ver comentario dentro del useEffect).
  const tokenProcesado = useRef(false);

  useEffect(() => {
    (async () => {
      // Prioridad 1: ¿llegamos desde nuestro propio enlace de acceso
      // (?token_hash=...&type=invite|recovery)? Lo verificamos NOSOTROS,
      // en el momento en que el usuario de verdad carga la página — no
      // depende de que Supabase redirija un enlace de un solo uso que
      // cualquier escáner de email o precarga del navegador podría haber
      // consumido ya (ver nota en la Edge Function aprobar-solicitud).
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      if (tokenHash && type) {
        // Guardia: en desarrollo, React.StrictMode ejecuta el cuerpo de
        // este efecto dos veces al montar. verifyOtp consume el token
        // (uso único) — sin esta guardia, la segunda ejecución llega con
        // el token ya usado y pisa el éxito de la primera con un error
        // de "enlace no válido", aunque la sesión sí se estableció bien.
        // En producción el efecto solo corre una vez, así que esto no
        // cambia el comportamiento allí — solo evita el falso error en
        // `npm run dev`.
        if (tokenProcesado.current) return;
        tokenProcesado.current = true;

        try {
          await verificarTokenAcceso(tokenHash, type);
          window.history.replaceState(null, '', window.location.pathname);
          setNeedsPassword(true);
        } catch (e) {
          setLinkError(
            'Este enlace ya no es válido (puede haber caducado o haberse usado antes). Pide al administrador que te lo reenvíe.'
          );
        }
        setCheckingSession(false);
        return;
      }

      // Caso normal: comprobar si ya hay sesión activa (login habitual).
      const session = await getSession();
      if (!session) {
        setAuthed(false);
        setCheckingSession(false);
        return;
      }
      const rol = await getMiRol();
      if (rol !== 'solicitante') {
        await signOut();
        setAuthed(false);
      } else {
        setAuthed(true);
      }
      setCheckingSession(false);
    })();
  }, []);

  if (checkingSession) return null;
  if (linkError) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <img src="/assets/logo-soludable.png" alt="Soludable" style={{ width: 70, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: 14, lineHeight: 1.6 }}>{linkError}</p>
        </div>
      </div>
    );
  }
  if (needsPassword) {
    return (
      <SetPassword
        onDone={() => {
          setNeedsPassword(false);
          setAuthed(true);
          // Limpia el hash para no volver a interpretar el enlace tras recargar.
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  if (!evalData.ready) return null;

  if (evalData.error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--red)', fontWeight: 700 }}>{evalData.error}</p>
        <button
          className="lock-btn"
          onClick={() => {
            signOut();
            setAuthed(false);
          }}
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (!evalData.proceso) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <img src="/assets/logo-soludable.png" alt="Soludable" style={{ width: 80, margin: '0 auto 16px' }} />
            <h2 style={{ fontWeight: 900, color: 'var(--turq)', marginBottom: 10 }}>
              Aún no hay ningún proceso asociado
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
              Tu cuenta existe pero todavía no tienes un proceso de acreditación aprobado.
              Si crees que esto es un error, contacta con soludable.digital@gmail.com.
            </p>
            <button
              className="lock-btn"
              style={{ marginTop: 16 }}
              onClick={() => {
                signOut();
                setAuthed(false);
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  const { tipo, locked, state } = evalData;
  const s = calcStats(state, tipo);
  const tipoLabel = TIPOS_INSTITUCION.find((t) => t.id === tipo)?.label || tipo;

  return (
    <div>
      <header className="header">
        <div className="header-top">
          <img
            className="header-logo-img"
            src="/assets/logo-soludable.png"
            alt="Soludable"
          />
          <div className="header-title">
            <h1>Distintivo Soludable</h1>
            <p>{evalData.proceso.num_identificativo}</p>
          </div>
          <div className="header-badge">
            {s.totalCumpl}/{s.totalActive}
          </div>
        </div>
      </header>

      <div className="tipo-bar">
        {/* El tipo queda fijado al aprobar la solicitud; no editable aquí. */}
        <div className="tipo-btn active" style={{ cursor: 'default', flex: 1, textAlign: 'center' }}>
          {tipoLabel}
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dash' && <Dashboard evalData={evalData} />}
      {tab.startsWith('dim') && (
        <DimView dim={Number(tab.slice(3))} evalData={evalData} />
      )}
      {tab === 'settings' && (
        <SettingsView
          onSignOut={() => {
            signOut();
            setAuthed(false);
          }}
        />
      )}
      {locked && !tab.startsWith('dim') && tab !== 'settings' && null}
    </div>
  );
}
