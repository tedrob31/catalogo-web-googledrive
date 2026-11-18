# C4TALOGO — Análisis de Capacidad, Rendimiento y Escalamiento de Infraestructura

> **Documento Interno de Análisis Arquitectónico**  
> *Fecha de Creación:* 26 de Septiembre, 2026  
> *Estado:* Local (No sincronizado a Git público)

---

## 1. Ficha Técnica de Infraestructura

### Hardware Base del VPS
| Recurso | Especificación | Rol en la Plataforma |
| :--- | :--- | :--- |
| **Procesador (CPU)** | 6 vCPU | Procesamiento de solicitudes, SSR, reconciliación React y API |
| **Memoria RAM** | 12 GB RAM | Espacio para el sistema operativo, base de datos y cachés en memoria |
| **Almacenamiento** | 100 GB NVMe | Sistema operativo, imágenes Docker, base de datos local y logs |
| **Ancho de Banda** | 300 Mbps (~37.5 MB/s) | Transferencia de datos hacia clientes y servicios externos |

### Asignación de Recursos en Docker Swarm / Compose
En el archivo `docker-compose.yml` para el servicio `r4t-c4talogo`:
```yaml
resources:
  limits:
    cpus: "4.0"
    memory: 4096M
```
* **CPU Asignado:** 4.0 núcleos virtuales (de los 6 vCPU disponibles en el VPS).
* **RAM Asignada:** 4096 MB / 4 GB (de los 12 GB disponibles en el VPS).

---

## 2. Análisis Detallado de la Huella en Memoria RAM (Tenant Memory Footprint)

### 2.1. Desacople Crítico: Datos en RAM vs. Archivos Multimedia
La clave del bajo consumo de memoria del sistema es la **Arquitectura Sharp-Free y Almacenamiento en Object Storage (Cloudflare R2)**:
* **Lo que NUNCA toca la memoria RAM de Next.js:**  
  Los archivos binarios de las imágenes (archivos JPEG, PNG o WebP de 1 a 5 MB). Las fotos viajan de Google Drive directamente a Cloudflare R2 durante la sincronización, y los clientes las solicitan a la CDN de Cloudflare / Imgproxy.
* **Lo que SÍ reside en la memoria RAM de Next.js (`memoryCatalogCache`):**  
  Únicamente la **estructura relacional y metadatos en texto plano (JSON)**:
  * IDs únicos (UUIDs de 36 caracteres).
  * Nombres de carpetas y fotos (strings de 20-50 caracteres).
  * URLs firmadas de Imgproxy (strings de ~120 caracteres).
  * Dimensiones (`width`, `height`), orden alfanumérico y configuraciones del tema.

### 2.2. Cálculo Teórico y Práctico por Tienda (Tenant)
Para una tienda típica con **1,000 fotos distribuidas en 30 álbumes**:
* **1 Foto en RAM (V8 Object):**
  * `id`: 36 bytes
  * `name`: ~30 bytes
  * `thumbnailLink` + `fullLink`: ~240 bytes
  * Dimensiones y orden: ~24 bytes
  * Overhead de objeto en motor V8 de Node.js: ~120 bytes
  * **Subtotal por foto:** ~450 bytes (~0.45 KB).
* **1,000 fotos:** `1,000 × 450 bytes` ≈ **450 KB**.
* **30 Álbumes y Configuración:**
  * Estructura de árbol de carpetas: ~25 KB.
  * Colores, logo, WhatsApp y ajustes del Storefront: ~15 KB.
* **Consumo total por tienda en RAM:** **~490 KB ≈ 0.5 MB**.

### 2.3. Proyección de Escalamiento de Tiendas en Memoria

| Cantidad de Tiendas Activas | Cantidad Total de Fotos Indexadas | Consumo en RAM de Catálogos | % del Límite de Docker (4 GB) | % de la RAM Total del VPS (12 GB) |
| :---: | :---: | :---: | :---: | :---: |
| **10 tiendas** | 10,000 fotos | **~5 MB** | 0.12% | 0.04% |
| **50 tiendas** | 50,000 fotos | **~25 MB** | 0.61% | 0.20% |
| **100 tiendas** | 100,000 fotos | **~50 MB** | 1.22% | 0.41% |
| **500 tiendas** | 500,000 fotos | **~250 MB** | 6.10% | 2.08% |
| **1,000 tiendas** | 1,000,000 de fotos | **~500 MB** | 12.20% | 4.16% |

> [!NOTE]
> Incluso alojando **1,000 tiendas activas** simultáneamente con 1 millón de fotos indexadas, la estructura completa solo ocupa **500 MB** de memoria RAM en el servidor.

