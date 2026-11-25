import Image from 'next/image';
import { PhotoItem } from '@/lib/types';
import { AppConfig } from '@/lib/config';
import { isWidePhotoDimensions, resolvePhotoCardLayout } from '@/lib/photo-layout';
import { useState } from 'react';

interface PhotoCardProps {
    photo: PhotoItem;
    config?: AppConfig;
    desktopCols?: number;
    mobileCols?: number;
    priority?: boolean;
    onWideDetected?: (photoId: string) => void;
    onClick: () => void;
}

interface Dimensions {
    width: number;
    height: number;
}

// Registro en memoria para asegurar que cada foto HD solo se precargue una única vez por sesión
const prefetchedImages = new Set<string>();
// Caché en memoria de dimensiones naturales medidas en el navegador cuando la BD aún no las tiene
const measuredDimensionsCache = new Map<string, Dimensions>();

export default function PhotoCard({
    photo,
    config,
    desktopCols = 5,
    mobileCols = 2,
    priority = false,
    onWideDetected,
    onClick,
}: PhotoCardProps) {
    const [isLoading, setIsLoading] = useState(!priority);
    const [measuredDims, setMeasuredDims] = useState<Dimensions | null>(() => {
        if (photo.width && photo.height) {
            return { width: photo.width, height: photo.height };
        }
        return measuredDimensionsCache.get(photo.id) || null;
    });

    const activeWidth = photo.width || measuredDims?.width;
    const activeHeight = photo.height || measuredDims?.height;
    const layout = resolvePhotoCardLayout({
        width: activeWidth,
        height: activeHeight,
        desktopCols,
        mobileCols,
    });

    // Precarga inteligente de alta resolución: solo una vez por foto en toda la sesión
    const prefetchFullImage = () => {
        const url = photo.fullLink;
        if (!url || typeof window === 'undefined') return;

        if (prefetchedImages.has(url)) return;
        prefetchedImages.add(url);

        const img = new window.Image();
        img.src = url;
    };

    const isWhiteColor = !config?.secondaryColor || config.secondaryColor.toLowerCase() === '#ffffff' || config.secondaryColor.toLowerCase() === '#fff';
    const hasCustomColor = !isWhiteColor;

    const borderStyle: React.CSSProperties = {
        borderWidth: config?.cardBorderWidth !== undefined ? `${config.cardBorderWidth}px` : '1px',
        borderColor: hasCustomColor ? config?.cardBorderColor || undefined : undefined,
        borderStyle: config?.cardBorderWidth === 0 ? 'none' : 'solid',
    };

    return (
        <div
            className={`relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 ${layout.spanClassName}`.trim()}
            style={{ aspectRatio: layout.aspectRatio, ...borderStyle }}
            onClick={onClick}
            onMouseEnter={prefetchFullImage}
            onTouchStart={prefetchFullImage}
        >
            <Image
                src={photo.thumbnailLink || ''}
                alt={photo.name}
                fill
                className={`
          object-cover transition-all duration-500 ease-in-out group-hover:scale-105
          ${isLoading ? 'scale-110 blur-xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
                onLoad={(event) => {
                    setIsLoading(false);
                    if (!photo.width || !photo.height) {
                        const natW = event.currentTarget.naturalWidth;
                        const natH = event.currentTarget.naturalHeight;
                        if (natW > 0 && natH > 0) {
                            const dims = { width: natW, height: natH };
                            measuredDimensionsCache.set(photo.id, dims);
                            setMeasuredDims((prev) =>
                                prev && prev.width === natW && prev.height === natH ? prev : dims
                            );
                            if (isWidePhotoDimensions(natW, natH)) {
                                onWideDetected?.(photo.id);
                            }
                        }
                    } else if (isWidePhotoDimensions(photo.width, photo.height)) {
                        onWideDetected?.(photo.id);
                    }
                }}
                loading={priority ? "eager" : "lazy"}
                priority={priority}
                decoding="async"
                sizes={layout.sizes}
            />
            {!config?.hidePhotoNames && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm truncate font-medium">{photo.name}</p>
                </div>
            )}
        </div>
    );
}
