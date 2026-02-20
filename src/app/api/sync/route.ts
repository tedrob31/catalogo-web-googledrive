import { NextResponse } from 'next/server';
import { syncDrive, loadCache } from '@/lib/cache';
import { getConfig } from '@/lib/config';

import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST() {
    try {
        const config = await getConfig();
        if (!config.rootFolderId) {
            return NextResponse.json({ error: 'Root Folder ID not configured' }, { status: 400 });
        }

        console.log('[Sync] Starting Drive Sync...');
        await syncDrive(config.rootFolderId);
        console.log('[Sync] Drive Sync complete.');

        // On-Demand ISR: Invalidate Next.js Cache
        console.log('[Sync] Revalidating Next.js Cache (ISR)...');
        const { revalidatePath } = await import('next/cache');
        // We purge the entire layout to ensure all components (header, grids, etc) re-read the fresh JSON
        revalidatePath('/', 'layout');
        console.log('[Sync] Next.js Cache Revalidated.');

        // CLOUDFLARE CACHE PURGE (Optional)
        // Since we are moving to ISR, we can still purge everything for safety, 
        // or we can purge specific URLs. For now, we keep it simple until we need granular tags.
        const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
        const cfToken = process.env.CLOUDFLARE_API_TOKEN;

        if (cfZoneId && cfToken) {
            console.log('[Sync] Cloudflare credentials found. Purging cache...');
            try {
                // Determine if we purge everything or specific domains based on config
                const payload = { purge_everything: true }; // Start robustly with everything

                const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${cfToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (cfResponse.ok) {
                    console.log('[Sync] Cloudflare Cache Purged Successfully.');
                } else {
                    const cfError = await cfResponse.text();
                    console.error('[Sync] Cloudflare Purge Failed:', cfError);
                }
            } catch (cfErr) {
                console.error('[Sync] Cloudflare Purge Exception:', cfErr);
            }
        } else {
            console.log('[Sync] No Cloudflare credentials configured. Skipping cache purge.');
        }

        return NextResponse.json({ success: true, message: 'Sync & ISR Revalidation complete' });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    const cache = await loadCache();
    return NextResponse.json(cache || {});
}
