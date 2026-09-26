/**
 * Opciones para la purga inteligente en Cloudflare API v4
 */
export interface CloudflarePurgeOptions {
  subdomain?: string;
  urls?: string[]; // Lista de URLs o paths específicos (ej: ['/', '/album/verano'])
  purgeAll?: boolean; // Forzar purga total del subdominio o de la zona
  threshold?: number; // Umbral para decidir entre purga puntual o por host (por defecto: 5)
}

/**
 * Estado interno de un lote de purga en memoria
 */
interface BatchState {
  purgeEverything: boolean;
  hosts: Set<string>;
  files: Set<string>;
  resolvers: Array<() => void>;
}

// Variables de cola y debounce a nivel de módulo (proceso Node.js)
let pendingBatch: BatchState | null = null;
let batchTimer: NodeJS.Timeout | null = null;
let queueChain: Promise<void> = Promise.resolve();

/**
 * Espera pasiva en milisegundos
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ejecuta una petición HTTP a Cloudflare con manejo de Rate Limit (429),
 * reintentos exponenciales y fallback resiliente.
 */
async function sendPurgeRequestWithRetry(
  cfZoneId: string,
  cfToken: string,
  payload: Record<string, any>,
  maxRetries = 2
): Promise<void> {
  const url = `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Cloudflare Purge Queue] Enviando petición a Cloudflare (intento ${attempt + 1}/${maxRetries + 1}):`, JSON.stringify(payload));

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // MANEJO DE RATE LIMIT (HTTP 429)
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const waitSeconds = retryAfterHeader ? Math.max(1, parseInt(retryAfterHeader, 10)) : 12;
        console.warn(`[Cloudflare Purge Queue] Rate limit 429 alcanzado. Esperando ${waitSeconds}s antes de reintentar...`);

        if (attempt < maxRetries) {
          await sleep(waitSeconds * 1000);
          continue; // Reintentar tras esperar
        } else {
          console.error('[Cloudflare Purge Queue] Se agotaron los reintentos tras error 429 de Cloudflare.');
          return;
        }
      }

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        console.warn(`[Cloudflare Purge Queue] Advertencia de Cloudflare:`, data?.errors || res.statusText);

        // Fallback: Si el error indica requerimiento Enterprise o error 1000, fallback a purge_everything
        const isEnterpriseError = data?.errors?.some((e: any) =>
          e.code === 1000 ||
          String(e.message || '').toLowerCase().includes('enterprise')
        );

        if (isEnterpriseError && !payload.purge_everything) {
          console.log('[Cloudflare Purge Queue] Fallback a purga de zona completa (purge_everything: true)...');
          await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ purge_everything: true }),
          });
        }
        return;
      }

      console.log(`[Cloudflare Purge Queue] Caché purgada exitosamente en Cloudflare.`);
      return;
    } catch (err) {
      console.error(`[Cloudflare Purge Queue] Error al contactar la API de Cloudflare (intento ${attempt + 1}):`, err);
      if (attempt < maxRetries) {
        await sleep(3000);
      }
    }
  }
}

/**
 * Procesa un lote acumulado de purgas respetando los límites de Cloudflare:
 * - hosts: hasta 100 por petición
 * - files: hasta 30 por petición
 * - deduplicación inteligente: si un host ya se purga, omite los files de ese host
 */
async function processBatch(batch: BatchState, cfZoneId: string, cfToken: string) {
  try {
    // CASO 1: Purga completa de zona
    if (batch.purgeEverything) {
      await sendPurgeRequestWithRetry(cfZoneId, cfToken, { purge_everything: true });
      return;
    }

    // CASO 2: Purgas por Hostname (agrupadas hasta 100 por llamada)
    if (batch.hosts.size > 0) {
      // Optimización: Eliminar de 'files' cualquier URL cuyo host ya esté en 'hosts'
      for (const fileUrl of Array.from(batch.files)) {
        try {
          const parsed = new URL(fileUrl);
          if (batch.hosts.has(parsed.host)) {
            batch.files.delete(fileUrl);
          }
        } catch (_) {}
      }

      const hostList = Array.from(batch.hosts);
      // Chunking de 100 hosts por llamada (límite oficial de Cloudflare)
      for (let i = 0; i < hostList.length; i += 100) {
        const chunk = hostList.slice(i, i + 100);
        await sendPurgeRequestWithRetry(cfZoneId, cfToken, { hosts: chunk });
        // Pequeña pausa entre peticiones si hay más de 1 chunk
        if (i + 100 < hostList.length) {
          await sleep(1000);
        }
      }
    }

    // CASO 3: Purgas por URL / File (agrupadas hasta 30 por llamada)
    if (batch.files.size > 0) {
      const fileList = Array.from(batch.files);
      // Chunking de 30 URLs por llamada (límite oficial de Cloudflare para files)
      for (let i = 0; i < fileList.length; i += 30) {
        const chunk = fileList.slice(i, i + 30);
        await sendPurgeRequestWithRetry(cfZoneId, cfToken, { files: chunk });
        if (i + 30 < fileList.length) {
          await sleep(1000);
        }
      }
    }
  } catch (err) {
    console.error('[Cloudflare Purge Queue] Error inesperado en processBatch:', err);
  } finally {
    // Notificar a todos los invocadores del lote que el proceso concluyó
    for (const resolveCallback of batch.resolvers) {
      try {
        resolveCallback();
      } catch (_) {}
    }
  }
}