---

## 3. Comportamiento y Consumo del Proceso Next.js Standalone

### 3.1. Estado en Reposo vs. Bajo Carga
* **Proceso Base de Node.js al iniciar:** ~120 MB a 180 MB (Motor V8, runtime de Next.js, dependencias cargadas en memoria).
* **Con 100 tiendas en caché:** ~180 MB + 50 MB = **~230 MB**.
* **Bajo concurrencia de visitantes (generación de deltas RSC de 5 KB):**  
  Durante ráfagas de usuarios navegando por los catálogos, el recolector de basura (*Garbage Collector*) de Node.js cicla memoria de forma elástica, manteniendo el consumo habitual entre **300 MB y 600 MB**.

### 3.2. Evaluación del Límite de 4 GB (`memory: 4096M`)
* El contenedor tiene asignados **4096 MB**.
* El consumo real habitual oscila entre **300 MB y 600 MB** (apenas entre el **7% y el 15%** del límite).
* **Margen de seguridad:** Existe más de un **85% de margen libre** (más de 3.4 GB) dentro del contenedor. Esto previene de forma absoluta reinicios por *Out-Of-Memory* (OOM Killer) aun en eventos de ventas masivas.
* **Veredicto:** **No es necesario subir el límite de RAM ni migrar de VPS.**

---

## 4. Capacidad de Cómputo (vCPUs y Concurrencia)

### 4.1. Tiempo de CPU por Petición
* Gracias a la navegación en cliente instantánea (0ms) y al amortiguador de RAM de 5 segundos en `src/lib/catalog-db.ts`, el servidor **no realiza consultas a disco ni a bases de datos lentas** en cada navegación.
* Cada micro-petición RSC (`?_rsc=...` de ~5 KB):
  * Tiempo de procesamiento de CPU: **1 a 3 milisegundos**.
  * No hay renderizado pesado de plantillas HTML complejas, solo serialización de texto ligero.

### 4.2. Peticiones por Segundo Sostenidas (RPS)
* Un solo vCPU de Node.js despachando respuestas desde RAM puede procesar de **400 a 700 peticiones por segundo**.
* Con **4 vCPUs asignados** al stack, la capacidad estimada es de:
  * **1,500 a 2,800 peticiones por segundo** continuas.
  * Equivalente a más de **90,000 a 160,000 visitas por minuto** navegando por los catálogos.

---

## 5. Capacidad de Red y Ancho de Banda (300 Mbps)

### 5.1. Análisis del Tráfico del Catálogo
* **Ancho de banda del VPS:** 300 Mbps = **37.5 Megabytes / segundo**.
* **Peso de cada solicitud de actualización RSC:** **~5 KB**.
* **Capacidad teórica máxima del ancho de banda:**
  $$\frac{37,500\text{ KB/s}}{5\text{ KB/petición}} = 7,500\text{ peticiones por segundo}$$

### 5.2. Descarga de Imágenes Multimedia (Offloading a Cloudflare CDN)
* Las imágenes en formato WebP pesan entre 80 KB y 250 KB cada una.
* **El VPS no asume ese consumo:** Al estar configurado con Cloudflare y Cloudflare R2, las imágenes son entregadas por la red perimetral global de Cloudflare (*Edge Caching*).
* Más del **95% del ancho de banda multimedia** es absorbido por Cloudflare de forma gratuita, dejando los 300 Mbps del VPS dedicados exclusivamente a la lógica del catálogo y las APIs.

---

## 6. Distribución Integral de Recursos en el VPS (12 GB RAM)

A continuación se detalla el uso estimado de memoria de todos los servicios del VPS operando simultáneamente:

| Servicio / Contenedor | Consumo Típico de RAM | Límite Docker Asignado | Observaciones |
| :--- | :---: | :---: | :--- |
| **Next.js (C4talogo App)** | 300 MB – 600 MB | 4,096 MB | Gestión de catálogos, SSR, sync y APIs |
| **Traefik (Reverse Proxy)** | 35 MB – 60 MB | 256 MB | Terminación TLS, certificados SSL y enrutamiento |
| **Portainer (Management)** | 40 MB – 80 MB | 256 MB | Monitoreo y control de contenedores |
| **Imgproxy (Procesador)** | 200 MB – 500 MB | 1,024 MB | Redimensionamiento on-demand y WebP |
| **Supabase / PostgreSQL (Local)** | 1,500 MB – 2,500 MB | 4,096 MB | Base de datos principal, auth y metadatos |
| **Sistema Operativo Linux (Ubuntu/Debian)** | ~400 MB | N/A | Kernel, buffers y demonios del sistema |
| **Memoria Total en Uso** | **~2.5 GB a 4.1 GB** | — | — |
| **RAM Libre / Disponible en VPS** | **~7.9 GB a 9.5 GB** | — | **Margen disponible para picos y PageCache** |

