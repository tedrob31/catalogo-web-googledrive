# Catálogo Web Google Drive (Next.js + Docker Swarm)

Sistema de catálogo web profesional que sincroniza automáticamente su contenido desde una carpeta de Google Drive. Construido con **Next.js 15 (App Router)**, diseñado para **Docker Swarm**, y optimizado para alto rendimiento mediante **Static Export** y **Nginx**.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Dashboard+Preview)

## 🚀 Características Principales

*   **Sincronización con Google Drive:**
    *   Gestiona todo tu catálogo (carpetas, subcarpetas, fotos) organizando archivos en tu Google Drive.
    *   **Dual Profile Optimization:** Las imágenes se convierten automáticamente a WebP:
        *   **Fotos de Catálogo:** 800px ancho, Calidad 75 (Ligeras y nítidas).
        *   **Portadas (Covers):** 400x400px Cuadradas, *Smart Crop* (Entropy).
*   **Arquitectura Híbrida (Hybrid Deployment):**
    *   **Backend (Node.js):** Gestiona la sincronización, API y Panel de Administración (`/modaadmin`).
    *   **Frontend (Nginx):** Sirve el sitio como HTML estático ultrarrápido (`output: export`), generado automáticamente tras cada sincronización.
*   **Panel de Administración Seguro:**
    *   Acceso protegido (`/modaadmin`) para realizar sincronizaciones manuales y ver logs.
    *   **Gatekeeper:** Protección de rutas y redirección inteligente (Setup vs Active).
*   **Despliegue Profesional:**
    *   **Docker Swarm Ready:** Stack optimizado con `traefik` para balanceo de carga y SSL automático.
    *   **Cloudflare Auto-Purge:** Limpia la caché de CDN automáticamente tras cada despliegue.
    *   **Variables de Entorno:** Configuración segura sin exponer credenciales.

## 🛠️ Requisitos Previos

*   Docker & Docker Compose.
*   Una cuenta de Google Cloud Platform (GCP) con la API de Google Drive habilitada.
*   Una cuenta de Servicio (Service Account) de Google con permisos de lectura sobre la carpeta de Drive.

## 📦 Instalación y Despliegue

### 1. Configuración de Variables
Crea un archivo `.env` basado en el ejemplo:

```bash
cp .env.example .env
```
Edita `.env` con tus credenciales:
```ini
ADMIN_USER=tu_usuario
ADMIN_PASS=tu_password_seguro
DOMAIN_NAME=tudominio.com
CLOUDFLARE_ZONE_ID=... (Opcional)
CLOUDFLARE_API_TOKEN=... (Opcional)
```

### 2. Credenciales de Google Drive
Coloca tu archivo JSON de cuenta de servicio en `cache/credentials.json`.
*Nota: En el primer arranque, el sistema te pedirá subir este archivo mediante el Wizard de Setup (`/setup`) si no existe.*

### 3. Despliegue con Docker Swarm (Recomendado)

```bash
# Inicia el Stack
docker stack deploy -c docker-compose.yml catalogo
```

### 4. Setup Inicial
1.  Accede a `https://tudominio.com/setup`.
2.  Sube las credenciales (si no las pusiste manualmente).
3.  Ingresa el **ID de la Carpeta Raíz** de Google Drive.
4.  El sistema realizará la primera sincronización.

## 🔄 Flujo de Trabajo (Sync Sync)

1.  Sube fotos a tu Google Drive.
2.  Entra a `https://tudominio.com/modaadmin`.
3.  Dale clic a **"Sincronizar Catálogo"**.
4.  El sistema:
    *   Descarga y optimiza las nuevas imágenes.
    *   Regenera el sitio estático (Next.js Build).
    *   Despliega el nuevo contenido en Nginx.
    *   Purga la caché de Cloudflare (si está configurado).

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Correr en modo desarrollo
npm run dev

# Probar el build de producción
npm run build
npm start
```

## 📂 Estructura del Proyecto

*   `src/app`: Rutas de Next.js (App Router).
*   `src/lib/sync-engine.ts`: Lógica de sincronización y optimización (Sharp).
*   `src/components`: Componentes React (UI).
*   `nginx/nginx.conf`: Configuración del servidor estático.
*   `docker-compose.yml`: Definición del Stack.

## 📝 Créditos
Desarrollado por **R4T Labs**.
