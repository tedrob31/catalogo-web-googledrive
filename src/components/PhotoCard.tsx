import Image from 'next/image';
import { PhotoItem } from '@/lib/types';
import { useState } from 'react';

interface PhotoCardProps {
    photo: PhotoItem;
    priority?: boolean;
    onClick: () => void;
}

export default function PhotoCard({ photo, priority = false, onClick }: PhotoCardProps) {
    const [isLoading, setIsLoading] = useState(!priority);

    return (
        <div
            className="relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            style={{ aspectRatio: '4/5' }}
            onClick={onClick}
        >
            <Image
                src={`${photo.thumbnailLink}${photo.thumbnailLink?.includes('?') ? '&' : '?'}w=1600`} // Unified High Res (1600px)
                alt={photo.name}
                fill
                className={`
          object-cover transition-all duration-500 ease-in-out group-hover:scale-105
          ${isLoading ? 'scale-110 blur-xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
                onLoad={() => setIsLoading(false)}
                loading={priority ? "eager" : "lazy"}
                priority={priority}
                decoding="async"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-sm truncate font-medium">{photo.name}</p>
            </div>
        </div>
    );
}
