# Auditoría de Seguridad ADA-CASA y Correcciones Pendientes

Lista priorizada de tareas detectadas en la auditoría del 2026-11-24 sobre `main` (`7caec8f`), ordenada de mayor a menor urgencia de cara a la certificación **TAC Security / ADA-CASA** (requerida por el scope `drive.readonly`) y la estabilidad en producción.

---

## Prioridad 0 — Bloqueantes Críticos ADA-CASA (Resolver antes de enviar a auditoría)

- [x] **P0-1: Blindar `state` en OAuth 2.0 de Google contra CSRF y vinculación cruzada**
  - **Archivos:** `src/app/api/auth/google/route.ts`, `src/lib/google-auth.ts`, `src/app/api/auth/google/callback/route.ts`, `src/lib/oauth-state.ts`
  - **Estado:** Implementado el 2026-11-24. `state` firmado HMAC-SHA256 + cookie `HttpOnly; SameSite=Lax` + verificación estricta de sesión y membresía en el callback. Cubierto en `tests/oauth-security.test.mjs`.

- [x] **P0-2: Eliminar Host Header Injection y Open Redirect en el flujo OAuth**
  - **Archivos:** `src/app/api/auth/google/route.ts`, `src/app/api/auth/google/callback/route.ts`, `src/lib/oauth-state.ts`, `docker-compose.yml`
  - **Estado:** Implementado el 2026-11-24 vía `resolveSafeAppOrigin` con lista blanca estricta, códigos de error genéricos en callback y variables declaradas en `docker-compose.yml`.

- [x] **P0-3: Cerrar Open Redirect en `/login?redirect=...`**
  - **Archivos:** `src/app/login/page.tsx`, `src/lib/safe-redirect.ts`
  - **Estado:** Implementado el 2026-11-24 con `sanitizeInternalRedirect` y cubierto en `tests/oauth-security.test.mjs`.

- [x] **P0-4: Cerrar inyección de filtro PostgREST en `catalog-db.ts` y acceso directo a `/t/`**
  - **Archivos:** `src/lib/catalog-db.ts`, `src/lib/tenant-host.ts`, `src/proxy.ts`
  - **Estado:** Implementado el 2026-11-24 validando `isValidTenantKey(subdomain)` antes de `.or(...)` y bloqueando `/t/` directo en el dominio raíz desde `proxy.ts`.

---

## Prioridad 1 — Seguridad Media-Alta / Hallazgos DAST-SAST (ADA-CASA)

- [x] **P1-1: Restringir SSRF y sanitizar cabeceras en `/api/download`**
  - **Archivo:** `src/app/api/download/route.ts`
  - **Estado:** Implementado el 2026-11-24. Exige `https:`, elimina wildcard `*.r2.cloudflarestorage.com`, usa `redirect: 'error'`, valida `Content-Type` (`image/*` / `application/octet-stream`) y limpia caracteres de control en `filename`.

- [x] **P1-2: Sanitizar `linkHref` contra Stored XSS (`javascript:` / `data:`) en bloques de Storefront**
  - **Archivos:** `src/lib/safe-redirect.ts`, `src/components/storefront/HeroBanner.tsx`, `PromoGrid.tsx`, `CategoryCarousel.tsx`, `ClassicGrid.tsx`
  - **Estado:** Implementado el 2026-11-24 con `sanitizeSafeHref` y cubierto en `tests/oauth-security.test.mjs`.

