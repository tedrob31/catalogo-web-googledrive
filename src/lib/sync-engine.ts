import { getDriveService, DriveFile } from './drive';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure image optimization
const MAX_WIDTH = 1920;
const QUALITY = 80;

// Configuración S3 (Cloudflare R2)
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.S3_ENDPOINT || '',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
    }
});
const BUCKET_NAME = 'r4tlabs-catalog'; // Asegúrate de que coincida o pasarlo por ENV
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || '';
const DOMAIN_PREFIX = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'default';

// Optimization Profiles
type OptimizationProfile = 'catalog' | 'cover';

interface SharpOptions {
    width: number;
    height?: number;
    quality: number;
    fit?: 'cover' | 'contain' | 'inside';
    position?: string;
}

const PROFILES: Record<OptimizationProfile, SharpOptions> = {
    catalog: {
        width: 800,
        quality: 75,
        fit: 'inside',
    },
    cover: {
        width: 400,
        height: 400,
        quality: 75,
        fit: 'cover',
        position: 'entropy'
    }
};

export async function processImage(
    file: DriveFile, 
    type: OptimizationProfile = 'catalog',
    oldModifiedTimes?: Map<string, string>
): Promise<string | null> {
    if (!file.mimeType.startsWith('image/')) return null;

    const drive = await getDriveService();
    
    const remoteFilename = `${DOMAIN_PREFIX}/${file.id}.webp`;
    const publicUrl = `${CDN_URL}/${remoteFilename}`;
    const vParam = file.modifiedTime ? `?v=${new Date(file.modifiedTime).getTime()}` : '';

    // Si tenemos el mapa de tiempos antiguos, validamos si necesita actualización
    if (oldModifiedTimes && file.modifiedTime) {
        const oldTime = oldModifiedTimes.get(file.id);
        if (oldTime === file.modifiedTime) {
            // No ha cambiado en Drive, no necesitamos procesar ni subir a R2 de nuevo
            return `${publicUrl}${vParam}`;
        }
    }

    console.log(`[Sync] Optimizing and Uploading to R2 [${type.toUpperCase()}]: ${file.name}`);

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
        pipeline = pipeline.rotate().withMetadata(false);

        // Resize Logic
        if (type === 'cover') {
            pipeline = pipeline.resize({
                width: opts.width,
                height: opts.height,
                fit: opts.fit,
                position: opts.position === 'entropy' ? sharp.strategy.entropy : undefined
            });
        } else {
            pipeline = pipeline.resize({
                width: opts.width,
                withoutEnlargement: true
            });
        }

        // Output Settings
        const webpBuffer = await pipeline
            .webp({
                quality: opts.quality,
                effort: 4,
                smartSubsample: true
            })
            .toBuffer();

        // Subir a Cloudflare R2
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: remoteFilename,
            Body: webpBuffer,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000'
        }));

        return `${publicUrl}${vParam}`;
    } catch (error) {
        console.error(`[Sync] Error processing/uploading ${file.name}:`, error);
        return null;
    }
}

export async function cleanOrphanedImages(validFileIds: Set<string>) {
    // Para R2, limpiar huérfanos requiere listar el bucket y borrar. 
    // Por ahora omitiremos borrar automáticamente en R2 para evitar latencia extrema, 
    // a menos que sea un cron aparte. Se podría implementar en el futuro.
    console.log('[Sync] Limpieza de huérfanos en R2 desactivada por seguridad de latencia.');
}