/**
 * Despacha el lote actual hacia la cola secuencial (FIFO)
 */
function flushPendingBatch(cfZoneId: string, cfToken: string) {
  if (!pendingBatch) return;

  const currentBatch = pendingBatch;
  pendingBatch = null; // Reiniciar inmediatamente para que nuevas llamadas creen el siguiente lote

  // Encadenar en la cola secuencial para evitar condiciones de carrera entre lotes
  queueChain = queueChain.then(() => processBatch(currentBatch, cfZoneId, cfToken));
}

/**
 * Purga de caché inteligente y resiliente en Cloudflare API v4
 * 
 * Características:
 * 1. Debounce y Batching Automático (1500ms): Si varios usuarios sincronizan a la vez,
 *    se agrupan hasta 100 subdominios o 30 URLs en una sola llamada a la API, ahorrando llamadas.
 * 2. Cola Secuencial (FIFO): Las solicitudes se procesan en orden sin colisiones.
 * 3. Rate Limit Resilient (429): Si Cloudflare responde 429, espera con Retry-After y reintenta.
 * 4. Safety Timeout (8s): Nunca bloquea indefinidamente la sincronización ni las rutas del usuario.
 */
export async function purgeCloudflareCache(optionsOrSubdomain?: string | CloudflarePurgeOptions): Promise<void> {
  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com';

  if (!cfZoneId || !cfToken) {
    return;
  }

  // Compatibilidad hacia atrás: acepta string (subdomain) o CloudflarePurgeOptions
  const options: CloudflarePurgeOptions = typeof optionsOrSubdomain === 'string'
    ? { subdomain: optionsOrSubdomain }
    : (optionsOrSubdomain || {});

  const { subdomain, urls = [], purgeAll = false, threshold = 5 } = options;
  const tenantHost = subdomain ? `${subdomain}.${baseDomain}` : null;

  return new Promise<void>((resolve) => {
    // Timeout de seguridad: Si la cola se demora más de 8s (por backoff), resolvemos para no colgar el sync
    let isResolved = false;
    const safetyTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    }, 8000);

    const safeResolve = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(safetyTimer);
        resolve();
      }
    };

    // Inicializar el lote pendiente si no existe
    if (!pendingBatch) {
      pendingBatch = {
        purgeEverything: false,
        hosts: new Set<string>(),
        files: new Set<string>(),
        resolvers: [],
      };
    }

    pendingBatch.resolvers.push(safeResolve);

    // Clasificación de la solicitud:
    // CASO 1: Purga selectiva de pocas URLs específicas (files)
    if (!purgeAll && urls.length > 0 && urls.length <= threshold) {
      for (const u of urls) {
        if (u.startsWith('http://') || u.startsWith('https://')) {
          pendingBatch.files.add(u);
        } else {
          const host = tenantHost || baseDomain;
          const normalizedPath = u.startsWith('/') ? u : `/${u}`;
          pendingBatch.files.add(`https://${host}${normalizedPath}`);
        }
      }
    }
    // CASO 2: Purga por Hostname (subdominio del inquilino)
    else if (tenantHost) {
      pendingBatch.hosts.add(tenantHost);
    }
    // CASO 3: Purga global de la zona completa
    else {
      pendingBatch.purgeEverything = true;
    }

    // Programar el despacho del lote con una ventana de 1500ms
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        batchTimer = null;
        flushPendingBatch(cfZoneId, cfToken);
      }, 1500);
    }
  });
}
