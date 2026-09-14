# 🚀 c4talogo.com — Plataforma SaaS Multi-Tenant de Catálogos Digitales

Plataforma e-commerce **SaaS Multi-Tenant** de alto rendimiento construida con **Next.js 15 (App Router)** en modo `standalone`, **Supabase Cloud (PostgreSQL con RLS)**, **Google Drive API (OAuth 2.0)**, almacenamiento en **Cloudflare R2** y procesamiento criptográfico de imágenes con **Imgproxy (HMAC-SHA256)**.

Permite a cientos de comerciantes conectar sus carpetas de Google Drive y generar automáticamente catálogos digitales interactivos en subdominios propios (ej. `mitienda.c4talogo.com`), totalmente desacoplados de almacenamiento en disco local (100% Stateless).

---

## 🏛️ Arquitectura del Sistema

```mermaid
flowchart TD
    subgraph PublicTraffic["Tráfico Público de Clientes"]
        ClientSubdomain["Cliente visita: tienda.c4talogo.com"]
        CFEdge["Cloudflare Edge (CDN / ISR Cache)"]
    end

    subgraph MerchantTraffic["Portal de Comerciantes"]
        Owner["Comerciante visita: c4talogo.com"]
        SupabaseAuth["Supabase Auth (/login)"]
        TenantDashboard["Panel de Inquilino (/dashboard)"]
    end

    subgraph MasterTraffic["Administración Global"]
        SuperAdmin["SuperAdmin en: app.c4talogo.com"]
        MasterPanel["Panel Maestro (/superadmin)"]
    end

    subgraph CoreEngine["Plataforma Central (Next.js Multi-Tenant)"]
        Middleware["Next.js Middleware (Subdomain Routing)"]
        AsyncSync["Motor Asíncrono de Sincronización (Background Job)"]
        ImgproxySigner["Firmador HMAC-SHA256 (Imgproxy)"]
    end

    subgraph DataAndStorage["Capa de Datos y Multimedia"]
        SupabaseDB[("Supabase PostgreSQL (RLS Activo)")]
        R2Storage[("Cloudflare R2 (tenants/{id}/raw/*)")]
        ImgproxyService["Imgproxy Server"]
    end

    ClientSubdomain --> CFEdge
    CFEdge --> Middleware
    Middleware -->|Reescritura interna a /t/[subdomain]| SupabaseDB
    SupabaseDB --> ImgproxySigner
    ImgproxySigner --> ImgproxyService
    ImgproxyService -->|Lee originales vía HTTPS| R2Storage

    Owner --> SupabaseAuth --> TenantDashboard
    TenantDashboard -->|Inicia Sync en 2do Plano| AsyncSync
    AsyncSync -->|Stream directo sin Sharp| R2Storage
    AsyncSync -->|Guarda estructura y metadata| SupabaseDB

    SuperAdmin --> MasterPanel -->|Supervisa cuotas y tenants| SupabaseDB
```

---

## ✨ Características Principales

### 1. Multi-Tenancy & Enrutamiento Dinámico por Subdominios
- **Aislamiento por Subdominio:** El middleware de Next.js resuelve dinámicamente `subdominio.c4talogo.com` hacia la ruta `/t/[subdomain]` sin recargar la aplicación ni exponer rutas internas.
- **Portal de Clientes Centralizado:** El dominio raíz `c4talogo.com` aloja la landing comercial (`/`), autenticación (`/login`) y el panel de administración de tiendas (`/dashboard`).
- **Panel Maestro SuperAdmin (`app.c4talogo.com`):** Supervisión global de todas las tiendas, métricas agregadas de almacenamiento, gestión de suscripciones (`subscription_plans`), ampliación de límites y suspensión/reactivación en un clic.

