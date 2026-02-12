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
        // 2. Copy source files
        // 3. COPY node_modules (Avoid symlink issues with Turbopack/Docker volumes)
        // 4. Run Build with Export flag (Standard build, no turbo)
        // 5. Deploy 'out' folder only if successful
        const buildScript = `
        set -e # Exit immediately if a command exits with a non-zero status.
        
        echo "[Build] Cleaning previous temp build..."
        rm -rf /tmp/build
        mkdir -p /tmp/build
        
        echo "[Build] Copying source files..."
        # Copy core files. 
        cp -r /app/package.json /app/next.config.ts /app/tsconfig.json /app/src /app/public /tmp/build/

        # CRITICAL: Explicitly copy postcss.config.mjs. 
        # If this is missing, Tailwind will NOT generate CSS, causing broken UI.
        if [ -f "/app/postcss.config.mjs" ]; then
            cp /app/postcss.config.mjs /tmp/build/
        else
            echo "[Build] WARNING: postcss.config.mjs not found! CSS may break."
        fi
        
        # Debug: List workspace to confirm config presence
        echo "[Build] Workspace Configs:"
        ls -la /tmp/build/*.mjs /tmp/build/*.ts || echo "No config files found"

        echo "[Build] Exclusion Strategy: Removing API routes strictly for Static Export..."
        rm -rf /tmp/build/src/app/api
        
        echo "[Build] Copying node_modules (Slow but safe)..."
        # We use copy instead of symlink to avoid resolution issues in some environments
        cp -r /app/node_modules /tmp/build/node_modules
        
        echo "[Build] Copying Cache (Essential for generateStaticParams)..."
        mkdir -p /tmp/build/cache
        cp -r /app/cache/* /tmp/build/cache/ || echo "[Build] Warning: Cache is empty, creating dummy structure so build passes."
        
        cd /tmp/build
        export NEXT_PUBLIC_STATIC_EXPORT=true
        # Set Asset Prefix to separate Static assets from Backend assets
        export NEXT_PUBLIC_ASSET_PREFIX=/static-content
        
        echo "[Build] Running 'next build'..."
        # Explicitly run next build to avoid dev-mode attributes
        npx next build
        
        # Deploy
        echo "[Build] Deploying to /app/out..."
        # Ensure target directory exists
        mkdir -p /app/out
        
        # Wipe content (Root user allows this now)
        rm -rf /app/out/*
        
        # Copy new content
        cp -r out/* /app/out/

        # Rearrange assets to match Asset Prefix
        echo "[Build] Moving _next to static-content/_next..."
        mkdir -p /app/out/static-content
        mv /app/out/_next /app/out/static-content/
        
        # Cleanup
        rm -rf /tmp/build
        echo "[Build] SUCCESS - Deployment complete."
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
