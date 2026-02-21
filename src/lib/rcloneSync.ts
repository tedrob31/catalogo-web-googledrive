import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';
import { getConfig } from './config';
import { Album, PhotoItem, CacheStructure } from './types';
import { slugify } from './utils';

const execAsync = util.promisify(exec);

// Local paths mapping
// We use a safe folder separate from Next.js public to store raw Drive mirrors
const RAW_DIR = process.env.RAW_IMAGES_DIR || path.join(process.cwd(), 'cache', 'drive_raw');
// Final optimized images public folder
const PUBLIC_DIR = process.env.PUBLIC_IMAGES_DIR || path.join(process.cwd(), 'public', 'images');
const CACHE_FILE = path.join(process.cwd(), 'cache', 'catalog.json');

/**
 * 1. Executes Rclone to mirror Google Drive locally
 */
async function runRcloneSync(folderId: string) {
    console.log('[Rclone] Checking dependencies and configuring remote...');

    // Ensure directories exist
    await fs.mkdir(RAW_DIR, { recursive: true });
    await fs.mkdir(PUBLIC_DIR, { recursive: true });

    // The Google Service Account JSON must be mounted or passed via env 
    // Usually it's in /app/cache/credentials.json inside Docker
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'cache', 'credentials.json');
    if (!existsSync(credentialsPath)) {
        throw new Error(`[Rclone] Service account credentials not found at ${credentialsPath}`);
    }

    // Since we don't want to persist rclone.conf file on disk manually,
    // we use rclone environment variables to configure the backend on-the-fly.
    process.env.RCLONE_CONFIG_GDRIVE_TYPE = 'drive';
    process.env.RCLONE_CONFIG_GDRIVE_SCOPE = 'drive.readonly';
    process.env.RCLONE_CONFIG_GDRIVE_SERVICE_ACCOUNT_FILE = credentialsPath;

    console.log(`[Rclone] Starting Drive Mirroring for folder ID: ${folderId}`);

    // Command: rclone sync source:path destination --flags
    // We use "gdrive" as the remote name we configured via env vars above.
    const command = `rclone sync gdrive:${folderId} "${RAW_DIR}" --drive-shared-with-me --transfers=10 --checkers=10 --fast-list -v`;

    try {
        const { stdout, stderr } = await execAsync(command);
        console.log('[Rclone] Sync finished successfully.');
        if (stdout) console.log(stdout);
    } catch (error: any) {
        console.error('[Rclone] Sync failed.', error.message);
        throw error;
    }
}

/**
 * 2. Compresses new raw images using Sharp and copies them to the public directory
 * Also returns the local catalog structure
 */
async function processImagesAndBuildCatalog(): Promise<CacheStructure> {
    console.log('[Sharp] Starting image optimization and catalog build...');

    // We recreate the root album following the expected types
    const rootAlbum: Album = {
        id: 'root',
        name: 'Catálogo Candel',
        photos: [],
        subAlbums: []
    };

    // Helper function to read a directory recursively
    async function scanDirectory(currentPath: string): Promise<Album | null> {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        const folderName = path.basename(currentPath);
        if (folderName.startsWith('.')) return null;

        const album: Album = {
            id: crypto.createHash('md5').update(currentPath).digest('hex').substring(0, 10),
            name: folderName,
            photos: [],
            subAlbums: []
        };

        let mediaCount = 0;

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            const relativeRawToPublic = path.relative(RAW_DIR, fullPath);
            const targetPublicPath = path.join(PUBLIC_DIR, relativeRawToPublic);

            if (entry.isDirectory()) {
                const subAlbum = await scanDirectory(fullPath);
                if (subAlbum && (subAlbum.photos.length > 0 || subAlbum.subAlbums.length > 0)) {
                    album.subAlbums.push(subAlbum);
                }
            } else if (entry.isFile() && /\.(jpg|jpeg|png|webp|heic)$/i.test(entry.name)) {

                const targetDir = path.dirname(targetPublicPath);
                await fs.mkdir(targetDir, { recursive: true });

                const parsedObj = path.parse(targetPublicPath);
                const finalWebpPath = path.join(targetDir, `${parsedObj.name}.webp`);

                // CDN path
                const relativeUrlPath = `/images/${relativeRawToPublic.replace(/\\\\/g, '/')}`;
                const finalUrlPath = relativeUrlPath.replace(/\.[^/.]+$/, ".webp");

                let metadata;
                if (!existsSync(finalWebpPath)) {
                    console.log(`[Sharp] Compressing new image: ${entry.name}`);
                    const info = await sharp(fullPath)
                        .resize({ width: 1920, withoutEnlargement: true })
                        .webp({ quality: 80 })
                        .toFile(finalWebpPath);

                    metadata = { width: info.width, height: info.height };
                } else {
                    metadata = await sharp(finalWebpPath).metadata();
                }

                // Append PhotoItem matching types.ts
                album.photos.push({
                    id: crypto.createHash('md5').update(fullPath).digest('hex').substring(0, 10),
                    name: entry.name.replace(/\.[^/.]+$/, ""),
                    thumbnailLink: finalUrlPath,
                    fullLink: finalUrlPath,
                    width: metadata.width || 800,
                    height: metadata.height || 600,
                    createdTime: (await fs.stat(fullPath)).mtime.toISOString()
                });

                mediaCount++;
            }
        }

        // Descending sort for photos (Z-A as user requested in previous sprint), Ascending (A-Z) for albums
        album.photos.sort((a, b) => b.name.localeCompare(a.name));
        album.subAlbums.sort((a, b) => a.name.localeCompare(b.name));

        if (album.photos.length > 0) {
            album.coverId = album.photos[0].id;
        } else if (album.subAlbums.length > 0) {
            album.coverId = album.subAlbums[0].coverId;
        }

        return album;
    }

    // Read top level raw directory
    const rootEntries = await fs.readdir(RAW_DIR, { withFileTypes: true });
    for (const entry of rootEntries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const sub = await scanDirectory(path.join(RAW_DIR, entry.name));
            if (sub && (sub.photos.length > 0 || sub.subAlbums.length > 0)) {
                rootAlbum.subAlbums.push(sub);
            }
        }
    }

    rootAlbum.subAlbums.sort((a, b) => a.name.localeCompare(b.name));
    console.log('[Sharp] Catalog built successfully.');

    return {
        root: rootAlbum,
        lastSynced: new Date().toISOString()
    };
}

/**
 * 3. Saves the catalog and clears Next.js Cache
 */
async function saveCatalog(cache: CacheStructure) {
    console.log('[Catalog] Saving to disk...');
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Main Orchestrator
 */
export async function executeLocalSync() {
    const config = await getConfig();
    if (!config.rootFolderId) {
        throw new Error("No rootFolderId configured in config.json");
    }

    try {
        await runRcloneSync(config.rootFolderId);
        const cacheData = await processImagesAndBuildCatalog();
        await saveCatalog(cacheData);

        console.log('[Sync] Complete. Next.js Revalidation should be triggered next.');
        return cacheData;
    } catch (error) {
        console.error('[Sync] Local synchronization failed.', error);
        throw error;
    }
}
