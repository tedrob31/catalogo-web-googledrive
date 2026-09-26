# C4TALOGO — Arquitectura del Sistema & Especificación Técnica

> **Versión del Documento:** 2.0.0  
> **Última Auditoría:** Septiembre 2026  
> **Dominio Principal:** [c4talogo.com](https://c4talogo.com)  
> **Panel Maestro Superadmin:** [app.c4talogo.com](https://app.c4talogo.com)  
> **Subdominios de Tiendas:** `[subdominio].c4talogo.com` (ej. `juanstore.c4talogo.com`)

---

## 1. Resumen Ejecutivo y Propósito

**C4TALOGO** es una plataforma SaaS B2B Multi-Tenant diseñada para pequeños y medianos comerciantes, mayoristas y marcas de moda/retail. Permite a los usuarios transformar carpetas estructuradas de fotos en **Google Drive** en un **catálogo digital público de alto rendimiento, ultra rápido e indexable**, sin requerir gestión manual de servidores ni bases de datos complejas.

### Principios Fundamentales de Diseño
1. **Zero-Friction Sincronización**: El comerciante organiza sus fotos en su propio Google Drive (PC o Móvil). El sistema refleja automáticamente álbumes, subálbumes y fotos mediante sincronización espejo incremental.
2. **Cero Procesamiento Pesado en Servidor (Sharp-Free)**: Para garantizar máxima escalabilidad en VPS con recursos limitados, el servidor Next.js nunca redimensiona ni procesa imágenes localmente. Hace stream binario directo de Google Drive a Cloudflare R2.
3. **Entrega de Imágenes On-Demand mediante Imgproxy**: Todas las imágenes públicas se sirven a través de un stack independiente de **Imgproxy** con firmas criptográficas HMAC-SHA256 y entrega en formato WebP con caché global en Cloudflare CDN.
4. **Experiencia de Usuario de 0ms (App-like)**: El Lightbox y la cuadrícula reutilizan la misma variante de alta definición (`1080px` WebP), eliminando los spinners de carga y ofreciendo apertura instantánea desde la memoria caché del navegador.
5. **Aislamiento Multi-Tenant Estricto (RLS)**: Cada tienda tiene sus propios identificadores inmutables (`tenant_id`), carpetas aisladas en R2 (`tenants/${tenantId}/...`) y políticas Row Level Security (RLS) en Supabase.

---

## 2. Diagrama de Arquitectura Global

```mermaid
flowchart TB
    subgraph Clientes ["🌍 Clientes y Navegadores"]
        Shopper["Comprador Final<br/>juanstore.c4talogo.com"]
        Merchant["Comerciante / Dueño<br/>c4talogo.com/dashboard"]
        SuperAdminUser["Superadministrador<br/>app.c4talogo.com"]
    end

    subgraph Edge ["🛡️ Capa Edge & Proxy Inverso"]
        Cloudflare["Cloudflare CDN & DNS<br/>(Caché Edge, SSL Wildcard *.c4talogo.com)"]
        Traefik["Traefik v3 Proxy (Docker)<br/>Host('c4talogo.com') || HostRegexp('.*\\.c4talogo\\.com')"]
    end

    subgraph AppServer ["⚡ Servidor Next.js (Docker Swarm)"]
        Middleware["Next.js Middleware<br/>(Detección de Host y Subdominios)"]
        Landing["Landing & Auth (/login, /)"]
        Dashboard["Panel Inquilino (/dashboard)"]
        SuperAdmin["Panel Maestro (/superadmin)"]
        Storefront["Storefront Dinámico (/t/[subdomain])"]
        SyncEngine["Motor de Sync Incremental<br/>(src/lib/multitenant-sync.ts)"]
    end

    subgraph External ["☁️ Servicios Externos y Almacenamiento"]
        GoogleDrive["Google Drive API v3<br/>(OAuth 2.0 por Tenant)"]
        CloudflareR2["Cloudflare R2 Object Storage<br/>(Bucket: cdnc4talogo)"]
        Imgproxy["Imgproxy Stack (HMAC-SHA256)<br/>(imgproxy.r4tlabs.com)"]
        Supabase["Supabase Cloud / Postgres<br/>(Auth, RLS, DB Multi-Tenant)"]
    end

    Shopper -->|HTTPS| Cloudflare
    Merchant -->|HTTPS| Cloudflare
    SuperAdminUser -->|HTTPS| Cloudflare

    Cloudflare --> Traefik
    Traefik --> Middleware

    Middleware -->|app.c4talogo.com| SuperAdmin
    Middleware -->|c4talogo.com| Landing
    Middleware -->|c4talogo.com/dashboard| Dashboard
    Middleware -->|subdominio.c4talogo.com| Storefront

    Dashboard -->|Iniciar Sync| SyncEngine
    SyncEngine -->|Descarga Binaria (drive.readonly)| GoogleDrive
    SyncEngine -->|Subida Stream| CloudflareR2
    SyncEngine -->|Actualización Espejo| Supabase

    Storefront -->|Lectura Catálogo| Supabase
    Storefront -->|Genera URLs Firmadas HMAC| Imgproxy
    Imgproxy -->|Lectura Origen| CloudflareR2
```

---

## 3. Topología de Enrutamiento y Dominios

El enrutamiento está centralizado en [src/middleware.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/middleware.ts):

| Host / Subdominio | Comportamiento en Middleware | Destino / Vista Renderizada |
| :--- | :--- | :--- |
| `app.c4talogo.com` | Reescribe rutas raíz y de administración a `/superadmin` | Panel Maestro SuperAdmin ([src/app/superadmin/page.tsx](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/app/superadmin/page.tsx)) |
| `[subdominio].c4talogo.com` (ej. `juanstore`) | Reescribe a `/t/[subdomain]/[[...slug]]` | Tienda pública del inquilino ([src/app/t/[subdomain]/[[...slug]]/page.tsx](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/app/t/[subdomain]/[[...slug]]/page.tsx)) |
| Dominio Personalizado (ej. `mitienda.com`) | Reescribe a `/t/[custom_domain]/[[...slug]]` | Tienda pública bajo dominio propio |
| `c4talogo.com` (Raíz) | Tráfico nativo sin reescritura | Landing Page ([src/app/page.tsx](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/app/page.tsx)) |
| `c4talogo.com/dashboard` | Tráfico nativo autenticado | Panel de Gestión del Inquilino ([src/app/dashboard/page.tsx](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/app/dashboard/page.tsx)) |
| `c4talogo.com/login` | Tráfico nativo de inicio de sesión | Login unificado Google OAuth / Email ([src/app/login/page.tsx](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/app/login/page.tsx)) |

---

## 4. Motor de Sincronización Incremental Espejo (`multitenant-sync.ts`)

Ubicación: [src/lib/multitenant-sync.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/multitenant-sync.ts)

### 4.1 Ciclo de Vida del Sync:
1. **Pre-carga en Memoria (Bulk Fetch a 0ms)**:
   Al iniciar, el motor ejecuta solo 2 consultas concurrentes a Supabase (`albums` y `photos`) indexándolas en `Map<drive_folder_id, DBAlbum>` y `Map<drive_file_id, DBPhoto>`. Esto evita las más de 150 llamadas HTTP secuenciales que saturaban la red.
2. **Auto-Recuperación de Integridad R2 (Self-Healing)**:
   Verifica una foto muestra en Cloudflare R2 con `checkObjectExistsInR2`. Si el usuario eliminó manualmente la carpeta del tenant en R2 para limpiar su almacenamiento, el sistema lo detecta al instante y activa `forceReupload = true`, reconstruyendo todo el catálogo de R2 desde Google Drive automáticamente.
3. **Paginación Google Drive**:
   Usa un bucle `do ... while (pageToken)` con `pageSize: 1000` para leer carpetas sin importar su cantidad de archivos.
4. **Ordenamiento Natural Alfanumérico**:
   Ordena las subcarpetas y fotos con `localeCompare(..., 'es', { numeric: true })`. Esto garantiza que carpetas numeradas como `1 ABRIGOS`, `2 CARTERAS`, `3 Moda mujer`, `4 Moda hombre` se ordenen exactamente igual que en el explorador de Google Drive, sin verse afectadas por la fecha de modificación (`modifiedTime`).
5. **Versionado por Hash de Contenido (`md5Checksum`)**:
   - Google Drive entrega `md5Checksum` por cada archivo.
   - Las claves en R2 se formatean como:  
     `tenants/${tenantId}/${folderType}/${slug}-${fileId}-${contentHash}.${ext}`
   - Si una foto se edita en Drive (incluso por 1 solo píxel):
     1. El hash cambia.
     2. Se descarga y sube a R2 con la nueva clave.
     3. Se **elimina la versión antigua en R2** (`deleteObjectFromR2`) para no dejar archivos huérfanos.
     4. Al cambiar la clave R2, se genera una nueva URL en Imgproxy, evitando que Cloudflare CDN o el navegador sirvan la versión anterior en caché.
6. **Sincronización Espejo de Bajas (Eliminaciones)**:
   Al concluir el recorrido en Google Drive, cualquier foto o álbum registrado en Supabase cuyo ID no haya sido visitado en Drive es considerado eliminado y se borra de Supabase y de Cloudflare R2 en lotes eficientes.
7. **Purga Quirúrgica de CDN en Cloudflare (Soporte Oficial en Planes Free y Cola Inteligente)**:
   - **Confirmación Oficial**: Cloudflare habilitó para **todos los planes (incluyendo Free)** las modalidades avanzadas de purga: por **Hostname** (`hosts: [...]`), por **URL** (`files: [...]`), por **Tag** (`tags: [...]`) y por **Prefix** (`prefixes: [...]`).
   - **Límites de la API en Free**: Hasta 100 elementos por petición; rate limit de 5 solicitudes de purga por minuto (con bucket de ráfaga de 25 peticiones).
   - **Cola en Memoria con Batching Automático (`src/lib/cloudflare.ts`)**:
     - *Debounce de 1500ms*: Si múltiples usuarios sincronizan o guardan configuraciones al mismo tiempo, el sistema acumula los subdominios y rutas pendientes durante 1.5s y los despacha agrupados en **una sola petición HTTP** (`hosts: [sub1, sub2, ...]`), ahorrando drásticamente cuota de la API.
     - *Deduplicación Inteligente*: Si un tenant va a purgar su subdominio completo por Hostname, se eliminan automáticamente sus URLs individuales de la lista de `files`, evitando llamadas redundantes.
     - *Manejo de Rate Limit (HTTP 429)*: Si Cloudflare devuelve 429, el worker en memoria lee la cabecera `Retry-After`, pausa la ejecución y reintenta automáticamente con retroceso exponencial (hasta 2 reintentos).
     - *Safety Timeout (8s)*: Cada llamada a `purgeCloudflareCache` tiene un temporizador de seguridad de 8s para garantizar que la respuesta al usuario en el dashboard o panel nunca se quede congelada.
     - *Resiliencia*: Si la API de Cloudflare rechaza el Hostname por configuración o permisos, aplica un fallback automático con `purge_everything: true`.
   - **Estrategia HTML Zero-Retention**: Las páginas HTML de catálogos dinámicos se sirven sin `s-maxage` en Edge (`max-age=0, must-revalidate`), respondiendo directamente desde la memoria RAM del servidor Next.js (`memoryCatalogCache`, ~10-20ms). Esto garantiza que cualquier cambio tras la sincronización se refleje de inmediato en la primera recarga del navegador del usuario.

---

## 5. Estrategia de Entrega de Imágenes (Imgproxy & Caché)

Ubicación: [src/lib/imgproxy.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/imgproxy.ts) y [src/lib/catalog-db.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/catalog-db.ts)

* **Seguridad HMAC-SHA256**: Ninguna URL de imagen se construye en el cliente. Se firman exclusivamente en servidor (`generateSignedImgproxyUrl`) usando `IMGPROXY_KEY` y `IMGPROXY_SALT`.
* **Bypass de S3**: Se pasa la URL HTTP pública de R2 (`https://cdn.c4talogo.com/tenants/...`) codificada en Base64 seguro para URL.
* **Unificación de URL para 0ms Lightbox**:
  * Perfil `catalog`: `width: 1080, height: 0, quality: 80, format: 'webp'`.
  * Tanto la tarjeta de la grilla (`thumbnailLink`) como el visualizador ampliado (`fullLink`) comparten la **misma URL exacta**.
  * Al pulsar una foto en la grilla móvil 2x2, el Lightbox abre de inmediato sin animación de carga, reutilizando la imagen de la memoria caché local del navegador.
  * Reduce al 50% la carga de CPU y memoria en el contenedor de Imgproxy.

---

## 6. Modelo de Datos y Roles (Supabase PostgreSQL)

Consulte el DDL completo en [supabase/AUDIT_SCHEMA.sql](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/supabase/AUDIT_SCHEMA.sql).

### Jerarquía de Roles en `tenant_users`:
* **`superadmin`**: Usuario maestro de la plataforma `c4talogo.com`. Acceso total de lectura y modificación a todos los inquilinos, métricas, planes y estados de cuenta en `app.c4talogo.com`.
* **`owner`**: Dueño / creador de su tienda específica. Tiene permisos completos sobre su propio catálogo, sincronización, portadas y diseño.
* **`admin` / `user`**: Miembros o colaboradores dentro de una tienda específica (roles secundarios).

### Tablas Principales:
1. `tenants`: Registro central de cada tienda (subdominio, plan_id, estado, límites de fotos y almacenamiento).
2. `tenant_users`: Relación N:M entre usuarios de Supabase Auth (`auth.users`) y las tiendas (`tenants`) con su respectivo rol.
3. `subscription_plans`: Planes de precios (`free`, `pro`, `enterprise`) con cuotas de fotos y almacenamiento en MB.
4. `tenant_configs`: Parámetros de personalización (colores, WhatsApp, tema, SEO, bloques del Storefront Builder).
5. `google_integrations`: Tokens de acceso OAuth 2.0 y carpetas vinculadas de Google Drive por tienda.
6. `albums`: Estructura jerárquica de carpetas (`parent_id`, `path`, `order_index`, `cover_photo_r2_key`).
7. `photos`: Metadatos de imágenes (`r2_key`, `md5_checksum`, `drive_file_id`, `drive_modified_time`).
8. `sync_logs`: Historial y estado en tiempo real de los procesos de sincronización para el polling del dashboard.

---

## 7. Estrategia de Memoria RAM, Rendimiento y Dimensionamiento de Infraestructura

### Huella de Memoria por Tienda (Tenant Footprint en RAM):
* En [src/lib/catalog-db.ts](file:///c:/Users/teddy/Documents/PROYECTO%20GOOGLE%20ANTIGRAVITY/src/lib/catalog-db.ts), la memoria RAM de Node.js solo almacena **metadatos livianos** (árbol JSON de IDs, nombres, URLs firmadas de Imgproxy y configuraciones de diseño).
* Los bytes binarios de las imágenes (JPG/WebP) **nunca tocan la memoria RAM de Next.js**: se almacenan en Cloudflare R2 y se despachan directamente por Cloudflare CDN e Imgproxy.
* **Métricas de consumo**:
  * 1 catálogo típico (1,000 fotos + 30 álbumes): **~450 KB - 500 KB** en RAM.
  * 100 tiendas activas simultáneas en RAM: **~50 MB**.
  * 500 tiendas activas simultáneas en RAM: **~250 MB**.
  * 1,000 tiendas activas simultáneas en RAM: **~500 MB**.

### Dimensionamiento del Stack (Docker Compose & VPS):
* **Asignación en `docker-compose.yml`**: `cpus: 4.0`, `memory: 4096M` (4 GB).
* **Consumo real de Node.js Standalone**: ~150 MB (base) + ~50 MB (100 tiendas) = **~200 MB a 400 MB**.
* La aplicación consume entre el **5% y el 10%** del límite asignado en Docker Compose, ofreciendo una holgura superior al 90% para absorber picos extremos de tráfico sin riesgo de *Out-Of-Memory* (OOM).
* **Ancho de banda**: Las peticiones de navegación y reconciliación RSC (`?_rsc=...`) pesan únicamente ~5 KB. El tráfico pesado multimedia es absorbido por la red CDN global de Cloudflare.

