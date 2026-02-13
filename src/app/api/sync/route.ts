import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
import { syncDrive } from '@/lib/cache';
import { getConfig } from '@/lib/config';
import { getSystemStatus, updateSyncStatus } from '@/lib/status';

const execAsync = util.promisify(exec);

// Main Async Task
async function runBackgroundSync() {
    try {
        await updateSyncStatus('SYNCING', 'Starting Drive Scan and Image Optimization...');

        // 1. Load config
        const config = await getConfig();
        if (!config.rootFolderId) {
            throw new Error('No Root Folder ID configured');
        }

        // 2. Scan & Download (This updates cache.json and optimizations)
        await syncDrive(config.rootFolderId);
        await updateSyncStatus('BUILDING', 'Drive Scan complete. Starting Static Build...');

        // 3. Build & Deploy Logic (Moved from shell script to here for better control/logging)
        // Cleanup temp
        await updateSyncStatus('BUILDING', 'Cleaning temporary workspace...');
        await execAsync('rm -rf /tmp/build && mkdir -p /tmp/build');

        await updateSyncStatus('BUILDING', 'Copying source files...');
        await execAsync('cp -r /app/package.json /app/next.config.ts /app/tsconfig.json /app/src /app/public /tmp/build/');

        await updateSyncStatus('BUILDING', 'Copying node_modules & CSS config...');
        await execAsync('cp -r /app/node_modules /tmp/build/node_modules');

        // Fix: Explicitly copy postcss config if exists
        try {
            await execAsync('cp /app/postcss.config.mjs /tmp/build/');
        } catch {
            await updateSyncStatus('BUILDING', 'No postcss.config.mjs found (skip).');
        }

        // Fix: Remove API Routes
        await updateSyncStatus('BUILDING', 'Excluding API routes for Static Export...');
        await execAsync('rm -rf /tmp/build/src/app/api');

        // Fix: Copy Cache
        await updateSyncStatus('BUILDING', 'Copying Cache data...');
        await execAsync('mkdir -p /tmp/build/cache');
        // We copy contents of /app/cache to /tmp/build/cache. 
        // Note: fs.cp might be safer but exec is fine here.
        await execAsync('cp -r /app/cache/* /tmp/build/cache/ || echo "Cache empty"');

        // 4. Run Next Build
        await updateSyncStatus('BUILDING', 'Running Next.js Build (This takes time)...');

        const buildCmd = `
            cd /tmp/build && 
            export NEXT_PUBLIC_STATIC_EXPORT=true && 
            export NEXT_PUBLIC_ASSET_PREFIX=/static-content && 
            npx next build
        `;

        // We use execAsync which captures stdout/stderr
        const { stdout, stderr } = await execAsync(buildCmd, { maxBuffer: 1024 * 1024 * 50 });
        console.log('[Build Log]', stdout);

        await updateSyncStatus('DEPLOYING', 'Build successful. Deploying new files...');

        // 5. Deploy
        await execAsync('mkdir -p /app/out');
        await execAsync('rm -rf /app/out/*');
        await execAsync('cp -r /tmp/build/out/* /app/out/');

        // Move assets
        await execAsync('mkdir -p /app/out/static-content');
        await execAsync('mv /app/out/_next /app/out/static-content/');

        // Cleanup
        await execAsync('rm -rf /tmp/build');

        // 6. Cloudflare Purge
        const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
        const cfToken = process.env.CLOUDFLARE_API_TOKEN;

        if (cfZoneId && cfToken) {
            await updateSyncStatus('DEPLOYING', 'Purging Cloudflare Cache...');
            try {
                const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ purge_everything: true })
                });
                if (cfResponse.ok) await updateSyncStatus('DEPLOYING', 'Cloudflare Cache Purged.');
                else {
                    const err = await cfResponse.text();
                    await updateSyncStatus('DEPLOYING', `Cloudflare Purge Warning: ${err.substring(0, 50)}...`);
                }
            } catch (e) {
                await updateSyncStatus('DEPLOYING', 'Cloudflare Purge Error.');
            }
        }

        await updateSyncStatus('SUCCESS', 'Deployment Complete!');

    } catch (error: any) {
        console.error('Sync Job Failed:', error);
        await updateSyncStatus('ERROR', `Failed: ${error.message || error}`);
    }
}

export async function GET() {
    // Return cache.json (Legacy behavior specific to AdminDashboard.fetchCache)
    // But AdminDashboard also uses valid GET /api/sync to get the cache.
    // For Status, we should use a different endpoint or modify this?
    // User code: fetch('/api/sync', { method: 'GET' }) -> setCache(await res.json())
    // So GET MUST return the Cache Structure.
    // We will create a NEW endpoint /api/status for status polling.

    try {
        const cache = await import('@/lib/cache').then(m => m.loadCache());
        return NextResponse.json(cache);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to load cache' }, { status: 500 });
    }
}

export async function POST() {
    // 1. Check if already running
    const status = await getSystemStatus();
    if (status.syncState === 'SYNCING' || status.syncState === 'BUILDING' || status.syncState === 'DEPLOYING') {
        return NextResponse.json({ success: false, message: 'Sync already in progress' }, { status: 409 });
    }

    // 2. Start Background Job
    console.log('[API] Triggering Background Sync...');

    // We do NOT await this. It runs in background.
    runBackgroundSync();

    // 3. Return accepted
    return NextResponse.json({ success: true, message: 'Sync process started in background' }, { status: 202 });
}
