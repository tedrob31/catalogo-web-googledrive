# Catálogo Web Sincronizado con Google Drive 🚀

Este proyecto es un catálogo web de alto rendimiento que utiliza **Google Drive** como CMS (Sistema de Gestión de Contenidos) y un sistema de **Espejo Local** para servir las imágenes instantáneamente.

## 🌟 Características Principales

*   **Sincronización Inteligente**: Se conecta a una carpeta de Google Drive y replica su estructura de carpetas y fotos.
*   **Espejo Local (Local Mirror)**: Descarga, redimensiona y optimiza todas las imágenes en el servidor VPS.
    *   Formato: **WebP**
    *   Resolución: **1600px** (Optimizado para <150KB)
    *   Calidad: **75** (Compresión eficiente con `sharp`)
    *   Carga instantánea (0ms de latencia externa) para el usuario final.
*   **Diseño Moderno**: Interfaz oscura/clara, Grid responsivo, Lightbox profesional con Zoom.
*   **SEO Automático**: Genera metadatos basados en la estructura de carpetas.

## 🛠️ Stack Tecnológico

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Lenguaje**: TypeScript
*   **Estilos**: Tailwind CSS
*   **Backend / API**: Google Drive API v3
*   **Procesamiento de Imágenes**: `sharp` (Node.js)
*   **Infraestructura**: Docker & Docker Compose

## 📂 Arquitectura de Carpetas

*   `src/lib/drive.ts`: Cliente de Google Drive API.
*   `src/lib/sync-engine.ts`: Motor de descarga y optimización de imágenes (`sharp`).
*   `src/lib/cache.ts`: Lógica de sincronización, gestión de `structure.json` y migración de URLs.
*   `src/lib/config.ts`: Gestión de la configuración del sitio (título, colores, IDs de carpetas).
*   `src/components`: Componentes UI (CatalogView, PhotoCard, AlbumCard, Lightbox).

## 🚀 Despliegue con Docker

El proyecto está contenerizado para un despliegue fácil en VPS (ej. Portainer).

### Estructura de Volúmenes Requerida:

1.  **`catalog_cache`**: `/app/cache`
    *   Almacena `credentials.json` (Service Account de Google).
    *   Almacena `config.json` y `structure.json`.
    *   **NO BORRAR** este volumen o perderás la conexión.
2.  **`catalog_images`**: `/app/public/images`
    *   Almacena los archivos `.webp` optimizados.
    *   Puede borrarse sin riesgo (se regenerará al sincronizar).

### Comandos de Despliegue:

```bash
# Construir e iniciar
docker-compose up -d --build
```

## ⚙️ Configuración y Sincronización

1.  **Credenciales**: Coloca tu `credentials.json` en la carpeta `cache` (o monta el volumen).
2.  **Primer Inicio**: El catálogo estará vacío.
3.  **Panel de Administración**: Acceda a `/modaadmin` (Usuario/Pass definidos en variables de entorno).
4.  **Sincronizar**:
    *   Haga clic en **"Sync Catalog"**.
    *   El sistema descargará la estructura de Drive.
    *   Descargará y optimizará TODAS las imágenes nuevas a la carpeta local.
    *   Actualizará las rutas para servir contenido localmente.

## 📝 Notas para Desarrolladores / IA

Si estás retomando este proyecto:
*   La "verdad" del estado actual está en `src/lib/cache.ts` y `src/lib/sync-engine.ts`.
*   El sistema **NO** sirve imágenes directamente desde Google Drive (para evitar cuotas y latencia).
*   Siempre que se edite la lógica de sincronización, verificar que `validIds` se rellene correctamente para evitar el borrado accidental de fotos en `cleanOrphanedImages`.

---
Desarrollado con ❤️ y Agentes de IA.
