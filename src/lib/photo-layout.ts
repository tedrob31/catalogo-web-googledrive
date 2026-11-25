export const DEFAULT_PHOTO_ASPECT_RATIO = '4 / 5';
export const WIDE_PHOTO_RATIO_THRESHOLD = 1.3;
export const MIN_CLAMPED_RATIO = 0.6;
export const MAX_CLAMPED_RATIO = 2.0;

export interface PhotoCardLayoutInput {
  width?: number | null;
  height?: number | null;
  desktopCols?: number;
  mobileCols?: number;
}

export interface PhotoCardLayoutResult {
  aspectRatio: string;
  isWide: boolean;
  spanClassName: string;
  sizes: string;
  hasKnownDimensions: boolean;
}

/**
 * Calcula la geometría adaptativa de una tarjeta ("Mixto Inteligente") usando
 * las dimensiones reales de la imagen sin alterar su URL/transformación en Cloudflare.
 */
export function resolvePhotoCardLayout({
  width,
  height,
  desktopCols = 5,
  mobileCols = 2,
}: PhotoCardLayoutInput): PhotoCardLayoutResult {
  const validWidth = typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : null;
  const validHeight =
    typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : null;

  if (!validWidth || !validHeight) {
    return {
      aspectRatio: DEFAULT_PHOTO_ASPECT_RATIO,
      isWide: false,
      spanClassName: '',
      sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
      hasKnownDimensions: false,
    };
  }

  const rawRatio = validWidth / validHeight;
  const clampedRatio = Math.max(MIN_CLAMPED_RATIO, Math.min(MAX_CLAMPED_RATIO, rawRatio));
  const isWide = rawRatio >= WIDE_PHOTO_RATIO_THRESHOLD;

  const canSpanMobile = mobileCols >= 2;
  const canSpanDesktop = desktopCols >= 2;

  let spanClassName = '';
  if (isWide) {
    if (canSpanMobile && canSpanDesktop) {
      spanClassName = 'col-span-2';
    } else if (!canSpanMobile && canSpanDesktop) {
      spanClassName = 'md:col-span-2';
    } else if (canSpanMobile && !canSpanDesktop) {
      spanClassName = 'col-span-2 md:col-span-1';
    }
  }

  const aspectRatio =
    rawRatio === clampedRatio
      ? `${validWidth} / ${validHeight}`
      : Number(clampedRatio.toFixed(4)).toString();

  return {
    aspectRatio,
    isWide,
    spanClassName,
    sizes: isWide
      ? '(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 40vw'
      : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
    hasKnownDimensions: true,
  };
}

export function isWidePhotoDimensions(width?: number | null, height?: number | null): boolean {
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) return false;
  if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return false;
  return width / height >= WIDE_PHOTO_RATIO_THRESHOLD;
}

export type PhotoSortOrder = 'desc' | 'asc';

export function normalizePhotoSortOrder(value?: string | null): PhotoSortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}

export function compareNaturalNames(a?: string | null, b?: string | null): number {
  return (a || '').localeCompare(b || '', 'es', { numeric: true, sensitivity: 'base' });
}

export function sortPhotosByOrder<T extends { name?: string | null }>(
  photos: T[],
  order: PhotoSortOrder = 'desc'
): T[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...photos].sort((a, b) => compareNaturalNames(a.name, b.name) * dir);
}

/**
 * Evita dejar columnas huérfanas a la derecha en desktop (ej. 5 columnas con tarjetas col-span-2
 * que dejan el 20% derecho vacío). Si existen fotos anchas en la vista, ajusta un conteo impar a par.
 */
export function resolveEffectiveGridColumns(configuredCols: number, hasWidePhotos: boolean): number {
  const safeCols =
    Number.isFinite(configuredCols) && configuredCols >= 1 ? Math.round(configuredCols) : 5;
  if (!hasWidePhotos || safeCols < 3) return safeCols;
  if (safeCols % 2 === 0) return safeCols;
  return safeCols === 3 ? 4 : safeCols - 1;
}
