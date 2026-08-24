# FotoProtector · Proyecto Soludable

**Versión:** 3.0
**Proyecto:** Soludable — Hospital Universitario Costa del Sol
**Desarrollador:** DoncelProject · doncel.project@gmail.com

---

## Novedades de la v3

El motor de decisión se ha reconstruido sobre el algoritmo de:

> González S, De Gálvez MV, De Troya M, Rodríguez-Luna A, Calzavara-Pinton P.
> *Personalized Medical Photoprotection: Determining Optimal Measures for Susceptible Patient Groups.*
> Open Dermatol J. 2023;17:e187437222212300. (Fig. 1, Tablas 1 y 2)

Cambios respecto a la v2:

- Matriz de necesidades de 12 dimensiones (Tabla 2) en lugar de reglas SPF acumulativas.
- Nuevas categorías de patología: hiperpigmentación, vitíligo, fotoenvejecimiento,
  psoriasis, fotodermatosis (además de atópica, rosácea, acné, lupus).
- Nuevo dominio de fotosensibilidad: fármacos, post-procedimiento, inmunosupresión, piel reactiva.
- Factores ambientales: contaminación, luz azul de pantallas (HEVL), infrarrojo.
- Fototipo con lógica diferenciada: I–II → SPF muy alto; III–VI → mayor UVA-PF y luz visible.
- Salida ampliada: protección específica (luz visible / IR-A / minerales de alta tolerancia),
  activos no filtrantes (antioxidantes, reparación de ADN, inmunomoduladores,
  antiinflamatorios, control del pigmento, no graso) y fotoprotección oral coadyuvante.
- Catálogo v3 con las columnas nuevas del Excel (vía, luz visible, IR, antioxidantes,
  reparación ADN, inmunomodulador, antiinflamatorio, control pigmento, no graso, activos declarados).
- Puntuación de productos: 3 puntos por dimensión de la matriz cumplida + 1 punto por tag de adherencia.

El resto de la aplicación (diseño, pantalla de clave, módulo UVI, impresión,
frase para farmacia, PWA, reparto de 2 productos por marca) se mantiene sin cambios.

## Dominios clínicos evaluados

1. Precáncer y cáncer cutáneo fotoinducido
2. Fototipo Fitzpatrick (I–VI)
3. Exposición solar y factores ambientales
4. Patología cutánea (categorías González et al.)
5. Fotosensibilidad y piel sensible
6. Grupo de edad
7. Tipo de piel
8. Factores de adherencia

## Limitaciones conocidas del catálogo v3

- **Columna «PROT. LUZ VISIBLE» vacía en las 81 filas del Excel.** La app infiere la
  protección frente a luz visible a partir del color/óxidos de hierro, los filtros
  minerales o Fernblock® del producto (González et al. 2023, refs. 20, 23, 24) y lo
  marca con asterisco en la ficha. Para eliminar la inferencia, rellena la columna M.
- **No hay productos de vía oral en el catálogo.** Cuando el algoritmo indica
  fotoprotección oral, se muestra como indicación clínica sin producto asociado.
- Se han eliminado 4 duplicados exactos (IDs 15, 71, 72, 80). El catálogo activo
  contiene 77 productos.

## Configuración

Edita `config.js` directamente desde GitHub para cambiar la clave de acceso:

```js
var CONFIG = {
  ACCESS_KEY: "soludable2026",   // ← cambia esto
  APP_VERSION: "3.0",
  ...
};
```

## Despliegue en Netlify

1. Sube esta carpeta a un repositorio de GitHub
2. Conecta el repo en Netlify → Build Settings: sin comando de build, publish directory: `/`
3. Netlify desplegará automáticamente en cada push

## Notas técnicas

- JavaScript ES5 clásico (compatible con iOS Safari)
- Sin dependencias externas (excepto Google Fonts y Open-Meteo para UVI)
- Catálogo de 77 productos con fotos embebidas en base64
- Funciona offline como PWA (`sw.js` con caché `fotoprotector-v3`)
- `config.js` editable desde GitHub sin tocar el código principal

---

© Proyecto Soludable · Hospital Universitario Costa del Sol · Junta de Andalucía
Desarrollado por DoncelProject · doncel.project@gmail.com
