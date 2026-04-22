# 🚀 Catálogo Web Antigravity (Next.js Standalone + ISR)

Sistema de catálogo e-commerce ultra-rápido que sincroniza de forma transparente su contenido visual desde Google Drive, diseñado para Alto Rendimiento, Cloudflare Edge Caching y Experiencia de Usuario sin FOUC.

Construido sobre **Next.js 15 App Router** en modo `standalone`, asegurando despliegues ágiles en Docker Swarm mientras se mantienen capacidades dinámicas como Edge Middleware y Server Actions.

---

## 🔥 Arquitectura de Caché Estructurada y Sincronizaciones

Este proyecto soluciona los complejos problemas de "Stale Data" (Información obsoleta) nativos del App Router de Next.js. El Catálogo NUNCA mostrará una foto antigua gracias a esta ingeniería:

*   **Navegación MPA Forzada:** Todos los componentes de navegación en tienda (`HeroBanner`, `ClassicGrid`, `CatalogView`) utilizan intencionalmente componentes `<a>` puros de HTML clásico en vez de Client-Side `<Link>`. Esto detiene el abusivo *Router Cache* interno de Next.js, forzando peticiones HTTP reales al Edge de Cloudflare que responden en <30ms asegurando consistencia de datos absolutos.
*   **Purga Híbrida Avanzada (Cloudflare API):**
    *   **Cambios Menores (1-5 carpetas):** El motor lee el `.next/BUILD_ID` generado durante el despliegue para invalidar selectivamente los assets estáticos y las variables secretas `_rsc` exclusivas de ese álbum. **Ventaja:** El 99% de los otros subdominios e imágenes permanecen súper cargados en disco y memoria CDN.
    *   **Cambios Masivos/Layout:** El sistema conmuta automáticamente a una purga selectiva por `Hostname`, barriendo el dominio actual sin perjudicar subdominios hermanos en el mismo Zone ID de Cloudflare.
*   **Edge Middleware Activo:** Inyección de escudos de cabeceras (`Cache-Control: max-age=0`) a Chrome específicamente cuando intenta retener payloads `?_rsc=` en el _Disk Cache_ de las PC de tus clientes. 

---

## 🏎️ Características Visuales (Storefront UX)

*   **Sin Destellos Visuales (Zero FOUC):** La grilla de productos dinámica abandonó los estilos inyectables por JS de Next (`<style jsx>`) a favor de Inyección Nativa de Propiedades CSS. Esto hace imposible que las imágenes carguen "gigantes" antes de ajustarse a la grilla durante la transición.
*   **Diseño de Álbumes Híbrido:** Las previsualizaciones (`CategoryCarousel`) tienen un layout _Intrinsic_ permitiendo flujos similares al de Falabella, donde las fotos imponen el layout para lucir prendas de cuerpo entero con _aspectRatios_ nativos.
*   **Storefront Builder Interactivo (`/modaadmin`):**
    *   Controles flotantes que permiten inyectar secciones nuevas entre otras existentes vía splice.
    *   Simulador Sticky en Desktop que emula la previsualización del cliente móvil.
    *   Motor de URLs Recursivas que traza rutas absolutas (Ej: `/moda-mujer/blusas/casuales`) para evitar enlaces rotos.

---

## ⚙️ Sincronización Automática (Cron Engine)

*   Cuenta con un Demonio Cron automatizado (`src/lib/cron.ts`) que vigila los servidores y autoejecuta peticiones ISR/Sync en segundo plano sin interrumpir al cliente web.
*   Sensibilidad de **Capa Horaria Pura**: Corrige las discrepancias de tiempos UTC de Docker localizando artificialmente el horario en `America/Lima` garantizando que los Syncs operen estrictamente en la ventana útil configurada de tu negocio (ej. 10:00 AM - 10:00 PM).

---

## 🛠️ Requisitos e Instalación

*   Docker Swarm / Node.js 20+
*   Cuenta de GCP Limitada con permisos sobre la carpeta Drive.
*   Cuenta de Cloudflare apuntada como DNS (Recomendando **Browser Cache TTL: Respect Existing Headers** para que Chrome escuche nuestra configuración dinámica).

### Configuración `.env`
Crea tu `.env` con las variables seguras:
```ini
NEXT_PUBLIC_DOMAIN_NAME=catalogo.tu-sitio.com
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_API_TOKEN=...
ADMIN_USER=admin
ADMIN_PASS=...
```

### Ejecutar Servidor
```bash
# Desarrollo
npm install
npm run dev

# Compilación (Produce la caja negra de producción ./standalone)
npm run build 

# Run Prd
node .next/standalone/server.js
```
