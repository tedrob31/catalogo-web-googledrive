# Catálogo Web Sincronizado con Google Drive (Google Drive CMS) 🚀

Este proyecto es un **Catálogo Web de Alto Rendimiento** que convierte una carpeta de **Google Drive** en un sitio web profesional. Utiliza un sistema de **Espejo Local (Local Mirror)** para descargar, optimizar y servir las imágenes instantáneamente, eliminando la latencia de Google Drive.

![Estado](https://img.shields.io/badge/Estado-Estable-green) ![Docker](https://img.shields.io/badge/Docker-Ready-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black)

## 🌟 Características Principales

### 1. Sincronización Inteligente & CMS
*   **Google Drive como Backend**: Sube tus fotos y carpetas a Drive, y el sitio web replicará la estructura automáticamente.
*   **Espejo Local**: El sistema descarga todas las imágenes al servidor VPS.
*   **Carga Instantánea**: El usuario final ve las imágenes desde el servidor local (Nginx/CDN), no desde Drive.
*   **Sincronización Asíncrona**: El proceso de sincronización corre en segundo plano con logs en tiempo real en el Panel de Administración.

### 2. Optimización de Imágenes (Sharp)
*   **Perfiles Duales**:
    *   **Catálogo**: Imágenes redimensionadas a **800px** (Alta calidad, peso <100KB) para navegación rápida.
    *   **Portadas (Covers)**: Recorte inteligente (**Smart Crop**) cuadrado de **400x400px** centrado en la entropía de la imagen.
*   **Formato WebP**: Conversión automática para máxima compresión.

### 3. Panel de Administración (`/modaadmin`)
*   **Configuración Visual**: Cambia títulos, colores, y efectos sin tocar código.
*   **Gestión de Portadas**: Sube portadas personalizadas para carpetas o selecciona una imagen existente.
*   **Efectos Estacionales**: Activa nieve, corazones o iconos personalizados flotantes.
*   **SEO & Analytics**: Configura Google Analytics 4 y Metadatos OpenGraph (Redes Sociales).

### 4. Infraestructura & Seguridad
*   **Despliegue Seguro**: Uso de variables de entorno (`.env`) para credenciales.
*   **Cloudflare Ready**: Purga automática de caché de Cloudflare al completar una sincronización.
*   **Generación Estática**: El sitio se compila a HTML estático (`next build`) para máxima velocidad y seguridad.

---

## 🛠️ Stack Tecnológico

*   **Frontend**: [Next.js 15](https://nextjs.org/) (App Router, Static Export).
*   **Estilos**: Tailwind CSS.
*   **Backend Base**: Google Drive API v3 (Node.js).
*   **Procesamiento**: `sharp` (Node.js) para optimización de imágenes.
*   **Infraestructura**: Docker, Docker Compose, Nginx (Servidor Web).

---

## 🚀 Guía de Despliegue (Docker)

El proyecto está diseñado para desplegarse en cualquier VPS con Docker y Docker Compose.

### 1. Requisitos Previos
*   Servidor VPS (Ubuntu/Debian recomendado).
*   Docker y Docker Compose instalados.
*   **Credenciales de Google Service Account** (`credentials.json`) con permisos de lectura en la carpeta de Drive.

### 2. Configuración de Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example`):

```bash
# Credenciales del Panel de Admin
ADMIN_USER=admin
ADMIN_PASS=tu_contraseña_segura

# Dominio (para SEO y Sitemaps)
DOMAIN_NAME=midominio.com

# Cloudflare (Opcional - Para purga automática)
CLOUDFLARE_ZONE_ID=tu_zone_id
CLOUDFLARE_API_TOKEN=tu_api_token
```

### 3. Despliegue con Docker Compose
```bash
# Iniciar los contenedores (Backend + Servidor Estático)
docker-compose up -d --build
```

### 4. Estructura de Volúmenes (Persistencia)
El `docker-compose.yml` crea dos volúmenes importantes:
*   `catalog_cache`: Guarda la configuración (`config.json`), la base de datos local (`structure.json`) y las credenciales.
*   `catalog_images`: Guarda las imágenes optimizadas.

**Nota:** Para la primera instalación, debes colocar tu `credentials.json` dentro del volumen `catalog_cache` o subirlo vía SCP a la ruta mapeada.

---

## ⚙️ Configuración Inicial (Paso a Paso)

1.  **Acceder al Admin**: Navega a `https://tu-dominio.com/modaadmin`.
2.  **Login**: Usa las credenciales definidas en el `.env`.
3.  **Configurar Drive**:
    *   Copia el **ID de la Carpeta Raíz** de Google Drive (la parte final de la URL).
    *   Pégalo en el campo "Root Folder ID".
4.  **Google Analytics (Opcional)**: Pega tu ID de medición (G-XXXXXX).
5.  **Guardar Configuración**: Haz clic en "Save Config".
6.  **Sincronizar**:
    *   Haz clic en el botón azul **"Sync Catalog"**.
    *   Observa los logs en la consola negra.
    *   Espera a que diga **"Deployment Complete"**.

---

## 📂 Estructura del Proyecto

*   `src/app`: Rutas de Next.js (App Router).
    *   `src/app/api`: Endpoints del Backend (Sync, Config, Auth).
    *   `src/app/modaadmin`: Panel de Administración.
*   `src/lib`: Lógica de negocio.
    *   `drive.ts`: Cliente de Google Drive.
    *   `sync-engine.ts`: Motor de descarga y optimización (`sharp`).
    *   `cache.ts`: Gestión de caché y estructura de datos.
*   `docker-compose.yml`:Orquestación de servicios.
*   `nginx/nginx.conf`: Configuración del servidor web estático.

---

## 📝 Notas para Desarrolladores

*   **Modo Estático vs Dinámico**: El frontend se compila como estático (`output: 'export'`), pero el panel de administración (`/modaadmin`) y la API (`/api/*`) corren en el contenedor de backend (`node`). Nginx o Traefik se encargan de enrutar el tráfico correctamente.
*   **Depuración de Sync**: Los logs de sincronización se guardan en `src/lib/status.ts` y se persisten en `status.json` dentro del volumen de caché.

---
Desarrollado con ❤️ y Tecnología Agentic AI.
