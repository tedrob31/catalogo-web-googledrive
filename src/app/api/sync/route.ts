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
            // Always revalidate root to be safe if menu/config changes
            revalidatePath('/');
        }

        // CLOUDFLARE CACHE PURGE (Targeted)
        const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
        const cfToken = process.env.CLOUDFLARE_API_TOKEN;

        if (cfZoneId && cfToken && affectedPaths.length > 0) {
            const domain = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'localhost';
            const protocol = domain.includes('localhost') ? 'http://' : 'https://';

            // Convert relative paths to full URLs for Cloudflare
            const urlsToPurge = affectedPaths.map(p => `${protocol}${domain}${p}`);

            // Cloudflare Free Plan limits 'files' array to 30 items per API call.
            const BATCH_SIZE = 30;
            console.log(`[Sync] Cloudflare credentials found. Purging ${urlsToPurge.length} precise URLs in batches of ${BATCH_SIZE}...`);

            for (let i = 0; i < urlsToPurge.length; i += BATCH_SIZE) {
                const batch = urlsToPurge.slice(i, i + BATCH_SIZE);
                try {
                    const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${cfToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ files: batch })
                    });

                    if (cfResponse.ok) {
                        console.log(`[Sync] Cloudflare Batch Purged: ${batch.length} URLs.`);
                    } else {
                        const cfError = await cfResponse.text();
                        console.error(`[Sync] Cloudflare Purge Batch Failed:`, cfError);
                    }
                } catch (cfErr) {
                    console.error('[Sync] Cloudflare Purge Exception:', cfErr);
                }
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
