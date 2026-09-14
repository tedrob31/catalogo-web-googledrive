import crypto from 'crypto';
import { getR2PublicDomain } from './r2';

export interface ImgproxyOptions {
  width?: number;
  height?: number;
  resizingType?: 'fit' | 'fill' | 'auto' | 'crop';
  gravity?: 'no' | 'so' | 'ea' | 'we' | 'ce' | 'sm'; // sm = smart crop
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  watermark?: {
    opacity?: number;
    position?: 'ce' | 're' | 'so' | 'se';
    url?: string;
  };
}

function urlSafeBase64(data: Buffer | string): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Genera una URL firmada con HMAC-SHA256 para Imgproxy.
 * Regla de Oro: Se ejecuta EXCLUSIVAMENTE en el backend (Server Component o Server Action).
 */
export function generateSignedImgproxyUrl(
  r2Key: string,
  options: ImgproxyOptions = {}
): string {
  const imgproxyUrl = (process.env.IMGPROXY_URL || 'https://img.c4talogo.com').replace(/\/+$/, '');
  const key = process.env.IMGPROXY_KEY;
  const salt = process.env.IMGPROXY_SALT;

  // 1. Construir la URL origen usando el dominio público HTTP de Cloudflare R2
  // Bypass del protocolo s3:// según arquitectura para máxima velocidad y evitar errores de región
  const r2PublicDomain = getR2PublicDomain();
  const cleanKey = r2Key.startsWith('/') ? r2Key.slice(1) : r2Key;
  // Codificar espacios como %20
  const encodedKey = cleanKey.split('/').map(part => encodeURIComponent(part)).join('/');
  const sourceHttpUrl = `${r2PublicDomain}/${encodedKey}`;
  const encodedSourceUrl = urlSafeBase64(sourceHttpUrl);

  // 2. Armar opciones de procesamiento de Imgproxy
  const {
    width = 0,
    height = 0,
    resizingType = 'auto',
    gravity = 'no',
    quality = 80,
    format = 'webp',
  } = options;

  const processingParts: string[] = [
    `rs:${resizingType}:${width}:${height}`,
    `g:${gravity}`,
    `q:${quality}`,
  ];

  const processingPath = `/${processingParts.join('/')}/${encodedSourceUrl}.${format}`;

  // Si no hay llaves de firma configuradas (ej. entorno de desarrollo local sin firma), retornar con /insecure/
  if (!key || !salt) {
    return `${imgproxyUrl}/insecure${processingPath}`;
  }

  // 3. Generar la firma HMAC-SHA256
  const keyBin = Buffer.from(key, 'hex');
  const saltBin = Buffer.from(salt, 'hex');

  const hmac = crypto.createHmac('sha256', keyBin);
  hmac.update(saltBin);
  hmac.update(Buffer.from(processingPath, 'utf8'));

  const signature = urlSafeBase64(hmac.digest());

  return `${imgproxyUrl}/${signature}${processingPath}`;
}

/**
 * Perfiles optimizados predefinidos
 */
export const ImgproxyProfiles = {
  // Miniatura para navegación rápida y cuadrícula
  thumbnail: (r2Key: string) =>
    generateSignedImgproxyUrl(r2Key, {
      width: 300,
      height: 300,
      resizingType: 'fill',
      gravity: 'sm',
      quality: 75,
      format: 'webp',
    }),

  // Imagen estándar para el catálogo responsive
  catalog: (r2Key: string) =>
    generateSignedImgproxyUrl(r2Key, {
      width: 800,
      height: 0,
      resizingType: 'auto',
      quality: 80,
      format: 'webp',
    }),

  // Portada cuadrada para álbumes
  cover: (r2Key: string) =>
    generateSignedImgproxyUrl(r2Key, {
      width: 500,
      height: 500,
      resizingType: 'fill',
      gravity: 'sm',
      quality: 80,
      format: 'webp',
    }),

  // Vista ampliada en lightbox de alta resolución
  lightbox: (r2Key: string) =>
    generateSignedImgproxyUrl(r2Key, {
      width: 1920,
      height: 0,
      resizingType: 'auto',
      quality: 85,
      format: 'webp',
    }),
};
