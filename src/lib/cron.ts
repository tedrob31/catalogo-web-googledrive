import { getConfig } from './config';
import { ensureCacheDir, loadCache } from './cache';

let isDaemonRunning = false;
let isSyncing = false;

export function startSyncDaemon() {
    if (isDaemonRunning) return;
    isDaemonRunning = true;
    console.log('[Cron] Demonio Fantasma de Sincronización Automática activado.');

    // Ejecuta el tick cada 60 segundos
    setInterval(async () => {
        if (isSyncing) return;

        try {
            await ensureCacheDir();
            const config = await getConfig();
            
            // Apagado o intervalo inválido
            if (config.autoSyncEnabled === false || !config.autoSyncInterval || config.autoSyncInterval <= 0) {
                return; 
            }

            const data = await loadCache();
            if (!data || !data.root) return;

            const lastSyncTime = data.lastSynced ? new Date(data.lastSynced).getTime() : 0;
            const now = Date.now();
            const diffMinutes = lastSyncTime === 0 ? config.autoSyncInterval : (now - lastSyncTime) / (1000 * 60);

            if (diffMinutes >= config.autoSyncInterval) {
                const startHour = config.autoSyncStartHour ?? 0;
                const endHour = config.autoSyncEndHour ?? 23;
                const currentHour = new Date().getHours();

                let isWithinWindow = false;
                if (startHour <= endHour) {
                    isWithinWindow = currentHour >= startHour && currentHour <= endHour;
                } else {
                    isWithinWindow = currentHour >= startHour || currentHour <= endHour;
                }

                if (isWithinWindow) {
                    console.log(`[Cron] Reloj interno alcanzó intervalo (${config.autoSyncInterval} mins). Iniciando Auto-Sincronización en segundo plano...`);
                    
                    isSyncing = true;
                    try {
                        const port = process.env.PORT || 3000;
                        const res = await fetch(`http://localhost:${port}/api/sync`, { method: 'POST' });
                        if (res.ok) {
                            console.log('[Cron] Sincronización, Purga de Cloudflare y Limpieza ISR completadas exitosamente vía API.');
                        } else {
                            console.error(`[Cron] Endpoint /api/sync devolvió status ${res.status}`);
                        }
                    } finally {
                        isSyncing = false;
                    }
                }
            }
        } catch (error) {
            console.error('[Cron] Error en el tick del demonio:', error);
            isSyncing = false;
        }
    }, 60 * 1000); // Tick cada 1 minuto
}
