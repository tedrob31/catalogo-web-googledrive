export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Importación dinámica para prevenir errores en Edge Rutime
        const { startSyncDaemon } = await import('./lib/cron');
        startSyncDaemon();
    }
}
