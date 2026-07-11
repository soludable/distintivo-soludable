import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLOQUES_SOLICITUD } from '../../data/solicitudSchema.js';
import { crearSolicitud, getProvincias, getMunicipios } from '../../lib/dataStore.js';
import FormField from '../../components/FormField.jsx';
import BrandFooter from '../../components/BrandFooter.jsx';

function todosLosCampos() {
  return BLOQUES_SOLICITUD.flatMap((b) => b.campos);
}

function visible(campo, form) {
  if (!campo.dependeDe) return true;
  return form[campo.dependeDe] === campo.dependeValor;
}

export default function SolicitudForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [errores, setErrores] = useState({});
  const [enviada, setEnviada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [provincias, setProvincias] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [cargandoMunicipios, setCargandoMunicipios] = useState(false);

  useEffect(() => {
    getProvincias()
      .then(setProvincias)
      .catch((e) => setErrorEnvio('No se pudo cargar el listado de provincias: ' + e.message));
  }, []);

  useEffect(() => {
    if (!form.provincia) {
      setMunicipios([]);
      return;
    }
    setCargandoMunicipios(true);
    getMunicipios(form.provincia)
      .then(setMunicipios)
      .catch((e) => setErrorEnvio('No se pudo cargar el listado de municipios: ' + e.message))
      .finally(() => setCargandoMunicipios(false));
  }, [form.provincia]);

  function setCampo(id, val) {
    setForm((f) => {
      const next = { ...f, [id]: val };
      if (id === 'provincia') next.municipio = ''; // provincia cambia -> resetea municipio
      return next;
    });
    setErrores((e) => ({ ...e, [id]: undefined }));
  }

  // Inyecta las opciones reales (provincia/municipio) en los campos 'geo'
  // definidos en el esquema, sin tocar el esquema en sí.
  const bloquesConGeo = useMemo(() => {
    return BLOQUES_SOLICITUD.map((bloque) => ({
      ...bloque,
      campos: bloque.campos.map((campo) => {
        if (campo.tipo !== 'geo') return campo;
        if (campo.geoTipo === 'provincia') {
          return { ...campo, opciones: provincias.map((p) => ({ value: p.id, label: p.nombre })) };
        }
        if (campo.geoTipo === 'municipio') {
          return {
            ...campo,
            disabled: !form.provincia || cargandoMunicipios,
            placeholderDisabled: cargandoMunicipios
              ? 'Cargando municipios…'
              : '— Selecciona provincia primero —',
            opciones: municipios.map((m) => ({ value: m.ine, label: m.nombre })),
          };
        }
        return campo;
      }),
    }));
  }, [provincias, municipios, form.provincia, cargandoMunicipios]);

  function validar() {
    const errs = {};
    todosLosCampos().forEach((c) => {
      if (!visible(c, form)) return;
      const v = (form[c.id] || '').trim?.() ?? form[c.id] ?? '';
      if (c.req && !v) errs[c.id] = 'Campo obligatorio';
      else if (v && c.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        errs[c.id] = 'Correo no válido';
    });
    if (form.categoria === 'otros' && !(form.categoriaOtros || '').trim())
      errs.categoriaOtros = 'Especifica la categoría';
    setErrores(errs);
    return Object.keys(errs).length === 0;
  }

  async function confirmar() {
    if (!validar()) {
      const first = todosLosCampos().find((c) => visible(c, form) && c.req && !form[c.id]);
      if (first) document.getElementById(`f-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnviando(true);
    setErrorEnvio('');
    try {
      const { id } = await crearSolicitud(form);
      setEnviada({ id });
      window.scrollTo(0, 0);
    } catch (e) {
      setErrorEnvio('No se pudo enviar la solicitud: ' + (e.message || e));
    } finally {
      setEnviando(false);
    }
  }

  if (enviada) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: 24, maxWidth: 560, margin: '0 auto', width: '100%' }}>
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--r)',
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,.08)',
              textAlign: 'center',
              marginTop: 30,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <h2 style={{ color: 'var(--turq)', fontWeight: 900, marginBottom: 12 }}>
              Solicitud enviada
            </h2>
            <p style={{ color: 'var(--text2)', lineHeight: 1.6, fontSize: 14 }}>
              Soludable validará que su centro cumple los requisitos para participar y que
              la información aportada es correcta. Recibirá un aviso en su correo cuando
              termine esta validación. Si la solicitud es correcta, le enviaremos un enlace
              para que inicie su autoevaluación Soludable.
            </p>
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: 'var(--text3)',
                fontWeight: 700,
              }}
            >
              Referencia interna: {enviada.id.slice(0, 8)}
            </div>
            <button
              className="exp-btn"
              style={{ marginTop: 20 }}
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </button>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="header">
        <div className="header-top">
          <img className="header-logo-img" src="/assets/logo-soludable.png" alt="Soludable" />
          <div className="header-title">
            <h1>Solicitud de acreditación</h1>
            <p>Distintivo Soludable</p>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, padding: 16, maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text3)',
            fontWeight: 700,
            margin: '4px 0 16px',
          }}
        >
          Los campos con la marca <span style={{ color: 'var(--red)' }}>*</span> son
          obligatorios.
        </div>

        {errorEnvio && (
          <div
            style={{
              background: '#FDECEA',
              border: '1px solid var(--red)',
              borderRadius: 'var(--rs)',
              padding: 12,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--red)',
              marginBottom: 14,
            }}
          >
            {errorEnvio}
          </div>
        )}

        {bloquesConGeo.map((bloque) => (
          <div
            key={bloque.id}
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
                fontSize: 13,
                fontWeight: 900,
                color: 'var(--turq)',
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: '2px solid var(--gray2)',
              }}
            >
              {bloque.titulo}
            </div>
            {bloque.campos.filter((c) => visible(c, form)).map((campo) => (
              <div key={campo.id} id={`f-${campo.id}`}>
                <FormField
                  campo={campo}
                  value={form[campo.id]}
                  error={errores[campo.id]}
                  onChange={(v) => setCampo(campo.id, v)}
                />
              </div>
            ))}
          </div>
        ))}

        <button className="exp-btn" disabled={enviando} onClick={confirmar}>
          {enviando ? 'Enviando…' : '✔ Solicito iniciar proceso acreditativo'}
        </button>
        <button
          className="lock-btn"
          style={{ borderColor: 'var(--gray3)', color: 'var(--text2)' }}
          onClick={() => navigate('/criterios')}
        >
          ← Volver a criterios
        </button>
      </div>
      <BrandFooter />
    </div>
  );
}
