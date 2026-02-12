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

        // Trigger Static Build in Separate Workspace to avoid deleting .next of running server
        console.log('[Build] Starting Static Export Build (Safe Workspace)...');

        // Command to:
        // 1. Create temp workspace
        // 2. Copy source files (excluding .next and node_modules)
        // 3. Symlink node_modules (fast)
        // 4. Run Build with Export flag
        // 5. Deploy 'out' folder to shared volume
        const buildScript = `
        rm -rf /tmp/build
        mkdir -p /tmp/build
        cp -r /app/package.json /app/next.config.ts /app/tsconfig.json /app/src /app/public /tmp/build/
        
        if [ -d "/app/node_modules" ]; then
            ln -s /app/node_modules /tmp/build/node_modules
        fi
        
        cd /tmp/build
        export NEXT_PUBLIC_STATIC_EXPORT=true
        # Run build (and suppress excessive noise if needed, but logging is good)
        npm run build
        
        # Deploy
        echo "[Build] Deploying to /app/out..."
        mkdir -p /app/out
        rm -rf /app/out/*
        cp -r out/* /app/out/
        
        # Cleanup
        rm -rf /tmp/build
        echo "[Build] Cleanup complete."
        `;

        const { stdout, stderr } = await execAsync(buildScript, {
            maxBuffer: 1024 * 1024 * 50 // 50MB buffer log
        });

        console.log('[Build] Stdout:', stdout);
        if (stderr) console.error('[Build] Stderr:', stderr);

        return NextResponse.json({ success: true, message: 'Sync & Build complete' });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    const cache = await loadCache();
    return NextResponse.json(cache || {});
}
