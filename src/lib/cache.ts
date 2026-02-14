import fs from 'fs/promises';
import path from 'path';
import { listFolderContents, DriveFile } from './drive';
import { CacheStructure, Album, PhotoItem } from './types';

export * from './types';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'structure.json');

export async function ensureCacheDir() {
    try {
        await fs.access(CACHE_DIR);
    } catch {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    }
}

import { getConfig, AppConfig, saveConfig } from './config';

const LOCK_FILE = path.join(CACHE_DIR, 'sync.lock');

// Check if lock is stale (older than 30 mins)
async function isLockStale(): Promise<boolean> {
    try {
        const stats = await fs.stat(LOCK_FILE);
        const now = Date.now();
        const mtime = new Date(stats.mtime).getTime();
        return (now - mtime) > (30 * 60 * 1000);
    } catch {
        return false;
    }
}

export async function loadCache(): Promise<CacheStructure | null> {
    try {
        await ensureCacheDir();
        const dataStr = await fs.readFile(CACHE_FILE, 'utf-8');
        const data: CacheStructure = JSON.parse(dataStr);

        // Auto-Sync Logic (Stale-While-Revalidate)
        if (data.lastSynced && data.root) {
            const config = await getConfig();
            if (config.autoSyncInterval && config.autoSyncInterval > 0) {
                const lastSyncTime = new Date(data.lastSynced).getTime();
                const now = Date.now();
                const diffMinutes = (now - lastSyncTime) / (1000 * 60);

                if (diffMinutes > config.autoSyncInterval) {

                    // Check Lock
                    let locked = false;
                    try {
                        await fs.access(LOCK_FILE);
                        locked = true;

                        // Force break lock if stale
                        if (await isLockStale()) {
                            console.log('[Cache] Sync Lock is stale. Breaking lock.');
                            await fs.unlink(LOCK_FILE);
                            locked = false;
                        }
                    } catch {
                        locked = false;
                    }

                    if (!locked) {
                        console.log(`[Cache] Data is stale (${Math.round(diffMinutes)} mins). Acquiring Lock & Syncing...`);

                        // Create Lock
                        try {
                            await fs.writeFile(LOCK_FILE, new Date().toISOString());

                            // Run sync without awaiting
                            syncDrive(config.rootFolderId, config.siteTitle || 'CATALOGO')
                                .then(async () => {
                                    console.log('[Cache] Background sync completed.');
                                })
                                .catch(err => {
                                    console.error('[Cache] Background sync failed:', err);
                                })
                                .finally(async () => {
                                    // Release Lock
                                    try { await fs.unlink(LOCK_FILE); } catch { }
                                });

                        } catch (err) {
                            console.log('[Cache] Failed to acquire lock (race condition). Skipping.');
                        }
                    } else {
                        // console.log('[Cache] Sync already in progress (Locked). Skipping.');
                    }
                }
            }
        }

        return data;
    } catch (error) {
        return null;
    }
}

export async function saveCache(data: CacheStructure) {
    await ensureCacheDir();
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
            let thumb = item.thumbnailLink;
            let full = item.thumbnailLink;

            if (thumb) {
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
                createdTime: item.imageMediaMetadata?.time
            });
        }
    }

    // Process subfolders recursively
    for (const folder of subFolders) {
        const subAlbum = await buildAlbumStructure(folder.id, folder.name);
        album.subAlbums.push(subAlbum);
    }

    // Sort photos DESCENDING by name (Newest first if named sequentially)
    album.photos.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));

    // Sort sub-albums ASCENDING by name (A-Z)
    album.subAlbums.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return album;
}

import { processImage, cleanOrphanedImages } from './sync-engine';

async function processAllImages(album: Album, validIds: Set<string>) {
    // Process photos in this album
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
                mimeType: 'image/jpeg',
                imageMediaMetadata: {
                    time: photo.createdTime
                }
            };

            const localUrl = await processImage(driveFile, 'catalog');
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

    // 0. Load Config to check for Covers Folder
    let config = await getConfig();

    // 1. Build Structure from Drive
    const rootAlbum = await buildAlbumStructure(rootFolderId, rootFolderName);

    // 2. Sync Images (Download & Optimize)
    const validIds = new Set<string>();
    console.log('[Sync] Starting Image Mirror process...');

    // 2a. Sync Catalog Images
    await processAllImages(rootAlbum, validIds);

    // 2b. Sync Covers Folder (if configured)
    if (config.coversFolderId) {
        console.log(`[Sync] Syncing Covers Folder: ${config.coversFolderId}`);
        try {
            const coverFiles = await listFolderContents(config.coversFolderId);
            const CONCURRENCY = 5;
            for (let i = 0; i < coverFiles.length; i += CONCURRENCY) {
                const chunk = coverFiles.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(async (file) => {
                    if (file.mimeType.startsWith('image/')) {
                        validIds.add(file.id);
                        await processImage(file, 'cover');
                    }
                }));
            }
        } catch (err) {
            console.error('[Sync] Error syncing covers folder:', err);
        }
    }

    console.log(`[Sync] Image Mirror complete. Valid images: ${validIds.size}`);

    // 3. Clean Orphans
    await cleanOrphanedImages(validIds);

    // 4. Update Config URLs to point to Local Mirror
    // Helper to migrate URL (e.g. /api/image?id=XXX -> /images/XXX.webp)
    const migrateUrl = (url?: string) => {
        if (!url) return undefined;
        const match = url.match(/[?&]id=([^&]+)/);
        if (match) {
            const id = match[1];
            if (validIds.has(id)) {
                return `/images/${id}.webp`;
            }
        }
        return url;
    };

    let configChanged = false;

    // Migrate folder covers
    if (config.folderCovers) {
        for (const [key, val] of Object.entries(config.folderCovers)) {
            const newUrl = migrateUrl(val);
            if (newUrl && newUrl !== val) {
                config.folderCovers[key] = newUrl;
                configChanged = true;
            }
        }
    }

    // Migrate single fields
    const fieldsToMigrate: (keyof AppConfig)[] = ['backgroundImage', 'favicon', 'ogImage', 'seasonalCustomIcon'];
    fieldsToMigrate.forEach(field => {
        const val = config[field] as string | undefined;
        const newUrl = migrateUrl(val);
        if (newUrl && newUrl !== val) {
            (config as any)[field] = newUrl;
            configChanged = true;
        }
    });

    if (configChanged) {
        console.log('[Sync] Updating configuration with local image paths...');
        await saveConfig(config);
    }

    const cache: CacheStructure = {
        root: rootAlbum,
        lastSynced: new Date().toISOString(),
    };

    await saveCache(cache);
    console.log('Sync complete.');
    return cache;
}
