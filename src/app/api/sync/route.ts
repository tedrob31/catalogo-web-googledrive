import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { syncDrive, loadCache } from '@/lib/cache';
import { getConfig } from '@/lib/config';

export async function POST() {
    try {
        const config = await getConfig();
        if (!config.rootFolderId) {
            return NextResponse.json({ error: 'Root Folder ID not configured' }, { status: 400 });
        }

        console.log('[Sync] Starting Drive Sync...');
        const { cache, affectedPaths } = await syncDrive(config.rootFolderId);
        console.log(`[Sync] Drive Sync complete. ${affectedPaths.length} paths changed.`);

        // ISR REVALIDATION: Clear Next.js internal cache for affected paths
        if (affectedPaths.length > 0) {
            console.log(`[ISR] Revalidating ${affectedPaths.length} paths...`);
            for (const path of affectedPaths) {
                // Revalidate the specific path (page)
                revalidatePath(path);
            }
            // Always revalidate root layout to clear the entire Next.js internal Data/Full-Route cache
            // This ensures fs.readFile picks up the new structure.json on next render.
            // Cloudflare is still targeted below, so users won't feel a global slowdown.
            revalidatePath('/', 'layout');
        }

        // CLOUDFLARE CACHE PURGE (Purge Everything)
        // La purga selectiva por URL falla porque NextJS inyecta queries dinámicas (?_rsc=xxx) al navegar
        const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
        const cfToken = process.env.CLOUDFLARE_API_TOKEN;

        if (cfZoneId && cfToken && affectedPaths.length > 0 && process.env.NEXT_PUBLIC_DOMAIN_NAME) {
            console.log(`[Sync] Ejecutando Purga Global por Hostname en Cloudflare para aislar la limpieza de caché de App Router (_rsc)...`);
            try {
                const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${cfToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ hosts: [process.env.NEXT_PUBLIC_DOMAIN_NAME] })
                });

                if (cfResponse.ok) {
                    console.log(`[Sync] Cloudflare Purged Hostname: ${process.env.NEXT_PUBLIC_DOMAIN_NAME}`);
                } else {
                    const cfError = await cfResponse.text();
                    console.error(`[Sync] Cloudflare Purge Everything Failed:`, cfError);
                }
            } catch (cfErr) {
                console.error('[Sync] Cloudflare Purge Exception:', cfErr);
            }
        } else if (affectedPaths.length === 0) {
            console.log('[Sync] No paths affected, skipping Cloudflare purge.');
        } else {
            console.log('[Sync] No Cloudflare credentials configured. Skipping cache purge.');
        }

        return NextResponse.json({ success: true, message: `Sync complete. ${affectedPaths.length} paths updated.` });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    const cache = await loadCache();
    return NextResponse.json(cache || {});
}
