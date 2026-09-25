# C4TALOGO — Índice de Archivos y Mapa del Proyecto para IA

Este documento sirve como el **índice maestro** y mapa de navegación para asistentes de IA (Antigravity, Gemini, Claude, Cursor) y desarrolladores humanos. Permite localizar de inmediato la responsabilidad de cada archivo y saber qué editar según el requerimiento.

---

## 1. Enrutamiento y Páginas (`src/app`)

| Ruta del Archivo | Tipo | Responsabilidad / Descripción | Cuándo Modificar |
| :--- | :--- | :--- | :--- |
| `src/middleware.ts` | Edge Middleware | Enrutador maestro multi-tenant. Detecta si el hostname es `app.c4talogo.com` (Superadmin), `subdominio.c4talogo.com` (Storefront), dominio propio, o el dominio raíz. | Para añadir subdominios reservados, cambiar reglas de rewrite o cabeceras de caché Edge. |
| `src/app/page.tsx` | Server Component | Landing page principal de `c4talogo.com`. Presenta la propuesta de valor SaaS, llamada a la acción (CTA) y login/registro. | Para cambiar textos comerciales, precios o diseño de la página de inicio. |
| `src/app/login/page.tsx` | Client Component | Pantalla unificada de autenticación. Permite inicio de sesión con Google OAuth o Email/Contraseña vía Supabase Auth. | Para modificar el formulario de login, estilos o lógica de redirección post-login. |
| `src/app/dashboard/page.tsx` | Client Component | Panel de control principal del comerciante / inquilino. Modularizado en pestañas: Google Drive, Diseño, Efectos, Subdominio y Storefront Builder. | Para orquestar nuevas pestañas o métricas en el panel del inquilino. |
| `src/app/superadmin/page.tsx` | Client Component | Panel maestro accesible exclusivamente desde `app.c4talogo.com` para usuarios con rol `superadmin`. Gestiona todos los inquilinos, planes, estados y estadísticas globales. | Para añadir controles de facturación, suspensión o auditoría masiva de tiendas. |
| `src/app/t/[subdomain]/[[...slug]]/page.tsx` | Server Component (ISR) | Renderizador del catálogo público para cada subdominio (ej. `juanstore.c4talogo.com/0-abrigos`). Carga los datos desde `catalog-db.ts` y revalida por demanda. | Para ajustar metadatos SEO dinámicos, títulos de página o lógica de rutas de tienda. |
| `src/app/privacy/page.tsx` | Server Component | Política de Privacidad oficial con la cláusula legal obligatoria de *Limited Use* de Google API Services. | Para auditorías legales de Google OAuth o actualizaciones de términos de datos. |
| `src/app/terms/page.tsx` | Server Component | Términos y Condiciones de Servicio de la plataforma SaaS. | Para actualizar condiciones comerciales o legales. |
| `src/app/maintenance/page.tsx` | Server Component | Vista mostrada cuando una tienda está en mantenimiento o suspendida. | Para estilizar la pantalla de bloqueo de inquilinos. |
| `src/app/modaadmin/page.tsx` | Server Component | Ruta heredada/legacy; redirige permanentemente a `/dashboard`. | No tocar; mantener para retrocompatibilidad. |

---

## 2. API Routes (`src/app/api`)