- [x] **P1-3: Escapar `\` en búsqueda de Google Drive (`drive.files.list`)**
  - **Archivo:** `src/lib/google-auth.ts` (línea 129)
  - **Estado:** Implementado el 2026-11-24 (`replace(/\\/g, '\\\\').replace(/'/g, "\\'")`).

- [x] **P1-4: Ocultar `error.message` internos en respuestas API 500 y evaluar Rate Limiting**
  - **Archivos:** `src/lib/rate-limit.ts`, `src/app/api/auth/google/route.ts`, `src/app/api/sync/route.ts`, `src/app/api/drive/folders/route.ts`, `src/app/api/config/route.ts`, `src/app/api/storefront/route.ts`, `src/app/api/analytics/*`, `src/app/api/superadmin/*`, `src/app/api/tenant/auto-provision/route.ts`
  - **Estado:** Implementado el 2026-11-24. Rate limiting en memoria sobre OAuth/Sync/Drive y mensajes genéricos en errores 500.

- [x] **P1-5: Revisar y acotar `Content-Security-Policy` en `next.config.ts`**
  - **Archivo:** `next.config.ts` (líneas 29–42)
  - **Estado:** Implementado el 2026-11-24. `connect-src` acotado a los dominios reales del sistema (sin `https:`/`wss:` globales) y `'unsafe-eval'` eliminado en producción.

- [ ] **P1-6: Limpiar alertas de Security Advisor en Supabase (`handle_auto_superadmin` + `search_path`) y verificar cifrado de 3 tokens restantes**
  - **Origen:** Verificación en vivo vía Supabase MCP (`eqnzuojbpbatwlgwfwmk`) el 2026-11-24.
  - **Estado:**
    - [x] Migración `20261124233517_harden_trigger_functions_and_search_path` aplicada en vivo y sincronizada en `supabase/migrations/` + `supabase/schema.sql`. Security Advisor quedó con **0 alertas (`lints: []`)**.
    - [ ] Confirmar que `TOKEN_ENCRYPTION_KEY` esté activa en Portainer y disparar sync / rotación en las **3 tiendas restantes** con tokens sin prefijo `v1:`.

---

## Prioridad 2 — Bugs Funcionales y Operativos en Producción

- [x] **P2-1: Declarar `TOKEN_ENCRYPTION_KEY` (y URLs OAuth) en `docker-compose.yml`**
  - **Archivo:** `docker-compose.yml` (líneas 13–47)
  - **Estado:** Declaradas `TOKEN_ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`, `NEXT_PUBLIC_APP_URL` y `GOOGLE_REDIRECT_URI` en `environment:` el 2026-11-24. (Pendiente verificar el valor de `TOKEN_ENCRYPTION_KEY` en el entorno del stack en Portainer).

- [x] **P2-2: Migrar `active_landing` de archivo local efímero (`system_settings.json`) a Supabase**
  - **Archivos:** `src/lib/system-settings.ts`, `src/app/api/superadmin/settings/route.ts`, `src/app/page.tsx`
  - **Estado:** Implementado el 2026-11-24 usando `public.system_settings` en Supabase con caché RAM de 30s e invalidación al guardar.

- [x] **P2-3: Corregir Storefront Builder ilegible en modo oscuro del panel**
  - **Archivos:** `src/app/dashboard/page.tsx`, `tests/design-invariants.test.mjs`
  - **Estado:** Implementado el 2026-11-24 quitando el wrapper `bg-white text-gray-900` y añadiendo test invariante en `design-invariants.test.mjs`.

- [x] **P2-4: Paginar `auth.admin.listUsers()` en endpoints de SuperAdmin y unificar email superadmin**
  - **Archivos:** `src/lib/supabase/admin.ts`, `src/app/api/superadmin/tenants/route.ts`, `create/route.ts`, `whitelist/route.ts`, `src/app/api/tenant/auto-provision/route.ts`
  - **Estado:** Implementado el 2026-11-24 con `listAllAuthUsers` y lista alineada de correos superadmin.

- [x] **P2-5: Corregir invalidación de caché en portadas de álbumes y acciones de SuperAdmin**
  - **Archivos:** `src/app/dashboard/page.tsx`, `src/app/superadmin/page.tsx`, `src/app/api/superadmin/tenants/update/route.ts`, `src/app/api/config/route.ts`
  - **Estado:** Implementado el 2026-11-24. `handleSaveCoverChanges` guarda `albums.cover_photo_r2_key` antes de invalidar caché en `/api/config`, `/api/config` devuelve `updated`, y `/superadmin` cambia estado/plan vía `/api/superadmin/tenants/update` purgando RAM y Cloudflare.

---

## Prioridad 3 — Higiene Técnica y Verificación Pendiente

- [ ] **P3-1: Probar `supabase/schema.sql` de punta a punta en Postgres limpio**
  - **Referencia:** `supabase/README.md` (deuda documentada por la sesión anterior).
  - **Acción:** Ejecutar `schema.sql` en un Postgres 17 limpio (contenedor temporal en VPS o Supabase branch) para confirmar que reconstruye las 11 tablas, 24 policies, 10 funciones y 2 triggers en una sola pasada sin errores de orden.

- [ ] **P3-2: Limpiar warnings/errores de `npm run lint` (`no-explicit-any` y `prefer-const`)**
  - **Estado actual:** `206` problemas (`178` errores, `28` warnings). No bloquean `next build`, pero limpiarlos permite activar `npm run lint` como gate estricto en `.github/workflows/deploy.yml`.

- [ ] **P3-3: Mover o ignorar `SCALABILITY_ANALYSIS.md` y decidir qué hacer con `src/app/api/config/route.ts` (`data.updated`)**
  - Verificar que `SCALABILITY_ANALYSIS.md` no quede como archivo sin seguimiento accidental (o añadirlo a `.gitignore` si es nota local), y devolver `updated` en `/api/config` para actualizar el header del dashboard al instante.
