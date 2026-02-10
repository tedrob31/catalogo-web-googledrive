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

export async function processImage(file: DriveFile): Promise<string | null> {
    if (!file.mimeType.startsWith('image/')) return null;

    const drive = await getDriveService();
    const localFilename = `${file.id}.webp`; // Always WebP
    const localPath = path.join(IMAGES_DIR, localFilename);

    // incremental check
    if (!(await needsUpdate(localPath, file.imageMediaMetadata?.time || undefined))) {
        // console.log(`[Sync] Skipping ${file.name} (Up to date)`);
        return `/images/${localFilename}`;
    }

    console.log(`[Sync] Downloading & Optimizing: ${file.name}`);

    try {
        // Download stream
        const response = await drive.files.get(
            { fileId: file.id, alt: 'media' },
            { responseType: 'arraybuffer' }
        );

        const buffer = Buffer.from(response.data as ArrayBuffer);
        const sharp = require('sharp');

        // Optimize
        await sharp(buffer)
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toFile(localPath);

        // Set mtime to match Drive if possible? 
        // Or just let it be now. If we sync again, localMtime will be > driveMtime usually?
        // Wait, if we just wrote it, localMtime is NOW. DriveMtime is OLD.
        // So driveMtime > localMtime will be FALSE. Correct.
        // So next check will return false (no update needed). Perfect.

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
