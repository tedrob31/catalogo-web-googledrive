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
                
                // Forzar zona horaria Lima/Bogotá (UTC-5) independiente de la región del servidor/contenedor
                const limaTime = new Date().toLocaleString("en-US", {timeZone: "America/Lima"});
                const currentHour = new Date(limaTime).getHours();

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
                        // Usar 127.0.0.1 evita fallos en Node 18+ por resolución IPv6 (::1) de 'localhost' en ciertos contenedores
                        const res = await fetch(`http://127.0.0.1:${port}/api/sync`, { method: 'POST' });
                        if (res.ok) {
                            console.log('[Cron] Sincronización, Purga de Cloudflare y Limpieza ISR completadas exitosamente vía API.');
                        } else {
                            console.error(`[Cron] Endpoint /api/sync devolvió status ${res.status}`);
                        }
                    } finally {
                        isSyncing = false;
                    }
                } else {
                    // Evitar spam en log: solo avisar si estamos exactamente al inicio del intervalo o en la hora de inicio de una evaluación nueva
                    if (Math.floor(diffMinutes) === config.autoSyncInterval || new Date().getMinutes() === 0) {
                        console.log(`[Cron] Sincronización programada en PEAJE: Actualmente son las ${currentHour}:xx h (Hora de Perú). Fuera de tu ventana permitida (${startHour}h-${endHour}h).`);
                    }
                }
            }
        } catch (error) {
            console.error('[Cron] Error en el tick del demonio:', error);
            isSyncing = false;
        }
    }, 60 * 1000); // Tick cada 1 minuto
}
