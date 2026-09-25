# C4TALOGO — Reglas y Contexto del Proyecto para Asistentes de IA (AGY / Gemini / Cursor)

Este archivo define las reglas obligatorias, patrones arquitectónicos y contexto de dominio para cualquier agente de IA que trabaje en este repositorio.

---

## 📚 Documentación de Referencia Obligatoria
Antes de modificar cualquier funcionalidad o proponer cambios, consulta los documentos maestros del proyecto:
1. [ARCHITECTURE.md](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/ARCHITECTURE.md): Diagrama global C4, flujo de datos, sincronización espejo y entrega de imágenes.
2. [PROJECT_INDEX.md](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/PROJECT_INDEX.md): Catálogo exhaustivo de archivos, responsabilidades y guía "qué editar según el requerimiento".
3. [supabase/AUDIT_SCHEMA.sql](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/supabase/AUDIT_SCHEMA.sql): DDL auditado y consolidado de Supabase (tablas, RLS, triggers y funciones de seguridad).

---

## 🏛️ Reglas Arquitectónicas Innegociables

### 1. Cero Sharp en el Servidor (Sharp-Free Architecture)
* **PROHIBIDO** importar o instalar `sharp` para procesar imágenes dentro de Next.js.
* El pipeline es estrictamente:
  `Google Drive -> Buffer de Memoria en RAM -> Cloudflare R2 -> Imgproxy (On-Demand)`.

### 2. Claves de R2 Relativas y Versionadas por Hash
* Las claves en Cloudflare R2 siguen el patrón inmutable canónico:
  `tenants/${tenantId}/${folderType}/${slug}-${fileId}-${contentHash}.${ext}`
* Donde `contentHash` es el `md5Checksum` de Google Drive.
* Si una foto se edita en Drive, el hash cambia, se sube la nueva versión y se elimina la anterior de R2 (`deleteObjectFromR2`).
* En Supabase solo se almacenan **claves relativas**, nunca URLs absolutas.

### 3. Seguridad de Imgproxy (HMAC-SHA256)
* Todas las URLs de Imgproxy deben generarse en el backend (Server Components, Server Actions o API Handlers) mediante `generateSignedImgproxyUrl`.
* **Nunca** exponer `IMGPROXY_KEY` ni `IMGPROXY_SALT` en el frontend.
* Para lograr apertura instantánea en el Lightbox (0ms sin spinner), la tarjeta de la grilla (`thumbnailLink`) y el Lightbox (`fullLink`) deben compartir la misma URL de `ImgproxyProfiles.catalog(r2_key)` (`1080px` WebP, calidad 80).

### 4. Sincronización Incremental Espejo & Self-Healing
* En [src/lib/multitenant-sync.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/multitenant-sync.ts):
  * **Pre-carga en RAM**: Siempre cargar álbumes y fotos del tenant en 2 únicas consultas al inicio (`Map`).
  * **Self-Healing**: Verificar una foto de muestra en R2 (`checkObjectExistsInR2`). Si la carpeta fue borrada manualmente en R2, activar `forceReupload = true` automáticamente.
  * **Orden Natural**: Ordenar carpetas y fotos alfanuméricamente por nombre (`localeCompare(..., { numeric: true })`) antes de indexar, para que coincida exactamente con la vista de Google Drive.
  * **Limpieza de Bajas**: Las fotos y álbumes eliminados en Drive deben borrarse en cascada de Supabase y R2.

### 5. Multi-Tenancy y Supabase Auth / RLS
* **Identidad**: Nunca insertar usuarios manualmente en `tenant_users`. Dejar que Supabase Auth maneje `auth.users` y el trigger `handle_new_user()` cree el tenant con rol `owner`.
* **Roles**:
  * `superadmin`: Acceso global a la plataforma (`app.c4talogo.com`).
  * `owner`: Dueño de su propio catálogo / tienda (`c4talogo.com/dashboard`).
* Todas las tablas de `public` deben tener RLS habilitado y usar las funciones de seguridad del esquema `private` (`private.has_tenant_access`, `private.is_superadmin`).

### 6. Enrutamiento y Dominios
* Toda la lógica de dominios reside en [src/middleware.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/middleware.ts):
  * `app.c4talogo.com` -> `/superadmin`
  * `[subdominio].c4talogo.com` -> `/t/[subdomain]`
  * `c4talogo.com` -> `/`, `/login`, `/dashboard`, `/privacy`, `/terms`
