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
7. **Purga Selectiva de CDN en Cloudflare**:
   - 0 cambios: Caché intacto (0 purgas).
   - <= 5 cambios: Purga selectiva solo de las URLs de los álbumes modificados y la home.
   - Muchos cambios o eliminaciones: Purga total del subdominio por Hostname.

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
