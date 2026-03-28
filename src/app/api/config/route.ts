import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';
import { loadCache } from '@/lib/cache';
import { findPathToAlbum } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

export async function GET() {
    const config = await getConfig();
    return NextResponse.json(config);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const oldConfig = await getConfig();
        await saveConfig(body);

        // --- Log admin modifications for Cron Status ---
        if (oldConfig.autoSyncEnabled !== body.autoSyncEnabled) {
            console.log(`\n=========================================\n[ADMIN PANEL] El administrador ha ${body.autoSyncEnabled ? 'ENCENDIDO ✅' : 'APAGADO ❌'} el motor Cron de Auto-Sincronización.\n=========================================\n`);
        }
        if (oldConfig.autoSyncInterval !== body.autoSyncInterval) {
            console.log(`[ADMIN PANEL] Intervalo de Auto-Sincronización actualizado a: ${body.autoSyncInterval} minutos`);
        }
        if (oldConfig.autoSyncStartHour !== body.autoSyncStartHour || oldConfig.autoSyncEndHour !== body.autoSyncEndHour) {
            console.log(`[ADMIN PANEL] Ventana de Auto-Sincronización actualizada: de ${body.autoSyncStartHour}:00 a ${body.autoSyncEndHour}:00 horas`);
        }

        let needsGlobalRevalidate = false;
        const affectedPaths = new Set<string>();

        // Check global visual changes
        if (
            oldConfig.backgroundImage !== body.backgroundImage ||
            oldConfig.textColor !== body.textColor ||
            oldConfig.siteTitle !== body.siteTitle ||
            oldConfig.gridColumns !== body.gridColumns
        ) {
            needsGlobalRevalidate = true;
            affectedPaths.add('/');
        }

        // Check if individual covers changed
        const cache = await loadCache();
        if (cache?.root) {
            const oldCovers = oldConfig.folderCovers || {};
            const newCovers = body.folderCovers || {};

            const allCoverIds = new Set([...Object.keys(oldCovers), ...Object.keys(newCovers)]);

            for (const folderId of allCoverIds) {
                if (oldCovers[folderId] !== newCovers[folderId]) {
                    needsGlobalRevalidate = true;
                    // Find where this cover is displayed = Parent of the folder
                    const albumPath = findPathToAlbum(cache.root, folderId);
                    if (albumPath && albumPath.length > 0) {
                        if (albumPath.length === 1) {
                            affectedPaths.add('/');
                        } else {
                            const parentPath = albumPath.slice(0, -1);
                            if (parentPath.length === 1) {
                                affectedPaths.add('/');
                            } else {
                                const pathSlugs = parentPath.slice(1).map(a => slugify(a.name));
                                affectedPaths.add('/' + pathSlugs.join('/'));
                            }
                        }
                    }
                }
            }
        }

        if (needsGlobalRevalidate) {
            // Revalidate internal Next.js cache
            revalidatePath('/', 'layout');

            // Purge Cloudflare Entirely (Handles RSC Payloads safely)
            const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
            const cfToken = process.env.CLOUDFLARE_API_TOKEN;

            if (cfZoneId && cfToken) {
                console.log(`[Config] Ejecutando Purga Global (Purge Everything) en Cloudflare para Configuración...`);
                // Fire Cloudflare request in background
                fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${cfToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ purge_everything: true })
                })
                .then(res => {
                    if (res.ok) console.log('[Config] Cloudflare Purged Everything.');
                    else res.text().then(text => console.error('[Config] Cloudflare Purge Everything Failed:', text));
                })
                .catch(err => console.error('[Config] Cloudflare Purge Exception:', err));
            }
        }

        return NextResponse.json({ success: true, purgedPaths: Array.from(affectedPaths) });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
