# Distintivo Soludable — React + Vite + PWA

Migración de `distintivo_soludable_v6.html` al stack React + Vite + PWA + Tailwind,
con backend Supabase + Netlify (fases posteriores).

Desarrollado por DoncelProject · doncel.project@gmail.com

## Arrancar en local

```bash
npm install
npm run dev
```

## Estructura

```
src/
├─ data/bps.js           # 25 estándares (extraídos fielmente del v6)
├─ lib/
│  ├─ constants.js       # Tipos, Anexo I, estados, nº identificativo, enlaces
│  ├─ evaluacion.js      # Lógica fiel v6: isActive, isEsencial, calcStats, getNivel
│  └─ dataStore.js       # CAPA DE DATOS ÚNICA (localStorage → Supabase en Fase E)
├─ components/           # UI compartida
├─ pages/                # publico / solicitante / admin
└─ features/export/      # PDF y Excel (Fase B)
public/assets/           # Logos reales extraídos del v6
```

## Regla de oro

Ningún componente toca `localStorage` ni (futuro) Supabase directamente.
Todo pasa por `src/lib/dataStore.js`. Así la migración a Supabase (Fase E)
no requiere tocar componentes.

## Fases

- **A** (esta): scaffold + assets + datos + capa de datos. ✔
- **B**: autoevaluación completa (migración fiel del v6).
- **C**: formulario de solicitud + panel admin (datos simulados).
- **D**: Supabase (SQL, Auth, Storage, nº identificativo en servidor).
- **E**: conexión Supabase + Resend + deploy Netlify.
