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

            // Purge Cloudflare
            const paths = Array.from(affectedPaths);
            if (paths.length > 0) {
                const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
                const cfToken = process.env.CLOUDFLARE_API_TOKEN;

                if (cfZoneId && cfToken) {
                    const domain = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'localhost';
                    const protocol = domain.includes('localhost') ? 'http://' : 'https://';

                    const urlsToPurge = paths.flatMap(p => {
                        const base = `${protocol}${domain}`;
                        if (p === '/') return [`${base}/`];
                        return [`${base}${p}`, `${base}${p}/`];
                    });

                    // Fire Cloudflare request in background
                    fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${cfToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ files: urlsToPurge.slice(0, 30) })
                    }).catch(err => console.error('CF Purge Error from config:', err));
                }
            }
        }

        return NextResponse.json({ success: true, purgedPaths: Array.from(affectedPaths) });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
