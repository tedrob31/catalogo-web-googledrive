import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Obtener nombre del bucket de R2
export function getR2BucketName(): string {
  const env = process.env;
  const bucket = env['R2_BUCKET_NAME'] || env['S3_BUCKET_NAME'] || 'cdnc4talogo';
  return bucket.trim();
}

// Obtener dominio público de Cloudflare CDN para R2
export function getR2PublicDomain(): string {
  const env = process.env;
  const domain = env['R2_PUBLIC_DOMAIN'] || env['NEXT_PUBLIC_CDN_URL'] || 'https://cdn.c4talogo.com';
  return domain.trim().replace(/\/+$/, '');
}

// Cliente de S3 adaptado a Cloudflare R2 con sanitización robusta
export function getR2Client() {
  const env = process.env;
  let endpoint = env['R2_ENDPOINT'] || env['S3_ENDPOINT'];
  let accessKeyId = env['R2_ACCESS_KEY_ID'] || env['S3_ACCESS_KEY_ID'];
  let secretAccessKey = env['R2_SECRET_ACCESS_KEY'] || env['S3_SECRET_ACCESS_KEY'];

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Variables de entorno de Cloudflare R2 no configuradas (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }

  // Sanitización de espacios y barras finales
  endpoint = endpoint.trim().replace(/\/+$/, '');
  accessKeyId = accessKeyId.trim();
  secretAccessKey = secretAccessKey.trim();

  // Si el usuario incluyó accidentalmente el bucket al final del endpoint (ej. https://...r2.cloudflarestorage.com/cdnc4talogo)
  const bucket = getR2BucketName();
  if (bucket && endpoint.endsWith(`/${bucket}`)) {
    endpoint = endpoint.slice(0, -(bucket.length + 1));
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

  try {
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
  } catch (error: any) {
    if (error?.Code === 'Unauthorized' || error?.name === 'Unauthorized' || error?.$metadata?.httpStatusCode === 401) {
      console.error(`[R2 Auth Error] Error de autorización al subir a '${bucket}/${key}'. ` +
        `Verifica que R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY pertenezcan a un token R2 con permisos 'Object Read & Write' para el bucket '${bucket}'.`);
    }
    throw error;
  }
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
