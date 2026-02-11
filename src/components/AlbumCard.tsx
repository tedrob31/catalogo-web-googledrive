import Link from 'next/link';
import Image from 'next/image';
import { Album } from '@/lib/types';
import { AppConfig } from '@/lib/config';
import { FiFolder } from 'react-icons/fi';

interface AlbumCardProps {
    album: Album;
    config: AppConfig;
    priority?: boolean;
    onClick: () => void;
}

export default function AlbumCard({ album, config, priority = false, onClick }: AlbumCardProps) {
    // Try to find a cover photo from config, then this album, or its first sub-album
    const customCover = config.folderCovers?.[album.id];
    const coverPhoto = album.photos[0] || album.subAlbums[0]?.photos[0];
    const thumbSrc = customCover || coverPhoto?.thumbnailLink || '';

    const borderStyle = {
        borderWidth: config.cardBorderWidth ? `${config.cardBorderWidth}px` : '1px',
        borderColor: config.cardBorderColor || undefined,
    };

    return (
        <div
            className="group cursor-pointer flex flex-col gap-2"
            onClick={onClick}
        >
            <div
                className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                style={borderStyle}
            >
                {thumbSrc ? (
                    <Image
                        src={thumbSrc}
                        alt={album.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 20vw"
                        priority={priority}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <FiFolder size={48} />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            </div>
            <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100 group-hover:text-blue-500">
                {album.name}
            </h3>
        </div>
    );
}
