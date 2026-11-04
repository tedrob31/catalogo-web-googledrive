import { createAdminClient } from '@/lib/supabase/admin';

interface MetricEntry {
  tenant_id: string;
  date: string; // YYYY-MM-DD
  path: string;
  title: string;
  views: number;
  whatsapp: number;
}

// Acumulador en memoria RAM de Node.js (<1.5 MB de consumo máximo)
const metricBuffer = new Map<string, MetricEntry>();
let flushTimeout: NodeJS.Timeout | null = null;
let lastPruneTime = 0;

const FLUSH_INTERVAL_MS = 60 * 1000; // 60 segundos
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function getCurrentDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Registra un evento de vista o clic a WhatsApp en el buffer de RAM.
 * No realiza peticiones directas a la base de datos para no saturar conexiones.
 */
export function recordMetricEvent(
  tenantId: string,
  rawPath: string,
  rawTitle: string,
  eventType: 'view' | 'whatsapp' = 'view'
) {
  if (!tenantId) return;

  const date = getCurrentDateString();
  const path = rawPath ? (rawPath.startsWith('/') ? rawPath : `/${rawPath}`) : '/';
  const title = (rawTitle || (path === '/' ? 'Catálogo Principal' : path.replace('/', ''))).trim().substring(0, 100);

  const key = `${tenantId}::${date}::${path}`;
  const existing = metricBuffer.get(key);

  if (existing) {
    if (eventType === 'whatsapp') {
      existing.whatsapp += 1;
    } else {
      existing.views += 1;
    }
    if (title && title !== 'Catálogo Principal') {
      existing.title = title;
    }
  } else {
    metricBuffer.set(key, {
      tenant_id: tenantId,
      date,
      path,
      title,
      views: eventType === 'view' ? 1 : 0,
      whatsapp: eventType === 'whatsapp' ? 1 : 0,
    });
  }

  // Si se acumulan más de 80 entradas pendientes, forzar un flush inmediato
  if (metricBuffer.size >= 80) {
    flushAnalyticsBuffer().catch((err) =>
      console.error('[Analytics Buffer] Error en flush anticipado:', err)
    );
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      flushAnalyticsBuffer().catch((err) =>
        console.error('[Analytics Buffer] Error en flush programado:', err)
      );
    }, FLUSH_INTERVAL_MS);
  }
}

/**
 * Envía el lote acumulado en memoria RAM a Supabase usando la función atómica increment_page_metrics_batch.
 * Luego vacía el Map para liberar memoria inmediatamente.
 */
export async function flushAnalyticsBuffer() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (metricBuffer.size === 0) return;

  // Extraer snapshot de entradas y reiniciar el buffer de memoria
  const entriesToFlush = Array.from(metricBuffer.values());
  metricBuffer.clear();

  try {
    const supabase = createAdminClient();

    // Enviar el lote completo en una única llamada RPC atómica a PostgreSQL (ahorro masivo de llamadas HTTP)
    const { error: batchError } = await supabase.rpc('increment_page_metrics_batch', {
      p_metrics: entriesToFlush as any,
    });

    if (batchError) {
      console.error('[Analytics Buffer] Error en increment_page_metrics_batch, ejecutando fallback:', batchError);
      // Fallback de contingencia: procesar individualmente si el batch falla
      await Promise.allSettled(
        entriesToFlush.map((item) =>
          supabase.rpc('increment_page_metric', {
            p_tenant_id: item.tenant_id,
            p_date: item.date,
            p_path: item.path,
            p_title: item.title,
            p_views: item.views,
            p_whatsapp: item.whatsapp,
          })
        )
      );
    } else {
      console.log(
        `[Analytics Buffer] Flush por lote exitoso: ${entriesToFlush.length} registros agrupados en 1 sola llamada a Supabase.`
      );
    }

    // Ejecutar poda de registros antiguos (>35 días) si ha pasado más de 1 día
    const now = Date.now();
    if (now - lastPruneTime > PRUNE_INTERVAL_MS) {
      lastPruneTime = now;
      pruneOldMetrics().catch((e) =>
        console.error('[Analytics Buffer] Error podando métricas antiguas:', e)
      );
    }
  } catch (error) {
    console.error('[Analytics Buffer] Error crítico durante flush a Supabase:', error);
  }
}

/**
 * Elimina automáticamente registros con más de 35 días para garantizar que la tabla
 * nunca crezca indefinidamente y ocupe menos de 4 MB en disco.
 */
export async function pruneOldMetrics() {
  try {
    const supabase = createAdminClient();
    const cutoffDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { error } = await supabase
      .from('tenant_page_metrics')
      .delete()
      .lt('date', cutoffDate);

    if (error) {
      console.warn('[Analytics Prune] Error al limpiar registros anteriores a ' + cutoffDate, error);
    } else {
      console.log('[Analytics Prune] Limpieza periódica completada (anteriores a ' + cutoffDate + ').');
    }
  } catch (e) {
    console.error('[Analytics Prune] Excepción:', e);
  }
}
