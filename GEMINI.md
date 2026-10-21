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
  `Google Drive -> Buffer de Memoria en RAM -> Cloudflare R2 -> Cloudflare Image Resizing (On-Demand at Edge)`.
* Cero consumo de CPU en el VPS para compresión de imágenes; Cloudflare procesa y sirve AVIF/WebP al vuelo.

### 2. Claves de R2 Relativas y Versionadas por Hash
* Las claves en Cloudflare R2 siguen el patrón inmutable canónico:
  `tenants/${tenantId}/${folderType}/${slug}-${fileId}-${contentHash}.${ext}`
* Donde `contentHash` es el `md5Checksum` de Google Drive.
* Si una foto se edita en Drive, el hash cambia, se sube la nueva versión y se elimina la anterior de R2 (`deleteObjectFromR2`).
* En Supabase solo se almacenan **claves relativas**, nunca URLs absolutas.

### 3. Entrega de Imágenes con Cloudflare Image Resizing
* Las imágenes se sirven directamente a través de Cloudflare Image Resizing sobre el dominio del bucket R2 (`https://cdn.c4talogo.com/cdn-cgi/image/...`) mediante [src/lib/cloudflare-images.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/cloudflare-images.ts).
* Perfiles estandarizados:
  * `grid`: 800px ancho, WebP/AVIF auto, calidad 85 (~15–30 kB).
  * `cover`: 600x600px cuadrado con smart-crop (`gravity=auto`, `fit=cover`).
  * `catalog` / `lightbox`: 1600px ancho HD.
* Para lograr apertura instantánea en el Lightbox (0ms sin spinner), se utiliza carga progresiva vía `srcSet` y precarga al interactuar (`onMouseEnter`/`onTouchStart`).

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

### 7. Estrategia de Purga en Cloudflare (Cola en Memoria, Batching y Planes Free)
* Cloudflare habilitó oficialmente la **purga por Hostname** (`hosts: [tenantHost]`), por **URL** (`files: [...]`) y por **Prefix** para **todos los planes (incluyendo Free)**.
* **Cola con Batching Automático ([src/lib/cloudflare.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/cloudflare.ts))**:
  * Unifica llamadas concurrentes mediante una ventana de debounce de 1500ms. Si múltiples usuarios sincronizan a la vez, se agrupan hasta 100 subdominios en **una sola petición** a Cloudflare, reduciendo drásticamente el consumo de cuota API.
  * Si Cloudflare responde `429 Too Many Requests`, la cola lee la cabecera `Retry-After`, pausa y reintenta de forma automática con retroceso exponencial.
  * Dispone de un `safetyTimeout` (8s) para nunca colgar la sincronización del usuario en el dashboard.
* Rate limit de la API en plan Free: 5 solicitudes de purga por minuto (bucket de 25).
* Las páginas HTML de catálogos dinámicos nunca deben enviar `s-maxage` alto en Edge; se sirven con `max-age=0, must-revalidate` desde la memoria RAM de Next.js (~10ms) para garantizar actualizaciones instantáneas al sincronizar.

### 8. Navegación en Cliente (0ms) y Revalidación Asíncrona (RSC + In-Memory Amortizer)
* **Navegación Instantánea en Cliente**: En [src/components/CatalogView.tsx](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/components/CatalogView.tsx), el estado de navegación (`activePath`) y el árbol visual se resuelven en memoria local con `useMemo` y `findPathToAlbum`, logrando cambios de carpeta y botones atrás/adelante en 0ms sin pantallas de carga ni bloqueos de red.
* **Revalidación Asíncrona de Fondo (`router.refresh()`)**: Al navegar o al re-enfocar la pestaña del catálogo, se dispara un `router.refresh()` en background. Transfiere micro-cargas útiles de React Server Components (~4.7-5.3 KB de texto), permitiendo que si una foto fue editada o eliminada en Drive/R2, React concilie el Virtual DOM quirúrgicamente sin recargar la página completa ni provocar parpadeo visual.
* **Throttle de Eventos del Navegador**: El listener de `visibilitychange` y `focus` implementa un limitador estricto de **3 segundos** para prevenir ráfagas de consultas duplicadas al alternar pestañas o hacer Alt+Tab.
* **Caché en RAM de Alta Velocidad ([src/lib/catalog-db.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/catalog-db.ts))**:
  * La estructura del catálogo del tenant se almacena en `memoryCatalogCache` (Map en Node.js RAM) con un TTL de 5 minutos (`CACHE_TTL_MS = 300000`).
  * Cada catálogo de 1,000 fotos consume únicamente ~300-400 KB de RAM (solo metadatos JSON; las fotos binarias residen en R2/Cloudflare CDN).
  * Protege a Supabase contra ráfagas concurrentes (máximo 1 lectura cada 5 minutos por tienda bajo tráfico continuo).
  * Se invalida inmediatamente (0ms) al finalizar una sincronización o modificar diseño/portada mediante `invalidateTenantCatalogCache(tenantId)`.
  * Cuenta con auto-eviction si el Map supera 300 tiendas activas, manteniendo la RAM permanentemente ligera (<100 MB).
### 9. Aislamiento Estricto de Traefik v3 en Docker Swarm (Prohibido Catch-All Genérico)
* **PROHIBIDO** usar `PathPrefix('/')` o comodines genéricos sin restricción de host en los routers de Traefik para el catálogo.
* El VPS comparte la red `r4tlabsnet` con otros servicios críticos del servidor (`ratportainer.r4tlabs.com`, `imgproxy.r4tlabs.com`, etc.). Un router genérico o un `PathPrefix('/')` intercepta las llamadas `/api` de Portainer y otros contenedores, rompiendo el acceso administrativo al panel.
* **Regla de Enrutamiento Válida en Traefik**:
  * Para admitir c4talogo.com, cualquier subdominio y cualquier dominio propio sin editar el compose, se utiliza la regla de exclusión estricta:
    `Host('c4talogo.com') || HostRegexp('.*\\.c4talogo\\.com') || !HostRegexp('.*\\.r4tlabs\\.com')`
  * Si un stack entra en conflicto de enrutamiento o bloquea Portainer en Docker Swarm, la recuperación inmediata por terminal SSH es:
    `docker stack rm c4talogo_platform`
    *(Es 100% seguro y no causa pérdida de datos: la base de datos reside en Supabase Cloud y las fotos en Cloudflare R2)*.
