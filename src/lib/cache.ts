import fs from 'fs/promises';
import path from 'path';
import { listFolderContents, DriveFile } from './drive';
import { CacheStructure, Album, PhotoItem } from './types';
import { slugify } from './utils';

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
            if (config.autoSyncEnabled !== false && config.autoSyncInterval && config.autoSyncInterval > 0) {
                const lastSyncTime = new Date(data.lastSynced).getTime();
                const now = Date.now();
                const diffMinutes = (now - lastSyncTime) / (1000 * 60);

                // Add verbose log to debug why it's silent
                console.log(`[Cache] Checking auto-sync. Diff: ${diffMinutes.toFixed(2)} mins, Interval = ${config.autoSyncInterval} mins.`);

                if (diffMinutes >= config.autoSyncInterval) {
                    const startHour = config.autoSyncStartHour ?? 0;
                    const endHour = config.autoSyncEndHour ?? 23;
                    const currentHour = new Date().getHours();

                    let isWithinWindow = false;
                    if (startHour <= endHour) {
                        isWithinWindow = currentHour >= startHour && currentHour <= endHour;
                    } else {
                        // Handles overnight windows (e.g. 22:00 to 06:00)
                        isWithinWindow = currentHour >= startHour || currentHour <= endHour;
                    }

                    if (isWithinWindow) {
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
                createdTime: item.imageMediaMetadata?.time,
                modifiedTime: item.modifiedTime,
                md5Checksum: item.md5Checksum
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

async function processAllImages(album: Album, validIds: Map<string, string>) {
    // Process photos in this album
    const CONCURRENCY = 5;
    const photos = album.photos;

    for (let i = 0; i < photos.length; i += CONCURRENCY) {
        const chunk = photos.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(async (photo) => {
            validIds.set(photo.id, photo.modifiedTime || '');
            // Construct pseudo DriveFile for processImage
            const driveFile: any = {
                id: photo.id,
                name: photo.name,
                mimeType: 'image/jpeg',
                modifiedTime: photo.modifiedTime,
                md5Checksum: photo.md5Checksum,
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

    // Read old cache to compute ISR diff later
    let oldCache: CacheStructure | null = null;
    try {
        const oldCacheStr = await fs.readFile(CACHE_FILE, 'utf-8');
        oldCache = JSON.parse(oldCacheStr);
    } catch (e) {
        // No old cache or parse error
    }

    // 0. Load Config to check for Covers Folder
    let config = await getConfig();

    // 1. Build Structure from Drive
    const rootAlbum = await buildAlbumStructure(rootFolderId, rootFolderName);

    // 2. Sync Images (Download & Optimize)
    const validIds = new Map<string, string>();
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
                        validIds.set(file.id, file.modifiedTime || '');
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
    await cleanOrphanedImages(new Set(validIds.keys()));

    // 4. Update Config URLs to point to Local Mirror
    // Helper to migrate URL (e.g. /api/image?id=XXX -> /images/XXX.webp)
    const migrateUrl = (url?: string) => {
        if (!url) return undefined;
        const match = url.match(/[?&]id=([^&]+)/);
        if (match) {
            const id = match[1];
            if (validIds.has(id)) {
                const mTime = validIds.get(id);
                const vParam = mTime ? `?v=${new Date(mTime).getTime()}` : '';
                return `/images/${id}.webp${vParam}`;
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

    const affectedPaths = computeAffectedPaths(oldCache?.root, rootAlbum);
    console.log(`[Sync Diff] Detected ${affectedPaths.length} affected paths.`);

    await saveCache(cache);
    console.log('Sync complete.');
    return { cache, affectedPaths };
}

// ISR Helper: Compute Diff to know what URLs changed
export function computeAffectedPaths(oldRoot: Album | undefined, newRoot: Album): string[] {
    const affected = new Set<string>();

    // helper to extract state
    function getAlbumState(album: Album) {
        return {
            name: album.name,
            coverId: album.coverId,
            photos: album.photos.map(p => `${p.id}:${p.modifiedTime || ''}`).join(','),
            subCount: album.subAlbums.length
        };
    }

    function compare(oldA: Album | undefined, newA: Album | undefined, currentPath: string) {
        if (!oldA && !newA) return;

        if (!oldA && newA) {
            affected.add(currentPath);
            newA.subAlbums.forEach(sub => compare(undefined, sub, currentPath === '/' ? `/${slugify(sub.name)}` : `${currentPath}/${slugify(sub.name)}`));
            return;
        }

        if (oldA && !newA) {
            affected.add(currentPath);
            oldA.subAlbums.forEach(sub => compare(sub, undefined, currentPath === '/' ? `/${slugify(sub.name)}` : `${currentPath}/${slugify(sub.name)}`));
            return;
        }

        const stateOld = getAlbumState(oldA!);
        const stateNew = getAlbumState(newA!);

        if (JSON.stringify(stateOld) !== JSON.stringify(stateNew)) {
            affected.add(currentPath);
        }

        const oldSubs = new Map(oldA!.subAlbums.map(sub => [sub.id, sub]));
        const newSubs = new Map(newA!.subAlbums.map(sub => [sub.id, sub]));

        for (const [id, sub] of newSubs) {
            const nextPath = currentPath === '/' ? `/${slugify(sub.name)}` : `${currentPath}/${slugify(sub.name)}`;
            compare(oldSubs.get(id), sub, nextPath);
        }

        for (const [id, sub] of oldSubs) {
            if (!newSubs.has(id)) {
                const nextPath = currentPath === '/' ? `/${slugify(sub.name)}` : `${currentPath}/${slugify(sub.name)}`;
                compare(sub, undefined, nextPath);
            }
        }
    }

    compare(oldRoot, newRoot, '/');
    return Array.from(affected);
}