| Endpoint | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| `/api/sync` | `src/app/api/sync/route.ts` | Inicia o consulta un proceso de sincronización para el tenant autenticado. Crea el registro en `sync_logs` y ejecuta `runTenantSync`. |
| `/api/status` | `src/app/api/status/route.ts` | Endpoint de polling para el dashboard. Devuelve el estado actual de sincronización, fotos procesadas y álbumes. |
| `/api/config` | `src/app/api/config/route.ts` | Obtiene y actualiza la configuración del tenant (`tenant_configs` y `tenants.subdomain`) con validación de colisiones de subdominio. |
| `/api/auth/google` | `src/app/api/auth/google/route.ts` | Genera la URL de consentimiento Google OAuth con scope `drive.readonly` para el tenant. |
| `/api/auth/google/callback` | `src/app/api/auth/google/callback/route.ts` | Procesa el `code` de Google OAuth, obtiene `refresh_token` y `access_token`, y los almacena en `google_integrations`. |
| `/api/drive/folders` | `src/app/api/drive/folders/route.ts` | Lista las carpetas disponibles en el Google Drive del usuario para seleccionar catálogo y portadas. |
| `/api/covers` | `src/app/api/covers/route.ts` | Lista las fotos disponibles en la carpeta `_covers` o catálogo para asignar como portada de álbum. |
| `/api/storefront` | `src/app/api/storefront/route.ts` | Guarda y recupera los bloques visuales configurados en el Storefront Builder (`tenant_configs.settings.storefront`). |
| `/api/image` | `src/app/api/image/route.ts` | Endpoint seguro para generar URLs firmadas de Imgproxy para recursos específicos. |
| `/api/health` | `src/app/api/health/route.ts` | Healthcheck para Docker, Traefik y monitoreo de uptime (retorna status 200). |
| `/api/analytics` | `src/app/api/analytics/route.ts` | Registro de visitas y eventos de visualización en catálogos públicos. |

---

## 3. Bibliotecas de Lógica de Negocio (`src/lib`)

| Archivo | Responsabilidad Primaria |
| :--- | :--- |
| `src/lib/multitenant-sync.ts` | **El Motor Central de Sincronización**. Pre-carga en RAM, verificación de integridad en Cloudflare R2 (self-healing), comparación por hash `md5Checksum`, orden natural de álbumes, detección de bajas/eliminaciones y purga en Cloudflare. |
| `src/lib/catalog-db.ts` | Carga y ensambla el árbol jerárquico de álbumes y fotos para el Storefront público (`loadTenantCatalog`). Excluye carpetas privadas (`_covers`), unifica URLs de imágenes para apertura a 0ms en Lightbox. |
| `src/lib/imgproxy.ts` | Generador de URLs firmadas criptográficamente con HMAC-SHA256 (`generateSignedImgproxyUrl`). Contiene perfiles: `thumbnail`, `catalog` (1080px), `cover` (500x500). |
| `src/lib/r2.ts` | Cliente S3 adaptado a Cloudflare R2. Proporciona `uploadBufferToR2`, `deleteObjectFromR2`, `checkObjectExistsInR2` y `getR2PublicDomain`. |
| `src/lib/google-auth.ts` | Cliente oficial de Google APIs para OAuth 2.0. Genera URLs de consentimiento y renueva `access_token` automáticamente con `refresh_token`. |
| `src/lib/cloudflare.ts` | Purga automatizada de caché en Cloudflare CDN por URLs específicas o purga total por Hostname. |
| `src/lib/types.ts` | Tipos TypeScript principales del dominio: `PhotoItem`, `Album`, `CacheStructure`, `AppConfig`. |
| `src/lib/utils.ts` | Funciones utilitarias como `slugify` (conversión de títulos a slugs limpios para URLs). |
| `src/lib/supabase/client.ts` | Cliente Supabase para Browser / React Components (`createBrowserClient`). |
| `src/lib/supabase/server.ts` | Cliente Supabase para Server Components y Route Handlers (`createServerClient` con cookies). |
| `src/lib/supabase/admin.ts` | Cliente Supabase con privilegios `service_role` (`createAdminClient`) para operaciones internas del motor de sincronización. |
| `src/lib/sync-engine.ts` | *[DEPRECADO / STUB]* Motor mono-usuario anterior. No utilizar. |
| `src/lib/drive.ts` | *[DEPRECADO / STUB]* Cliente Drive mono-usuario anterior. No utilizar. |

---

## 4. Componentes UI (`src/components`)

### Componentes del Catálogo Público:
* `CatalogView.tsx`: Vista interactiva del catálogo responsive. Gestiona navegación por migas de pan (breadcrumbs), búsqueda en tiempo real, grilla y apertura de Lightbox.
* `PhotoCard.tsx`: Tarjeta de foto con imagen WebP optimizada de Next.js (`fill`, `sizes`, `loading="lazy"`), efecto hover y placeholder.
* `AlbumCard.tsx`: Tarjeta de carpeta con portada personalizada (`folderCovers`) o icono por defecto.
* `SeasonalEffects.tsx` & `ClickEffects.tsx`: Efectos visuales interactivos configurables por el comerciante (nieve, confeti, corazones, etc.).