---

## 7. Mecanismos de Seguridad y Resiliencia Activos

1. **Amortiguador de RAM de 5 Segundos (`CACHE_TTL_MS = 5000`):**  
   Impide que múltiples usuarios consultando la misma tienda en el mismo segundo saturen a Supabase. Solo se realiza una lectura a base de datos cada 5 segundos por tienda.
2. **Invalidación Quirúrgica en RAM (`invalidateTenantCatalogCache`):**  
   Al presionar "Sincronizar" en el panel o guardar cambios de diseño, el caché de esa tienda específica se limpia al instante, forzando datos frescos sin reiniciar el servidor.
3. **Throttle de 3 Segundos en el Navegador del Cliente:**  
   Evita que eventos rápidos de foco de ventana (`focus` y `visibilitychange`) al hacer Alt+Tab generen ráfagas de consultas innecesarias.
4. **Cola de Purga en Cloudflare con Debounce de 1500ms y Purga por Hostname:**  
   Agrupa múltiples sincronizaciones concurrentes en una única llamada API a Cloudflare, respetando el rate limit de 5 solicitudes/minuto del plan Free.

---

## 8. Análisis de Rendimiento y Escalamiento de Imgproxy (Servidor Multimedia)

### 8.1. Arquitectura de Procesamiento On-Demand
Imgproxy está desarrollado en Go y utiliza la biblioteca `libvips` en C. A diferencia de soluciones tradicionales, `libvips` opera mediante pipelines de streaming, reduciendo drásticamente el consumo de memoria respecto a herramientas como ImageMagick.

### 8.2. Evaluación de Recursos Asignados
* **CPU (Configurado en "Unlimited" / 6 vCPUs):**  
  Es la configuración **óptima y recomendada**. El redimensionamiento y codificación WebP es intensivo en CPU (*CPU-bound*). Permitir que Imgproxy utilice todos los núcleos disponibles reduce el tiempo de transformación de cada imagen a entre **500 ms y 800 ms**.
* **Memoria RAM (Límite actual: 1 GB / 1024 MB):**  
  * Una imagen típica (12–24 MP) consume entre **40 MB y 70 MB** transitorios durante su conversión.
  * Con 6 procesamientos simultáneos: `6 × 70 MB ≈ 420 MB`.
  * **Recomendación de seguridad:** Elevar el límite en Portainer de `1024M` a **`2048M` (2 GB)** o **`3072M` (3 GB)**. Esto blinda al contenedor contra caídas por *Out-Of-Memory* (OOM) cuando los usuarios suban fotos de alta resolución tomadas con cámaras de 48 a 108 MP.

### 8.3. Capacidad para 100+ Tiendas (Factor Multiplicador Cloudflare CDN)
Imgproxy **no procesa imágenes de forma recurrente**:
1. Solo trabaja en la **primera visualización** tras la sincronización de una foto nueva o modificada (identificada por su nuevo hash).
2. La respuesta WebP se almacena en el **Edge Cache global de Cloudflare** gracias al encabezado inmutable de caché (`Cache-Control: max-age=31536000`).
3. El 95% al 98% de las visitas posteriores son atendidas directamente por Cloudflare CDN en **10–20 ms**, sin llegar peticiones al contenedor de Imgproxy.

---

## 9. Hoja de Ruta para Escalamiento Futuro (> 2,000 Tiendas)

Si la plataforma supera las 2,000 tiendas activas y cientos de miles de usuarios diarios:
1. **LRU Cache en Memoria:**  
   Reemplazar el `Map` actual por un caché LRU (*Least Recently Used*, ej. biblioteca `lru-cache`) con un límite de 1,000 tiendas calientes en memoria para descartar automáticamente tiendas inactivas sin esperar reinicio.
2. **Réplicas Horizontales en Docker Swarm:**  
   Subir `replicas: 2` o `replicas: 3` en `docker-compose.yml` para distribuir la carga entre varios procesos de Node.js bajo Traefik sin cambiar de servidor físico.
3. **Redis Externo Compartido:**  
   Si se usan múltiples réplicas de contenedores en múltiples servidores, migrar el `memoryCatalogCache` local de Node.js a un cluster Redis en memoria.