### 2. Aislamiento Cero-Disk & Seguridad Estricta (Supabase RLS)
- **100% Stateless:** El servidor Next.js no almacena fotos, cachés ni credenciales en el disco local (`/cache/`). Todo el estado reside en Supabase y los binarios en R2.
- **Row Level Security (RLS):** Aislamiento absoluto en todas las tablas (`tenants`, `tenant_configs`, `google_integrations`, `albums`, `photos`, `sync_logs`). Ningún inquilino puede consultar ni alterar datos ajenos.
- **Esquema Privado para Funciones:** Las funciones auxiliares de seguridad (`is_superadmin()`, `has_tenant_access()`) residen en un esquema `private` no expuesto a la API REST de PostgREST, manteniendo el **Supabase Security Linter con 0 advertencias**.
- **Tokens Protegidos:** El `refresh_token` de Google Drive se almacena en el servidor y nunca se expone al navegador del cliente.

### 3. Google Drive OAuth 2.0 & Sincronización Asíncrona
- **Integración Nativa OAuth 2.0:** Flujo oficial con Google Cloud Console bajo el scope `https://www.googleapis.com/auth/drive.readonly`.
- **Buscador de Carpetas en Vivo:** El comerciante busca y selecciona interactivamente su carpeta de Catálogo y su carpeta de Portadas.
- **Prevención de Timeout 524 de Cloudflare:** La sincronización opera como un trabajo asíncrono en segundo plano (`POST /api/sync`), respondiendo de inmediato al cliente mientras la interfaz sondea (`GET /api/sync?logId=...`) el progreso en tiempo real.
- **Preparado para Verificación de Google:** Páginas públicas de [Política de Privacidad (`/privacy`)](https://c4talogo.com/privacy) con la cláusula obligatoria de *Google Limited Use* y [Términos de Servicio (`/terms`)](https://c4talogo.com/terms).

### 4. Streaming a Cloudflare R2 & Imgproxy
- **Sin Sharp en Node.js:** Eliminación total de dependencias pesadas de compilación en el backend. Las fotos se transmiten en stream directo desde Google Drive hacia Cloudflare R2.
- **URLs Criptográficas (HMAC-SHA256):** Despacho de imágenes a través de Imgproxy con perfiles predefinidos:
  - `thumbnail`: 300x300 px con smart-crop para grillas ultra-rápidas.
  - `cover`: 500x500 px para portadas cuadradas de álbumes.
  - `catalog`: 800 px ancho auto-fit para catálogo responsive.
  - `lightbox`: 1920 px para visualización en pantalla completa.
- **Zero FOUC & Edge Caching:** Grilla de productos con variables CSS dinámicas para prevenir destellos y encabezados `Cache-Control` optimizados para Cloudflare Edge.

### 5. Panel de Inquilino Completo (`/dashboard`)
- **Google Drive:** Vinculación OAuth, selección de carpetas y botón de sincronización en vivo.
- **Diseño y Grilla:** Selector de columnas para escritorio (2 a 6) y móvil (1 a 3), colores primario/secundario/texto, bordes de tarjeta y opción de ocultar títulos de álbumes.
- **Efectos Interactivos:** Efectos de caída de temporada (nieve, corazones, icono personalizado) y efectos de explosión al clic (estrellas, corazones).
- **Subdominio y SEO:** Configuración de subdominio propio, título de pestaña, WhatsApp para pedidos, logo, favicon y portada dinámica para redes sociales (OG Image).
- **Creador Visual Storefront:** Constructor de bloques promocionales (Hero Banner, Carrusel de categorías, Grillas clásicas y Textos editoriales) con guardado directo en Supabase.
- **Historial de Sincronizaciones:** Registro histórico con cantidad de fotos procesadas y marcas de tiempo.

---

## 📁 Estructura del Proyecto

```
├── docker-compose.yml           # Configuración de producción para Docker
├── package.json                 # Dependencias (Next.js 15, Supabase, Googleapis, AWS SDK R2)
├── supabase/
│   └── migrations/              # Migraciones SQL para Supabase (Tablas, RLS, Esquema Private)
│       ├── 20260911_saas_multitenant_core.sql
│       └── 20260912_security_hardening.sql
└── src/
    ├── middleware.ts            # Enrutamiento de subdominios y cabeceras de caché
    ├── app/
    │   ├── page.tsx             # Landing comercial de c4talogo.com
    │   ├── login/page.tsx       # Inicio de sesión / registro con Supabase Auth
    │   ├── dashboard/page.tsx   # Panel de control de la tienda del inquilino
    │   ├── superadmin/page.tsx  # Panel Maestro de la plataforma (app.c4talogo.com)
    │   ├── privacy/page.tsx     # Política de Privacidad (Cumplimiento Google API)
    │   ├── terms/page.tsx       # Términos de Servicio
    │   ├── t/[subdomain]/       # Storefront público dinámico del inquilino
    │   └── api/
    │       ├── auth/google/     # Flujo OAuth 2.0 con Google Drive
    │       ├── drive/folders/   # Búsqueda y guardado de carpetas
    │       ├── config/          # Lectura/escritura de configuración visual en Supabase
    │       ├── storefront/      # Bloques del constructor de página de inicio
    │       ├── covers/          # Portadas firmadas por Imgproxy
    │       └── sync/            # Job asíncrono y polling de sincronización
    ├── components/
    │   ├── CatalogView.tsx      # Vista interactiva de catálogo y navegación
    │   ├── AlbumCard.tsx        # Tarjeta de álbum con portadas inteligentes
    │   ├── SeasonalEffects.tsx  # Animación de copos/corazones
    │   ├── ClickEffects.tsx     # Microanimación al hacer clic/toque
    │   └── admin/
    │       └── StorefrontBuilder.tsx # Constructor visual drag & drop de bloques
    └── lib/
        ├── catalog-db.ts        # Cargador de catálogo desde Supabase hacia estructura de árbol
        ├── google-auth.ts       # Cliente OAuth 2.0 y buscador en Google Drive
        ├── multitenant-sync.ts  # Motor de sincronización Drive -> R2 -> Supabase
        ├── imgproxy.ts          # Generador de URLs firmadas HMAC-SHA256
        ├── r2.ts                # Conexión S3 con Cloudflare R2
        └── supabase/            # Clientes de Supabase (Client, Server y Admin Service Role)
```

---

## 🛠️ Variables de Entorno (`.env`)

Copia la plantilla [`.env.example`](./.env.example) a `.env` y completa los valores correspondientes:

```ini
# Dominio Base de la Plataforma
NEXT_PUBLIC_BASE_DOMAIN=c4talogo.com
NEXT_PUBLIC_APP_URL=https://c4talogo.com
COMPOSE_PROJECT_NAME=c4talogo_platform

# Supabase Cloud (Base de Datos & Auth con RLS)
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>

# Cloudflare R2 (Almacenamiento de Fotos)
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<tu-r2-access-key>
R2_SECRET_ACCESS_KEY=<tu-r2-secret-key>
R2_BUCKET_NAME=c4talogo-media
R2_PUBLIC_DOMAIN=https://cdn.c4talogo.com

# Imgproxy (Procesamiento firmado HMAC-SHA256)
IMGPROXY_URL=https://img.c4talogo.com
IMGPROXY_KEY=<tu-hex-key>
IMGPROXY_SALT=<tu-hex-salt>

# Google Cloud Console OAuth 2.0 (Google Drive API)
GOOGLE_CLIENT_ID=<tu-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<tu-client-secret>
GOOGLE_REDIRECT_URI=https://c4talogo.com/api/auth/google/callback

# Cloudflare CDN Purge (Opcional para purga instantánea en Edge)
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=
```

---

## 🚀 Despliegue y Ejecución

### Desarrollo Local
```bash
npm install
npm run dev
```

### Compilación y Verificación de Tipos
```bash
npx tsc --noEmit
npm run build
```

### Ejecución en Producción con Docker Compose
```bash
docker compose up -d --build
```

---

## 📄 Licencia y Cumplimiento
- **Google API Disclosure:** El uso de la información obtenida a través de las APIs de Google cumple rigurosamente con la [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).
- Todos los derechos reservados © 2026 [c4talogo.com](https://c4talogo.com).