### Componentes Modulares del Dashboard (`src/components/dashboard`):
* `DashboardHeader.tsx`: Cabecera del panel con selector de tenant, estado del plan y botón de cerrar sesión.
* `DashboardMetrics.tsx`: Tarjetas de estadísticas (Fotos consumidas vs cuota del plan, almacenamiento, estado de Drive).
* `DriveTab.tsx`: Flujo de 3 pasos: (1) Conexión OAuth Google Drive, (2) Selección de carpeta Catálogo y Portadas con buscador, (3) Asignación visual jerárquica de portadas a álbumes con botón de guardar cambios.
* `CoverSelectorModal.tsx`: Modal para elegir una foto como portada entre las fotos de portadas o del catálogo.
* `DesignTab.tsx`: Configuración de temas claro/oscuro, color primario y tipografía.
* `BrandingTab.tsx`: Configuración de subdominio, título de la tienda, logo y WhatsApp de pedidos.
* `EffectsTab.tsx`: Activación y prueba de efectos interactivos para la tienda.
* `HistoryTab.tsx`: Tabla de historial de sincronizaciones con logs de errores y fotos procesadas.

### Storefront Builder (`src/components/storefront` y `src/components/admin`):
* `StorefrontBuilder.tsx`: Editor drag-and-drop para diseñar la página de inicio de la tienda con bloques modulares.
* `StorefrontView.tsx`: Renderizador dinámico de los bloques del Storefront.
* Bloques: `HeroBanner.tsx`, `CategoryCarousel.tsx`, `PromoGrid.tsx`, `ClassicGrid.tsx`, `RichTextBlock.tsx`.

---

## 5. Infraestructura y DevOps

| Archivo | Rol |
| :--- | :--- |
| `docker-compose.yml` | Despliegue en Docker Swarm / Portainer. Define el servicio `backend_api`, red `r4tlabsnet`, límites de recursos (4 CPU, 4GB RAM) y reglas de Traefik v3 (`Host('c4talogo.com') \|\| HostRegexp('.*\\.c4talogo\\.com')`). |
| `Dockerfile` | Multi-stage build optimizado (`base`, `deps`, `builder`, `manager`) sobre Alpine con soporte para `libc6-compat` y ejecución de Next.js Standalone. |
| `.github/workflows/docker-publish.yml` | Pipeline de CI/CD en GitHub Actions con `docker/setup-buildx-action@v3` y publicación en GitHub Container Registry (`ghcr.io`). |

---

## 6. Reglas de Oro para Asistentes de IA (Antigravity & Otros)

1. **Nunca usar Sharp en el servidor**: No importar `sharp` ni procesar imágenes binarias en Next.js. El flujo obligatorio es: Google Drive -> Memory Buffer -> Cloudflare R2 -> Imgproxy.
2. **Claves de R2 siempre relativas e inmutables**: Almacenar en base de datos la clave relativa `tenants/${tenantId}/${folderType}/${cleanName}-${fileId}-${hash}.${ext}`. Nunca almacenar URLs absolutas en Postgres.
3. **Firmas de Imgproxy solo en el Backend**: `generateSignedImgproxyUrl` solo debe llamarse en Server Components, Server Actions o APIs, nunca exponer `IMGPROXY_KEY` ni `IMGPROXY_SALT` en el cliente.
4. **Respetar la arquitectura Multi-Tenant**: Cada consulta a la base de datos debe filtrar por `tenant_id` o confiar en las políticas RLS de Supabase.
5. **Auto-curación en Sincronización**: Al modificar `multitenant-sync.ts`, siempre preservar la pre-carga en memoria (`Map`), la comparación precisa por `md5Checksum` y la auto-recuperación si R2 está vacío.
