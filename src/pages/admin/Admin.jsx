import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signIn,
  signOut,
  getSession,
  getMiRol,
  getSolicitudes,
  getProcesos,
  aprobarSolicitud,
  rechazarSolicitud,
  vincularProcesoUsuario,
} from '../../lib/dataStore.js';
import { CATEGORIAS_ANEXO_I, ESTADO_LABELS, EMAIL_ADMIN, TIPOS_INSTITUCION } from '../../lib/constants.js';
import { BPS, DIM_NAMES } from '../../data/bps.js';
import { isActive, calcStats, getNivel } from '../../lib/evaluacion.js';
import { getEvaluacion } from '../../lib/dataStore.js';
import BpCard from '../../components/BpCard.jsx';
import BrandFooter from '../../components/BrandFooter.jsx';

const ESTADO_COLOR = {
  solicitada: '#F5C800',
  en_revision: '#00B8C8',
  aprobada: '#4CAF50',
  rechazada: '#E53935',
  en_autoevaluacion: '#00B8C8',
  cerrada: '#7E57C2',
  en_revision_final: '#7E57C2',
};

function Badge({ estado }) {
  return (
    <span
      style={{
        background: ESTADO_COLOR[estado] || '#BDBDBD',
        color: 'white',
        fontSize: 10,
        fontWeight: 800,
        padding: '3px 9px',
        borderRadius: 20,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
      }}
    >
      {ESTADO_LABELS[estado] || estado}
    </span>
  );
}

const categoriaLabel = (id) => CATEGORIAS_ANEXO_I.find((c) => c.id === id)?.label || id;
const tipoLabel = (id) => TIPOS_INSTITUCION.find((t) => t.id === id)?.label || id;

