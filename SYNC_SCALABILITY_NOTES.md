# 📌 Notas de Arquitectura: Rendimiento y Concurrencia de Sincronización

Este documento resume el funcionamiento actual, las capacidades del servidor y la hoja de ruta para optimizar la sincronización de catálogos masivos (5,000+ fotos) sin saturar recursos.

---

## 1. Comportamiento Actual

* **Ejecución en Background Desacoplada (`src/app/api/sync/route.ts`):**
  * Al hacer clic en sincronizar, el endpoint responde en **~50 ms** con `{ status: 'started', logId }` para evitar el Timeout 524 de Cloudflare (límite de 100s).
  * La sincronización continúa corriendo como una **Promesa en segundo plano (Background Promise)** en Node.js dentro del VPS.
  * El dashboard consulta el progreso mediante polling cada 2-3 segundos hacia la tabla `sync_logs`.
* **Procesamiento Secuencial (1 por 1):**
  * Descarga binaria de Google Drive -> Buffer en RAM -> Subida directa a Cloudflare R2 -> Guardado en Supabase.
  * Promedio de velocidad: **~0.8 a 1.2 segundos por foto**.
  * Para 5,000 fotos en la primera carga: **~60 a 75 minutos**.
* **Contador en saltos de 5 en 5 (`Sync (5)...`, `Sync (10)...`):**
  * Para no saturar a Supabase con 5,000 sentencias `UPDATE`, el progreso en base de datos se emite cada 5 fotos subidas (`progress.newUploaded % 5 === 0`).
* **Sincronizaciones Posteriores (Modo Espejo Inteligente):**
  * Si las fotos ya están en R2, la verificación de MD5 se hace en memoria RAM en **menos de 3 a 5 segundos** para todo el catálogo de 5,000 fotos.

---

## 2. Consumo de Recursos en el VPS (4 vCPU / 7 GB RAM)

* **CPU:** Muy bajo (< 10%). El VPS **no ejecuta Sharp ni recomprime fotos**. Todo el procesamiento de imagen lo realiza Cloudflare Edge on-demand. Es una tarea 100% dependiente de I/O de red.
* **Memoria RAM:** Muy bajo (~20 a 30 MB). Al procesar una imagen a la vez, el buffer en RAM se libera inmediatamente después de subir a R2.
* **Resiliencia ante Reinicios:** Si el contenedor se reinicia o se despliega una nueva versión a mitad de una sincronización, las fotos ya subidas quedan preservadas. Al volver a sincronizar, el sistema salta automáticamente las fotos ya procesadas y continúa desde la pendiente.

---

## 3. Capacidad de Concurrencia Real Sin Colas (Filosofía Zero-Queue)

* **Capacidad estimada en tiempo real:** **15 a 25 tiendas sincronizando al mismo segundo** sin colas y sin degradar la experiencia de los visitantes.
* **Desglose de métricas con 20 tiendas simultáneas:**
  * **Memoria RAM:** ~160 a 200 MB en total (menos del 3% de los 7 GB disponibles en el VPS).
  * **Uso de CPU:** ~15% a 25% (4 vCPUs holgadas gracias a la ausencia de Sharp en el servidor).
  * **Ancho de banda:** ~200 Mbps de un puerto de 1 Gbps (1,000 Mbps).
  * **Cuota de Google Drive API:** ~20 a 40 req/s frente a un límite de 200 req/s por proyecto (holgura del 80%).
  * **Cloudflare R2:** ~20 escrituras/s frente al límite base de 1,000 ops/s de Cloudflare (2% de capacidad).
* **Probabilidad en producción:** Dado que la subida masiva solo ocurre una vez y las sincronizaciones posteriores duran 3 segundos, para ver a 20 tiendas coincidiendo en el mismo segundo se requiere una base activa de entre 500 y 1,000 tiendas.

---

## 4. Réplicas Docker vs 1 Contenedor Gigante: ¿Por qué replicar?

### El Límite Single-Thread de Node.js
* **Node.js ejecuta su Event Loop en 1 solo núcleo de CPU.**
* Si tienes un VPS con 8 o 16 núcleos y mantienes **1 solo contenedor**, Node.js solo exprimirá 1 núcleo al 100%, mientras los otros 7 o 15 núcleos se quedan ociosos al 0%.
* Asignarle más recursos a 1 solo contenedor (más CPU) no acelera Node.js si la carga de JavaScript satura ese único hilo.

### ¿Consumen el doble de recursos las réplicas?
* **No.** Un contenedor Docker es solo un proceso de Linux (no una máquina virtual).
* Una réplica adicional de Next.js en reposo solo consume **~100 MB de RAM base** y **0% CPU**.
* La CPU se comparte dinámicamente: Traefik reparte las peticiones entre las réplicas, haciendo que cada contenedor use un núcleo diferente del VPS.

### Comparativa de Escalamiento

| Enfoque | Ventajas | Desventajas | Escenario Recomendado |
| :--- | :--- | :--- | :--- |
| **1 Contenedor actual (4 vCPU / 7 GB)** | Cero complejidad de setup. | Limitado a 1 Event Loop (~20 tiendas concurrentes). | Hasta 300 - 500 tiendas activas. |
| **2 a 3 Réplicas en el mismo VPS** | Triplica el rendimiento de CPU (aprovecha los 4 núcleos), alta disponibilidad (si uno se reinicia el otro atiende sin caída). Solo cuesta ~100-200 MB de RAM extra. | Pequeño ajuste en docker-compose (`replicas: 2`). | Al superar 500 tiendas activas. |
| **Escalar a un VPS mejor (8-16 vCPUs) + Réplicas** | Escalamiento vertical masivo. Cero colas, atiende cientos de tiendas al mismo segundo. | Aumento leve en costo mensual del VPS ($10-$20 USD). | Al superar 1,000 tiendas activas. |

---

## 5. Hoja de Ruta para Aceleración Futura

1. **Fase 1 (Inmediata si se desea):** Activar pool de concurrencia de 3 a 4 fotos por tienda en `multitenant-sync.ts` (reduce el tiempo de 60 min a ~18-20 min por tienda).
2. **Fase 2 (Al crecer):** Subir a 2 réplicas en Docker Swarm para repartir tiendas concurrentes en núcleos separados.
3. **Fase 3 (Empresa grande):** Escalar VPS a 8/16 vCPUs manteniendo la filosofía "Zero-Queue".

