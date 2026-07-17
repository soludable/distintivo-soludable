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
  getEvaluacion,
  iniciarEvaluacion,
  marcarSubsanacionAportacion,
  enviarASubsanacion,
  evaluacionFinal,
  reabrirProceso,
  borrarProceso,
  borrarSolicitud,
} from '../../lib/dataStore.js';
import {
  CATEGORIAS_ANEXO_I,
  ESTADO_LABELS,
  ESTADO_COLOR,
  EMAIL_ADMIN,
  TIPOS_INSTITUCION,
} from '../../lib/constants.js';
import { BPS, DIM_NAMES } from '../../data/bps.js';
import { isActive, calcStats, getNivel, getNivelCodigo, NIVEL_LABELS } from '../../lib/evaluacion.js';
import BpCard from '../../components/BpCard.jsx';
import BrandFooter from '../../components/BrandFooter.jsx';

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

  // ── Estado local para subsanación (panel evaluador) ──
  const [notasDraft, setNotasDraft] = useState({}); // bp_id -> texto en curso de edición

  // ── Estado local para el modal de borrado (doble confirmación) ──
  // Modal de borrado genérico: sirve tanto para procesos como para
  // solicitudes. `item.tipo` es 'proceso' | 'solicitud'.
  const [borrarModal, setBorrarModal] = useState(null); // { tipo, id, label } | null
  const [borrarConfirmTexto, setBorrarConfirmTexto] = useState('');

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
      return { solicitudes: s, procesos: p };
    } catch (e) {
      setErrorPanel('No se pudieron cargar los datos: ' + (e.message || e));
      return { solicitudes: [], procesos: [] };
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
      setNotasDraft({});
    } catch (e) {
      setErrorPanel('No se pudieron cargar las aportaciones: ' + (e.message || e));
    } finally {
      setCargandoEval(false);
    }
  }

  // Vuelve a cargar tanto el detalle del proceso actual (aportaciones)
  // como el listado general, tras cualquier acción que cambie su estado.
  // Recibe el ID del proceso (no el objeto, que podría estar
  // desactualizado) y recarga tanto el listado general como el detalle,
  // usando el dato FRESCO recién traído de BD — no el que teníamos antes
  // de la acción, que ya tendría el estado antiguo.
  async function refrescarTodo(procesoId) {
    const { procesos: freshProcesos } = await recargar();
    const fresh = freshProcesos.find((x) => x.id === procesoId) || null;
    if (fresh) {
      setDetalleProceso(fresh);
      await abrirProceso(fresh);
    }
  }

  // ── Máquina de estados: acciones del evaluador ──

  async function handleIniciarEvaluacion(proceso) {
    setAccionando(true);
    try {
      const actualizado = await iniciarEvaluacion(proceso.id);
      setAviso(`Proceso ${proceso.num_identificativo} pasado a "En evaluación".`);
      await refrescarTodo(proceso.id);
    } catch (e) {
      setErrorPanel('No se pudo iniciar la evaluación: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  // Marca/desmarca un estándar como "requiere subsanación", con su nota.
  async function toggleSubsanacion(bp, aportacionId, requiereActual) {
    const nuevoRequiere = !requiereActual;
    const nota = nuevoRequiere ? (notasDraft[bp.id] ?? evalProceso.subsanacion[bp.id]?.nota ?? '') : null;
    setAccionando(true);
    try {
      await marcarSubsanacionAportacion(aportacionId, nuevoRequiere, nota);
      await abrirProceso(detalleProceso);
    } catch (e) {
      setErrorPanel('No se pudo actualizar la subsanación: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  // Guarda solo el texto de la nota (sin cambiar el flag), útil cuando
  // el admin ya marcó el estándar y quiere ajustar el detalle después.
  async function guardarNota(aportacionId, requiereActual, texto) {
    setAccionando(true);
    try {
      await marcarSubsanacionAportacion(aportacionId, requiereActual, texto);
      await abrirProceso(detalleProceso);
    } catch (e) {
      setErrorPanel('No se pudo guardar la nota: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  async function handleEnviarSubsanacion(proceso) {
    if (!window.confirm('¿Enviar este proceso a subsanación? Se enviará un email al solicitante con el detalle de qué corregir.')) return;
    setAccionando(true);
    try {
      const resultado = await enviarASubsanacion(proceso.id);
      setAviso(
        `Proceso ${resultado.num_identificativo} enviado a subsanación. Email enviado a ${resultado.enviado_a} (status ${resultado.email_status}) con ${resultado.estandares_notificados} estándar(es) detallado(s).`
      );
      await refrescarTodo(proceso.id);
    } catch (e) {
      setErrorPanel('No se pudo enviar a subsanación: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  async function handleEvaluacionFinal(proceso, tipo) {
    const s = calcStats(evalProceso.state, tipo);
    const codigo = getNivelCodigo(s);
    const etiqueta = NIVEL_LABELS[codigo];
    if (
      !window.confirm(
        `¿Cerrar la evaluación final?\n\nNivel calculado según los datos actuales: ${etiqueta}\n\nSe enviará un email al solicitante anunciando el nivel conseguido y el aviso del certificado oficial.`
      )
    )
      return;
    setAccionando(true);
    try {
      const resultado = await evaluacionFinal(proceso.id, codigo);
      setAviso(
        `Evaluación final registrada. Nivel: ${etiqueta}. Email enviado a ${resultado.enviado_a} (status ${resultado.email_status}).`
      );
      await refrescarTodo(proceso.id);
    } catch (e) {
      setErrorPanel('No se pudo completar la evaluación final: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  async function handleReabrir(proceso) {
    if (
      !window.confirm(
        `¿Reabrir excepcionalmente el proceso ${proceso.num_identificativo}?\n\nVolverá a "En autoevaluación" y se perderán las marcas de cierre/evaluación final. Úsalo solo a petición expresa del solicitante.`
      )
    )
      return;
    setAccionando(true);
    try {
      await reabrirProceso(proceso.id);
      setAviso(`Proceso ${proceso.num_identificativo} reabierto excepcionalmente.`);
      await refrescarTodo(proceso.id);
    } catch (e) {
      setErrorPanel('No se pudo reabrir: ' + (e.message || e));
    } finally {
      setAccionando(false);
    }
  }

  async function confirmarBorrado() {
    if (borrarConfirmTexto.trim().toUpperCase() !== 'BORRAR') return;
    const item = borrarModal;
    setAccionando(true);
    try {
      if (item.tipo === 'proceso') {
        const resultado = await borrarProceso(item.id);
        setAviso(
          `Proceso ${resultado.num_identificativo} borrado. Se eliminaron ${resultado.aportaciones_borradas} aportación(es) y ${resultado.evidencias_borradas} evidencia(s).`
        );
        setDetalleProceso(null);
        setEvalProceso(null);
      } else {
        const resultado = await borrarSolicitud(item.id);
        setAviso(
          resultado.proceso_borrado
            ? `Solicitud "${resultado.centro_nombre || ''}" borrada, junto con su proceso (${resultado.aportaciones_borradas} aportación(es), ${resultado.evidencias_borradas} evidencia(s)).`
            : `Solicitud "${resultado.centro_nombre || ''}" borrada.`
        );
      }
      setBorrarModal(null);
      setBorrarConfirmTexto('');
      await recargar();
    } catch (e) {
      setErrorPanel(`No se pudo borrar ${item.tipo === 'proceso' ? 'el proceso' : 'la solicitud'}: ` + (e.message || e));
    } finally {
      setAccionando(false);
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

  // ── Detalle de aportaciones de un proceso (vista del evaluador) ──
  if (detalleProceso) {
    const p = detalleProceso;
    const tipo = p.tipo_institucion;
    const s = evalProceso ? calcStats(evalProceso.state, tipo) : null;
    const nv = s ? getNivel(s) : null;
    const puedeIniciarEvaluacion = p.estado === 'cerrada';
    const puedeMarcarSubsanacion = p.estado === 'en_evaluacion';
    const puedeEnviarSubsanacion = p.estado === 'en_evaluacion';
    const puedeEvaluacionFinal = p.estado === 'en_evaluacion';
    const puedeReabrir = ['cerrada', 'en_evaluacion', 'en_subsanacion', 'en_revision_final'].includes(p.estado);

    const itemsSubsanacion = evalProceso
      ? Object.entries(evalProceso.subsanacion || {})
          .filter(([, v]) => v.requiere)
          .map(([bpId, v]) => ({ bpId, ...v, texto: BPS.find((b) => b.id === bpId)?.text || bpId }))
      : [];

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
          {errorPanel && (
            <div style={{ background: '#FDECEA', border: '1px solid var(--red)', borderRadius: 'var(--rs)', padding: 12, fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 14 }}>
              {errorPanel}
            </div>
          )}
          {aviso && (
            <div style={{ background: '#F1F8F1', border: '1px solid #A5D6A7', borderRadius: 'var(--rs)', padding: 12, fontSize: 12, fontWeight: 700, color: '#2E7D32', marginBottom: 14, lineHeight: 1.5 }}>
              {aviso}
            </div>
          )}

          {/* ── Acciones de la máquina de estados ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {puedeIniciarEvaluacion && (
              <button className="exp-btn" disabled={accionando} onClick={() => handleIniciarEvaluacion(p)}>
                🔍 Iniciar evaluación
              </button>
            )}
            {puedeEnviarSubsanacion && (
              <button
                className="exp-btn"
                style={{ background: '#FF7043' }}
                disabled={accionando || itemsSubsanacion.length === 0}
                onClick={() => handleEnviarSubsanacion(p)}
                title={itemsSubsanacion.length === 0 ? 'Marca al menos un estándar como "requiere subsanación" primero' : ''}
              >
                ⚠ Enviar a subsanación ({itemsSubsanacion.length} marcado{itemsSubsanacion.length === 1 ? '' : 's'})
              </button>
            )}
            {puedeEvaluacionFinal && (
              <button
                className="exp-btn"
                style={{ background: '#4CAF50' }}
                disabled={accionando}
                onClick={() => handleEvaluacionFinal(p, tipo)}
              >
                🏁 Cerrar evaluación final
              </button>
            )}
            {puedeReabrir && (
              <button
                className="lock-btn"
                style={{ borderColor: '#FFB300', color: '#FF8F00' }}
                disabled={accionando}
                onClick={() => handleReabrir(p)}
              >
                ↺ Reabrir proceso (excepcional)
              </button>
            )}
            <button
              className="lock-btn"
              style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
              disabled={accionando}
              onClick={() => {
                setBorrarModal({ tipo: 'proceso', id: p.id, label: p.num_identificativo });
                setBorrarConfirmTexto('');
              }}
            >
              🗑️ Borrar proceso (irreversible)
            </button>
          </div>

          {cargandoEval && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Cargando aportaciones…</div>}

          {!cargandoEval && evalProceso && (
            <>
              <div style={{ background: nv.color, borderRadius: 'var(--r)', padding: 16, marginBottom: 16, color: 'white' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', opacity: 0.85 }}>
                  Nivel del Distintivo (calculado)
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{nv.txt}</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>{nv.sub}</div>
                <div style={{ fontSize: 12, marginTop: 8, opacity: 0.9 }}>
                  {s.totalCumpl}/{s.totalActive} cumplidas · {s.esenCumpl}/{s.esenTotal} esenciales
                </div>
              </div>

              {p.nivel_conseguido && (
                <div style={{ background: '#E8F5E9', border: '1px solid #4CAF50', borderRadius: 'var(--rs)', padding: 12, marginBottom: 16, fontSize: 13, fontWeight: 800, color: '#1B5E20' }}>
                  ✔ Nivel final registrado: {NIVEL_LABELS[p.nivel_conseguido]}
                </div>
              )}

              {/* Informe de subsanaciones — mismo contenido que ve el
                  solicitante en su Dashboard. */}
              {itemsSubsanacion.length > 0 && (
                <div style={{ background: '#FFF3E0', border: '1px solid #FFB74D', borderRadius: 'var(--rs)', padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#E65100', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                    ⚠ Informe de subsanaciones ({itemsSubsanacion.length})
                  </div>
                  {itemsSubsanacion.map((it) => (
                    <div key={it.bpId} style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong style={{ color: '#E65100' }}>{it.bpId}</strong> — {it.texto}: {it.nota || '(sin nota)'}
                    </div>
                  ))}
                </div>
              )}

              {[1, 2, 3, 4, 5, 6, 7].map((dim) => {
                const bpsDelDim = BPS.filter((bp) => bp.dim === dim && isActive(bp, tipo));
                if (bpsDelDim.length === 0) return null;
                return (
                  <div key={dim} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--turq)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      {DIM_NAMES[dim]}
                    </div>
                    {bpsDelDim.map((bp) => {
                      const sub = evalProceso.subsanacion[bp.id] || {};
                      return (
                        <div key={bp.id} style={{ marginBottom: 6 }}>
                          <BpCard
                            bp={bp}
                            checked={!!evalProceso.state[bp.id]}
                            obsValue={evalProceso.obs[bp.id]}
                            files={evalProceso.files[bp.id]}
                            hidden={false}
                            locked={true}
                            requiereSubsanacion={sub.requiere}
                            notaSubsanacion={sub.nota}
                            onToggle={() => {}}
                            onObs={() => {}}
                            onAddFile={() => {}}
                            onRemoveFile={() => {}}
                          />
                          {/* Control del evaluador para marcar subsanación,
                              solo disponible mientras el proceso está
                              "en_evaluacion". */}
                          {puedeMarcarSubsanacion && (
                            <div
                              style={{
                                background: '#FAFAFA',
                                border: '1px solid #EEE',
                                borderTop: 'none',
                                borderRadius: '0 0 10px 10px',
                                padding: 10,
                                marginTop: -6,
                                fontSize: 12,
                              }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={!!sub.requiere}
                                  onChange={() => toggleSubsanacion(bp, sub.aportacionId, !!sub.requiere)}
                                />
                                Requiere subsanación
                              </label>
                              {sub.requiere && (
                                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                                  <input
                                    type="text"
                                    placeholder="¿Qué debe corregir el solicitante?"
                                    value={notasDraft[bp.id] ?? sub.nota ?? ''}
                                    onChange={(e) => setNotasDraft((prev) => ({ ...prev, [bp.id]: e.target.value }))}
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #DDD', fontSize: 12 }}
                                  />
                                  <button
                                    className="exp-btn"
                                    style={{ padding: '6px 12px', fontSize: 11, width: 'auto' }}
                                    disabled={accionando}
                                    onClick={() => guardarNota(sub.aportacionId, true, notasDraft[bp.id] ?? sub.nota ?? '')}
                                  >
                                    Guardar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              setAviso('');
              setErrorPanel('');
            }}
          >
            ← Volver al listado
          </button>
        </div>
        <BrandFooter />

        {/* Modal de borrado — doble confirmación escribiendo "BORRAR" */}
        <div className={`modal-overlay${borrarModal ? ' open' : ''}`}>
          <div className="modal-box">
            <div className="modal-icon">🗑️</div>
            <div className="modal-title">
              Borrar {borrarModal?.tipo === 'solicitud' ? 'solicitud' : 'proceso'} {borrarModal?.label}
            </div>
            <div className="modal-text">
              Esta acción es <strong>irreversible</strong>:{' '}
              {borrarModal?.tipo === 'solicitud'
                ? 'se eliminará la solicitud y, si ya tiene un proceso de acreditación vinculado, también ese proceso completo con sus aportaciones y evidencias.'
                : 'se eliminarán todas las aportaciones, evidencias (incluidos los archivos PDF) y el proceso completo.'}{' '}
              Pensado solo para limpieza de pruebas.
              <br />
              <br />
              Escribe <strong>BORRAR</strong> para confirmar:
            </div>
            <input
              type="text"
              value={borrarConfirmTexto}
              onChange={(e) => setBorrarConfirmTexto(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #DDD', marginTop: 10, marginBottom: 10, textAlign: 'center', fontWeight: 800 }}
              placeholder="BORRAR"
            />
            <div className="modal-btns">
              <button
                className="modal-btn cancel"
                onClick={() => {
                  setBorrarModal(null);
                  setBorrarConfirmTexto('');
                }}
              >
                Cancelar
              </button>
              <button
                className="modal-btn confirm"
                style={{ background: 'var(--red)' }}
                disabled={borrarConfirmTexto.trim().toUpperCase() !== 'BORRAR' || accionando}
                onClick={confirmarBorrado}
              >
                Borrar definitivamente
              </button>
            </div>
          </div>
        </div>
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
            <div
              key={s.id}
              style={{
                background: 'white',
                borderRadius: 'var(--rs)',
                padding: 12,
                boxShadow: '0 1px 6px rgba(0,0,0,.07)',
                borderLeft: `4px solid ${ESTADO_COLOR[s.estado] || '#BDBDBD'}`,
              }}
            >
              <button
                onClick={() => setDetalle(s)}
                style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer' }}
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
              <button
                className="lock-btn"
                style={{ padding: '4px 10px', fontSize: 11, width: 'auto', marginTop: 8, borderColor: 'var(--red)', color: 'var(--red)' }}
                onClick={() =>
                  setBorrarModal({
                    tipo: 'solicitud',
                    id: s.id,
                    label: s.centro_nombre || categoriaLabel(s.categoria),
                  })
                }
              >
                🗑️ Borrar solicitud
              </button>
            </div>
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
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  className="exp-btn"
                  style={{ padding: '6px 10px', fontSize: 12, width: 'auto', flex: 1 }}
                  onClick={() => abrirProceso(p)}
                >
                  📋 Ver aportaciones
                </button>
                <button
                  className="lock-btn"
                  style={{ padding: '6px 10px', fontSize: 12, width: 'auto', borderColor: 'var(--red)', color: 'var(--red)' }}
                  onClick={() => {
                    setBorrarModal({ tipo: 'proceso', id: p.id, label: p.num_identificativo });
                    setBorrarConfirmTexto('');
                  }}
                >
                  🗑️
                </button>
              </div>
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

      {/* Modal de borrado accesible también desde el listado principal */}
      <div className={`modal-overlay${borrarModal && !detalleProceso ? ' open' : ''}`}>
        <div className="modal-box">
          <div className="modal-icon">🗑️</div>
          <div className="modal-title">
            Borrar {borrarModal?.tipo === 'solicitud' ? 'solicitud' : 'proceso'} {borrarModal?.label}
          </div>
          <div className="modal-text">
            Esta acción es <strong>irreversible</strong>:{' '}
            {borrarModal?.tipo === 'solicitud'
              ? 'se eliminará la solicitud y, si ya tiene un proceso de acreditación vinculado, también ese proceso completo con sus aportaciones y evidencias.'
              : 'se eliminarán todas las aportaciones, evidencias (incluidos los archivos PDF) y el proceso completo.'}{' '}
            Pensado solo para limpieza de pruebas.
            <br />
            <br />
            Escribe <strong>BORRAR</strong> para confirmar:
          </div>
          <input
            type="text"
            value={borrarConfirmTexto}
            onChange={(e) => setBorrarConfirmTexto(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #DDD', marginTop: 10, marginBottom: 10, textAlign: 'center', fontWeight: 800 }}
            placeholder="BORRAR"
          />
          <div className="modal-btns">
            <button
              className="modal-btn cancel"
              onClick={() => {
                setBorrarModal(null);
                setBorrarConfirmTexto('');
              }}
            >
              Cancelar
            </button>
            <button
              className="modal-btn confirm"
              style={{ background: 'var(--red)' }}
              disabled={borrarConfirmTexto.trim().toUpperCase() !== 'BORRAR' || accionando}
              onClick={confirmarBorrado}
            >
              Borrar definitivamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
