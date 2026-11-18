# Arreglos de lo auditado

Corregir los defectos que salieron del audit del 2026-11-18, en unidades separadas para que
cada una se revise sola.

## Specs

**S1** — La regla de lint que marca cada defecto debe dejar de dispararse en ese archivo, y
ninguna regla nueva debe aparecer.

**S2** — El comportamiento visible no cambia. Son correcciones de pureza y de orden de hooks,
no rediseños: el catálogo, el hero y los efectos se ven y funcionan igual que antes.

**S3** — Verificación con lo que hay: `eslint` sobre el archivo (la regla específica
desaparece), `tsc --noEmit` y `npm run build` en 0, y `npm test` sigue verde. **No hay test de
componentes** en el repo (no hay jsdom ni testing-library, y agregarlos sería una dependencia
nueva, que es una decisión aparte). Se declara, no se disimula.

**S4** — Los cambios de base van como **migración registrada**, no como SQL suelto.

**No-objetivo explícito**: `src/middleware.ts` → `proxy` (deprecación de Next 16) queda para su
propia unidad, después. Es el enrutador que sirve las 9 tiendas y merece estar solo.

## Tasks

- [x] **T1** — `src/components/CatalogView.tsx`: `useMemo` de `plugins` está **después de un
  early return**, lo que viola el orden de hooks (`react-hooks/rules-of-hooks`, línea 326).
  Mover el hook arriba del return, sin cambiar su memoización.
- [x] **T2** — `src/components/storefront/HeroBanner.tsx`: `Content` se define **dentro del
  render** (`react-hooks/static-components`, líneas 24 y 53/55). Convertirlo en un elemento
  JSX, que es un valor y no un componente.
- [x] **T3** — `src/components/ClickEffects.tsx`: `Math.random()` **durante el render**
  (`react-hooks/purity`, líneas 60-61). Mover el azar al momento de crear la partícula, que es
  donde corresponde, y de paso sacar el parámetro `i` sin usar.
- **T4 — DESCARTADA, con evidencia.** El planteo original era agregar índices en
  `albums.parent_id`, `photos.album_id` y `tenants.plan_id`. **Es incorrecto**: ya existen y
  son los índices más usados del esquema.

  ```
  idx_photos_tenant_album  = (tenant_id, album_id)    56.155 scans · 3.262.832 tuplas
  idx_albums_tenant_parent = (tenant_id, parent_id)    3.406 scans ·   153.952 tuplas
  albums.idx_albums_tenant_slug = (tenant_id, slug)         0 scans
  ```

  Son **compuestos con `tenant_id` al frente**, que es exactamente como consulta
  `catalog-db.ts`, y se usan decenas de miles de veces. El advisor de Supabase marca "FK sin
  índice" pensando en el borrado de la fila padre, no en el patrón de acceso; y las tablas
tienen entre 9 y 240 filas. Agregar índices sueltos encima sería overhead de escritura para
un camino ya cubierto.
  Queda como opción de higiene, sin valor medible: borrar `idx_albums_tenant_slug` (0 scans).
- [ ] **T5** — `src/middleware.ts` → `proxy` (deprecación de Next 16). Diferido a propósito.

## Log

**L1** (pedido original, textual): "ok bien, entonces ya lo que tienes audtido como dices,
arregalas".

**L2** (evidencia, `npm run lint` del 2026-11-18, salida textual):
```
src/components/CatalogView.tsx
  326:21  error  React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return?  react-hooks/rules-of-hooks

src/components/storefront/HeroBanner.tsx
   53:67  error  Error: Cannot create components during render ...
   55:13  error  Error: Cannot create components during render ...
   react-hooks/static-components

src/components/ClickEffects.tsx
   60:43  error  Error: Cannot call impure function during render ... Math.random ...  react-hooks/purity
   61:43  error  Error: Cannot call impure function during render ... Math.random ...  react-hooks/purity
```

**L3** (evidencia, T1 a T3 hechos): `eslint` sobre los 3 archivos después del cambio pasa de
6 errores a 2, y **las 3 reglas objetivo quedan en 0 instancias**. Los 2 errores que quedan son
`no-explicit-any` preexistentes, compartidos con 203 más en todo el repo. Además desaparece el
warning de `i` sin usar. `tsc --noEmit` 0, `npm test` 8/8, `npm run build` 0.

**L4** (límite declarado, S3): no hay test de componentes en el repo (ni jsdom ni
testing-library), así que estos 3 arreglos **no tienen prueba automatizada de comportamiento**.
Lo que hay es la regla de lint que deja de dispararse, el typecheck y el build. Agregar
jsdom + testing-library es una dependencia nueva, o sea una decisión aparte.