export default function Admin() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [cargando, setCargando] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [aviso, setAviso] = useState('');
  const [ultimoLink, setUltimoLink] = useState('');
  const [detalleProceso, setDetalleProceso] = useState(null);
  const [evalProceso, setEvalProceso] = useState(null);
  const [cargandoEval, setCargandoEval] = useState(false);
  const [errorPanel, setErrorPanel] = useState('');
  const [accionando, setAccionando] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session) {
        const rol = await getMiRol();
        setAuthed(rol === 'admin');
        if (rol !== 'admin') setErr('Esta cuenta no tiene permisos de administrador.');
      }
      setCheckingSession(false);
    })();
  }, []);

  async function recargar() {
    try {
      setErrorPanel('');
      const [s, p] = await Promise.all([getSolicitudes(), getProcesos()]);
      setSolicitudes(s);
      setProcesos(p);
    } catch (e) {
      setErrorPanel('No se pudieron cargar los datos: ' + (e.message || e));
    }
  }

  useEffect(() => {
    if (authed) recargar();
  }, [authed]);

  async function login() {
    setErr('');
    setCargando(true);
    try {
      await signIn(email.trim(), pass);
      const rol = await getMiRol();
      if (rol !== 'admin') {
        setErr('Esta cuenta no tiene permisos de administrador.');
        await signOut();
        return;
      }
      setAuthed(true);
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

  async function aprobar(sol) {
    setAccionando(true);
    try {
      const resultado = await aprobarSolicitud(sol.id);
      await recargar();
      setDetalle(null);
      setUltimoLink(resultado.action_link || '');
      setAviso(
        `Solicitud aprobada. Nº ${resultado.num_identificativo}. Email enviado a ${resultado.enviado_a} — Resend respondió con status ${resultado.email_status}. Si no le llega, copia el enlace de abajo y pásaselo tú.`
      );
    } catch (e) {
      setErrorPanel('No se pudo aprobar: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  async function rechazar(sol) {
    const motivo = window.prompt('Motivo del rechazo (opcional):') || '';
    setAccionando(true);
    try {
      await rechazarSolicitud(sol.id, motivo);
      await recargar();
      setDetalle(null);
      setAviso('Solicitud rechazada. Pendiente enviar el aviso por correo (Fase E).');
    } catch (e) {
      setErrorPanel('No se pudo rechazar: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  async function vincular(proceso) {
    const email = window.prompt(
      'Correo con el que creaste la cuenta en Authentication → Users:',
      proceso.centro_nombre ? '' : ''
    );
    if (!email) return;
    setAccionando(true);
    try {
      await vincularProcesoUsuario(proceso.id, email.trim());
      await recargar();
      setAviso(`Proceso ${proceso.num_identificativo} vinculado a ${email.trim()}. Ya puede autoevaluarse.`);
    } catch (e) {
      setErrorPanel('No se pudo vincular: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  async function abrirProceso(proceso) {
    setDetalleProceso(proceso);
    setCargandoEval(true);
    try {
      const ev = await getEvaluacion(proceso.id);
      setEvalProceso(ev);
    } catch (e) {
      setErrorPanel('No se pudieron cargar las aportaciones: ' + (e.message || e));
    } finally {
      setCargandoEval(false);
    }
  }

  if (checkingSession) return null;

  if (!authed) {
    return (
      <div className="login-screen">
        <div className="login-logo-box">
          <img src="/assets/logo-soludable.png" alt="Soludable" />
        </div>
        <div className="login-title">Panel de administración</div>
        <div className="login-sub">Distintivo Soludable · {EMAIL_ADMIN}</div>
        <div className="login-card">
          <div className="login-label">Correo electrónico</div>
          <input
            type="email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
          <div className="login-label" style={{ marginTop: 12 }}>
            Contraseña
          </div>
          <input
            type="password"
            className="login-input"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
          />
          <div className="login-err">{err}</div>
          <button className="login-btn" disabled={cargando} onClick={login}>
            {cargando ? 'Accediendo…' : 'Acceder'}
          </button>
          <div className="no-key-note">
            <button
              style={{ background: 'none', border: 'none', color: 'var(--turq)', fontWeight: 800, cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detalle de una solicitud ──
  // ── Detalle de aportaciones de un proceso ──
  if (detalleProceso) {
    const p = detalleProceso;
    const tipo = p.tipo_institucion;
    const s = evalProceso ? calcStats(evalProceso.state, tipo) : null;
    const nv = s ? getNivel(s) : null;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <header className="header">
          <div className="header-top">
            <img className="header-logo-img" src="/assets/logo-soludable.png" alt="Soludable" />
            <div className="header-title">
              <h1>{p.num_identificativo}</h1>
              <p>{p.centro_nombre} · {tipoLabel(tipo)}</p>
            </div>
            <Badge estado={p.estado} />
          </div>
        </header>
        <div style={{ flex: 1, padding: 16, maxWidth: 640, margin: '0 auto', width: '100%' }}>
          {cargandoEval && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Cargando aportaciones…</div>}

          {!cargandoEval && evalProceso && (
            <>
              <div
                style={{
                  background: nv.color,
                  borderRadius: 'var(--r)',
                  padding: 16,
                  marginBottom: 16,
                  color: 'white',
                }}
              >
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', opacity: 0.85 }}>
                  Nivel del Distintivo
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{nv.txt}</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>{nv.sub}</div>
                <div style={{ fontSize: 12, marginTop: 8, opacity: 0.9 }}>
                  {s.totalCumpl}/{s.totalActive} cumplidas · {s.esenCumpl}/{s.esenTotal} esenciales
                </div>
              </div>

              {[1, 2, 3, 4, 5, 6, 7].map((dim) => {
                const bpsDelDim = BPS.filter((bp) => bp.dim === dim && isActive(bp, tipo));
                if (bpsDelDim.length === 0) return null;
                return (
                  <div key={dim} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: 'var(--turq)',
                        margin: '16px 0 8px',
                        textTransform: 'uppercase',
                        letterSpacing: '.04em',
                      }}
                    >
                      {DIM_NAMES[dim]}
                    </div>
                    {bpsDelDim.map((bp) => (
                      <BpCard
                        key={bp.id}
                        bp={bp}
                        checked={!!evalProceso.state[bp.id]}
                        obsValue={evalProceso.obs[bp.id]}
                        files={evalProceso.files[bp.id]}
                        hidden={false}
                        locked={true}
                        onToggle={() => {}}
                        onObs={() => {}}
                        onAddFile={() => {}}
                        onRemoveFile={() => {}}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}

          <button
            className="lock-btn"
            style={{ borderColor: 'var(--gray3)', color: 'var(--text2)', marginTop: 16 }}
            onClick={() => {
              setDetalleProceso(null);
              setEvalProceso(null);
            }}
          >
            ← Volver al listado
          </button>
        </div>
        <BrandFooter />
      </div>
    );
  }

  if (detalle) {
    const s = detalle;
    const nombre = (t, n, a1, a2) => [t, n, a1, a2].filter(Boolean).join(' ');
    const grupos = [
      ['Datos del centro', [
        ['Centro', s.centro_nombre],
        ['Categoría', categoriaLabel(s.categoria) + (s.categoria_otros ? ` (${s.categoria_otros})` : '')],
        ['Tipo evaluación (derivado)', tipoLabel(s.tipo_derivado)],
        ['Dirección', s.direccion],
        ['CP', s.codigo_postal],
        ['Provincia', s.provincias?.nombre],
        ['Municipio', s.municipios?.nombre],
        ['Localidad', s.localidad],
        ['CIF', s.cif],
      ]],
      ['Responsable legal', [
        ['Nombre', nombre(s.rl_tratamiento, s.rl_nombre, s.rl_apellido1, s.rl_apellido2)],
        ['Documento', `${s.rl_tipo_doc || ''} ${s.rl_documento || ''}`],
        ['Correo', s.rl_correo],
        ['Teléfono', s.rl_telefono],
        ['Cargo', s.rl_cargo],
      ]],
      ['Responsable de autoevaluación', [
        ['Nombre', nombre(s.ra_tratamiento, s.ra_nombre, s.ra_apellido1, s.ra_apellido2)],
        ['Documento', `${s.ra_tipo_doc || ''} ${s.ra_documento || ''}`],
        ['Correo', s.ra_correo],
        ['Teléfono', s.ra_telefono],
        ['Cargo', s.ra_cargo],
      ]],
    ];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <header className="header">
          <div className="header-top">
            <img className="header-logo-img" src="/assets/logo-soludable.png" alt="Soludable" />
            <div className="header-title">
              <h1>Revisión de solicitud</h1>
              <p>Panel de administración</p>
            </div>
            <Badge estado={s.estado} />
          </div>
        </header>
        <div style={{ flex: 1, padding: 16, maxWidth: 640, margin: '0 auto', width: '100%' }}>
          {grupos.map(([titulo, filas]) => (
            <div key={titulo} style={{ background: 'white', borderRadius: 'var(--r)', padding: 16, marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--turq)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {titulo}
              </div>
              {filas.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px solid var(--gray)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', fontWeight: 700 }}>{k}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 700, textAlign: 'right' }}>{v || '—'}</span>
                </div>
              ))}
            </div>
          ))}

          {s.num_identificativo && (
            <div style={{ background: 'var(--turq-light)', border: '1px solid var(--turq)', borderRadius: 'var(--rs)', padding: 12, fontSize: 13, fontWeight: 800, color: '#007B87', marginBottom: 12 }}>
              Nº identificativo del proceso: {s.num_identificativo}
            </div>
          )}
          {s.motivo_rechazo && (
            <div style={{ background: '#FDECEA', border: '1px solid var(--red)', borderRadius: 'var(--rs)', padding: 12, fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 12 }}>
              Motivo del rechazo: {s.motivo_rechazo}
            </div>
          )}

          {(s.estado === 'solicitada' || s.estado === 'en_revision') && (
            <>
              <button className="exp-btn" disabled={accionando} onClick={() => aprobar(s)}>
                {accionando ? 'Procesando…' : '✔ Aprobar y generar credenciales'}
              </button>
              <button className="lock-btn" disabled={accionando} onClick={() => rechazar(s)}>
                ✖ Rechazar solicitud
              </button>
            </>
          )}
          <button
            className="lock-btn"
            style={{ borderColor: 'var(--gray3)', color: 'var(--text2)' }}
            onClick={() => setDetalle(null)}
          >
            ← Volver al listado
          </button>
        </div>
        <BrandFooter />
      </div>
    );
  }

  // ── Listado principal ──
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="header">
        <div className="header-top">
          <img className="header-logo-img" src="/assets/logo-soludable.png" alt="Soludable" />
          <div className="header-title">
            <h1>Panel de administración</h1>
            <p>Solicitudes y procesos</p>
          </div>
          <div className="header-badge">{solicitudes.length}</div>
        </div>
      </header>

      <div style={{ flex: 1, padding: 16, maxWidth: 640, margin: '0 auto', width: '100%' }}>
        {errorPanel && (
          <div style={{ background: '#FDECEA', border: '1px solid var(--red)', borderRadius: 'var(--rs)', padding: 12, fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 14 }}>
            {errorPanel}
          </div>
        )}
        {aviso && (
          <div style={{ background: '#F1F8F1', border: '1px solid #A5D6A7', borderRadius: 'var(--rs)', padding: 12, fontSize: 12, fontWeight: 700, color: '#2E7D32', marginBottom: ultimoLink ? 8 : 14, lineHeight: 1.5 }}>
            {aviso}
          </div>
        )}
        {ultimoLink && (
          <div style={{ background: 'var(--turq-light)', border: '1px solid var(--turq)', borderRadius: 'var(--rs)', padding: 10, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              readOnly
              value={ultimoLink}
              onFocus={(e) => e.target.select()}
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 11, color: '#007B87', fontFamily: 'monospace' }}
            />
            <button
              className="exp-btn"
              style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
              onClick={() => { navigator.clipboard.writeText(ultimoLink); }}
            >
              Copiar
            </button>
          </div>
        )}

        <div className="sec-title">Solicitudes ({solicitudes.length})</div>
        {solicitudes.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
            No hay solicitudes todavía.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {solicitudes.map((s) => (
            <button
              key={s.id}
              onClick={() => setDetalle(s)}
              style={{
                textAlign: 'left',
                background: 'white',
                border: 'none',
                borderRadius: 'var(--rs)',
                padding: 12,
                boxShadow: '0 1px 6px rgba(0,0,0,.07)',
                borderLeft: `4px solid ${ESTADO_COLOR[s.estado] || '#BDBDBD'}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                  {s.centro_nombre || categoriaLabel(s.categoria)}
                </span>
                <Badge estado={s.estado} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontWeight: 600 }}>
                {categoriaLabel(s.categoria)} · {s.provincias?.nombre || '—'}
                {s.num_identificativo ? ` · ${s.num_identificativo}` : ''}
              </div>
            </button>
          ))}
        </div>

        <div className="sec-title">Procesos activos ({procesos.length})</div>
        {procesos.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Aún no hay procesos aprobados.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {procesos.map((p) => (
            <div
              key={p.id}
              style={{
                background: 'white',
                borderRadius: 'var(--rs)',
                padding: 12,
                boxShadow: '0 1px 6px rgba(0,0,0,.07)',
                borderLeft: `4px solid ${ESTADO_COLOR[p.estado] || '#BDBDBD'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{p.num_identificativo}</span>
                <Badge estado={p.estado} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontWeight: 600 }}>
                {p.centro_nombre} · {tipoLabel(p.tipo_institucion)}
                {!p.usuario_id && ' · cuenta pendiente de crear'}
              </div>
              <button
                className="exp-btn"
                style={{ marginTop: 8, padding: '6px 10px', fontSize: 12 }}
                onClick={() => abrirProceso(p)}
              >
                📋 Ver aportaciones
              </button>
            </div>
          ))}
        </div>

        <button
          className="lock-btn"
          style={{ borderColor: 'var(--gray3)', color: 'var(--text2)', marginTop: 20 }}
          onClick={async () => {
            await signOut();
            setAuthed(false);
          }}
        >
          Cerrar sesión
        </button>
      </div>
      <BrandFooter />
    </div>
  );
}
