import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Cliente de S3 adaptado a Cloudflare R2
export function getR2Client() {
  const endpoint = process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Variables de entorno de Cloudflare R2 no configuradas (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'c4talogo-media';
}

export function getR2PublicDomain(): string {
  const domain = process.env.R2_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.c4talogo.com';
  return domain.replace(/\/+$/, '');
}

/**
 * Sube un buffer binario directamente a Cloudflare R2 sin procesamiento local
 */
export async function uploadBufferToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ key: string; size: number }> {
  const client = getR2Client();
  const bucket = getR2BucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return {
    key,
    size: buffer.length,
  };
}

/**
 * Verifica si un objeto ya existe en R2 para evitar re-descargas innecesarias
 */
export async function checkObjectExistsInR2(key: string): Promise<boolean> {
  try {
    const client = getR2Client();
    const bucket = getR2BucketName();
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Elimina un objeto de R2
 */
export async function deleteObjectFromR2(key: string): Promise<void> {
  try {
    const client = getR2Client();
    const bucket = getR2BucketName();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error(`Error eliminando de R2 (${key}):`, error);
  }
}
