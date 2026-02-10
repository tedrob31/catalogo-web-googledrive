import fs from 'fs/promises';
import path from 'path';
import { listFolderContents, DriveFile } from './drive';
import { CacheStructure, Album, PhotoItem } from './types';

export * from './types'; // Re-export for convenience if needed, or update consumers

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'structure.json');

export async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
}

import { getConfig } from './config';

// Global flag to prevent concurrent background syncs
let isSyncing = false;

export async function loadCache(): Promise<CacheStructure | null> {
    try {
        await ensureCacheDir();
        const dataStr = await fs.readFile(CACHE_FILE, 'utf-8');
        const data: CacheStructure = JSON.parse(dataStr);

        // Auto-Sync Logic (Stale-While-Revalidate)
        if (!isSyncing && data.lastSynced && data.root) {
            const config = await getConfig();
            if (config.autoSyncInterval && config.autoSyncInterval > 0) {
                const lastSyncTime = new Date(data.lastSynced).getTime();
                const now = Date.now();
                const diffMinutes = (now - lastSyncTime) / (1000 * 60);

                if (diffMinutes > config.autoSyncInterval) {
                    // Trigger background sync
                    console.log(`[Cache] Data is stale (${Math.round(diffMinutes)} mins). Triggering background sync...`);
                    isSyncing = true;

                    // Run sync without awaiting
                    syncDrive(config.rootFolderId, config.siteTitle || 'CATALOGO')
                        .then(() => {
                            console.log('[Cache] Background sync completed.');
                        })
                        .catch(err => {
                            console.error('[Cache] Background sync failed:', err);
                        })
                        .finally(() => {
                            isSyncing = false;
                        });
                }
            }
        }

        return data;
    } catch (error) {
        // Return null if cache doesn't exist or is invalid
        return null;
    }
}

export async function saveCache(data: CacheStructure) {
    await ensureCacheDir();
    // Atomic write via temporary file often better, but direct write is OK for now if we ensure simple locking or just overwrite
    await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Recursive function to build the album structure
async function buildAlbumStructure(folderId: string, folderName: string): Promise<Album> {
    const items = await listFolderContents(folderId);

    const album: Album = {
        id: folderId,
        name: folderName,
        photos: [],
        subAlbums: [],
    };

    const subFolders: DriveFile[] = [];

    for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
            subFolders.push(item);
        } else if (item.mimeType.startsWith('image/')) {
            // Construct photo object
            // Use googleusercontent.com optimized links logic here if possible, 
            // but API v3 usually gives 'thumbnailLink' which can be resized by changing the analytics params
            // The user requested: =s400 for thumb, =s1600 for full

            let thumb = item.thumbnailLink;
            let full = item.thumbnailLink;

            if (thumb) {
                // thumbnailLink typically looks like: https://lh3.googleusercontent.com/drive-viewer/...=s220
                // We replace =s... with our desired sizes
                // NOTE: The 'thumbnailLink' from Drive API v3 might be short-lived or specific. 
                // However, for public/service account access, it often works. 
                // Use proxy for both to avoid 429 errors from public Google links
                // Next.js Image Optimization will resize the 'thumb' version for the grid
                const proxyUrl = `/api/image?id=${item.id}`;
                thumb = proxyUrl;
                full = proxyUrl;
            }

            album.photos.push({
                id: item.id,
                name: item.name,
                thumbnailLink: thumb,
                fullLink: full,
                width: item.imageMediaMetadata?.width,
                height: item.imageMediaMetadata?.height,
                createdTime: item.imageMediaMetadata?.time // Might need different field
            });
        }
    }

    // Process subfolders recursively
    // Warning: heavy recursion. 
    for (const folder of subFolders) {
        const subAlbum = await buildAlbumStructure(folder.id, folder.name);
        album.subAlbums.push(subAlbum);
    }

    // Sort photos and albums by name
    album.photos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    album.subAlbums.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return album;
}


import { processImage, cleanOrphanedImages } from './sync-engine';

async function processAllImages(album: Album, validIds: Set<string>) {
    // Process photos in this album
    // We process sequentially or with limit to avoid flooding network/cpu
    const CONCURRENCY = 5;
    const photos = album.photos;

    for (let i = 0; i < photos.length; i += CONCURRENCY) {
        const chunk = photos.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(async (photo) => {
            validIds.add(photo.id);
            // Construct pseudo DriveFile for processImage
            const driveFile: any = {
                id: photo.id,
                name: photo.name,
                mimeType: 'image/jpeg', // Assumption, filtered earlier
                imageMediaMetadata: {
                    time: photo.createdTime // Mapping back
                }
            };

            const localUrl = await processImage(driveFile);
            if (localUrl) {
                photo.thumbnailLink = localUrl;
                photo.fullLink = localUrl;
            }
        }));
    }

    // Recurse
    for (const sub of album.subAlbums) {
        await processAllImages(sub, validIds);
    }
}

export async function syncDrive(rootFolderId: string, rootFolderName: string = 'CATALOGO') {
    console.log(`Starting sync for root: ${rootFolderId}`);

    // 1. Build Structure from Drive
    const rootAlbum = await buildAlbumStructure(rootFolderId, rootFolderName);

    // 2. Sync Images (Download & Optimize)
    const validIds = new Set<string>();
    console.log('[Sync] Starting Image Mirror process...');
    await processAllImages(rootAlbum, validIds);
    console.log(`[Sync] Image Mirror complete. Valid images: ${validIds.size}`);

    // 3. Clean Orphans
    await cleanOrphanedImages(validIds);

    const cache: CacheStructure = {
        root: rootAlbum,
        lastSynced: new Date().toISOString(),
    };

    await saveCache(cache);
    console.log('Sync complete.');
    return cache;
}
