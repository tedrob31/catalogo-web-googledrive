import fs from 'fs/promises';
import path from 'path';
import { getDriveService, DriveFile } from './drive';

// Configure image optimization
const MAX_WIDTH = 1920;
const QUALITY = 80;
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

// Ensure directory exists
async function ensureImagesDir() {
    try {
        await fs.access(IMAGES_DIR);
    } catch {
        await fs.mkdir(IMAGES_DIR, { recursive: true });
    }
}

// Check if file needs update
async function needsUpdate(localPath: string, driveModifiedTime?: string): Promise<boolean> {
    try {
        const stats = await fs.stat(localPath);
        if (!driveModifiedTime) return false; // If no modified time from Drive, assume valid if exists

        const localMtime = new Date(stats.mtime);
        const driveMtime = new Date(driveModifiedTime);

        // Drive time is usually precise, but let's allow a small buffer or just strict compare
        // Actually, if Drive is newer, update.
        return driveMtime > localMtime;
    } catch (error) {
        // File doesn't exist
        return true;
    }
}

// Optimization Profiles
type OptimizationProfile = 'catalog' | 'cover';

interface SharpOptions {
    width: number;
    height?: number;
    quality: number;
    fit?: 'cover' | 'contain' | 'inside';
    position?: string; // gravity or entropy
}

const PROFILES: Record<OptimizationProfile, SharpOptions> = {
    catalog: {
        width: 800, // Reduced from 1920 to 800 for massive size savings
        quality: 75,
        fit: 'inside', // resize({ width: 800, withoutEnlargement: true }) effectively
    },
    cover: {
        width: 400,
        height: 400,
        quality: 75,
        fit: 'cover',
        position: 'entropy' // Smart crop (focus on interesting area)
    }
};

export async function processImage(file: DriveFile, type: OptimizationProfile = 'catalog'): Promise<string | null> {
    if (!file.mimeType.startsWith('image/')) return null;

    const drive = await getDriveService();
    // Unique caching key based on Type too (so we can have cover vs catalog versions if needed)
    // But currently file.id is the key. 
    // If we use the SAME file for both (rare), we might overwrite.
    // However, Covers are from a separate folder, and Catalog photos are from album folders.
    // Overlap is technically possible if user puts same file in both, but usually they are distinct.
    // If a fallback uses a catalog photo as cover, it uses the 'catalog' version (800px), which is fine.

    // Suffix based on profile? No, keeping simple ID for now unless collision is real.
    // ValidIds track ID.
    const localFilename = `${file.id}.webp`;
    const localPath = path.join(IMAGES_DIR, localFilename);

    // incremental check
    if (!(await needsUpdate(localPath, file.imageMediaMetadata?.time || undefined))) {
        return `/images/${localFilename}`;
    }

    console.log(`[Sync] Optimizing [${type.toUpperCase()}]: ${file.name}`);

    try {
        const response = await drive.files.get(
            { fileId: file.id, alt: 'media' },
            { responseType: 'arraybuffer' }
        );

        const buffer = Buffer.from(response.data as ArrayBuffer);
        const sharp = require('sharp');
        const opts = PROFILES[type];

        let pipeline = sharp(buffer);

        // Metadata removal (Strip)
        pipeline = pipeline.rotate().withMetadata(false); // Ensure stripped

        // Resize Logic
        if (type === 'cover') {
            pipeline = pipeline.resize({
                width: opts.width,
                height: opts.height,
                fit: opts.fit,
                position: opts.position === 'entropy' ? sharp.strategy.entropy : undefined
            });
        } else {
            // Catalog: Limit width, preserve aspect ratio
            pipeline = pipeline.resize({
                width: opts.width,
                withoutEnlargement: true
            });
        }

        // Output Settings
        await pipeline
            .webp({
                quality: opts.quality,
                effort: 4, // User requested 4 (faster sync, slightly less compression than 6)
                smartSubsample: true
            })
            .toFile(localPath);

        return `/images/${localFilename}`;
    } catch (error) {
        console.error(`[Sync] Error processing ${file.name}:`, error);
        return null;
    }
}

export async function cleanOrphanedImages(validFileIds: Set<string>) {
    try {
        await ensureImagesDir();
        const files = await fs.readdir(IMAGES_DIR);

        for (const file of files) {
            if (!file.endsWith('.webp')) continue;

            const id = file.replace('.webp', '');
            if (!validFileIds.has(id)) {
                console.log(`[Sync] Deleting orphaned file: ${file}`);
                await fs.unlink(path.join(IMAGES_DIR, file));
            }
        }
    } catch (error) {
        console.error('[Sync] Error cleaning orphans:', error);
    }
}
