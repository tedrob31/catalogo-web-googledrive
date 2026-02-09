'use client';

import { useState, useMemo, useEffect } from 'react';
import { CacheStructure, Album, PhotoItem, findPathToAlbum } from '@/lib/types';
import { AppConfig } from '@/lib/config';
import { slugify } from '@/lib/utils';
import AlbumCard from './AlbumCard';
import PhotoCard from './PhotoCard';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// We can delete the old Lightbox component file later
import { FiSearch, FiArrowLeft, FiGrid, FiHome } from 'react-icons/fi';

interface CatalogViewProps {
    data: CacheStructure | null;
    config: AppConfig;
    initialPath?: Album[]; // Now receiving full path
}

export default function CatalogView({ data, config, initialPath }: CatalogViewProps) {
    const rootAlbum = data?.root;
    const router = useRouter();
    const pathname = usePathname();

    // State now initialized cleanly from server prop
    const [currentPath, setCurrentPath] = useState<Album[]>(initialPath || (rootAlbum ? [rootAlbum] : []));
    const [searchQuery, setSearchQuery] = useState('');
    const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number>(-1);

    // Sync state if URL path changes (e.g. back button)
    useEffect(() => {
        if (initialPath) {
            setCurrentPath(initialPath);
        }
    }, [initialPath]); // Expect server to re-render with new initialPath on nav, 
    // but for soft nav we might need to handle it or just rely on router push = full page reload?
    // Next.js App Router performs soft nav. Page component will re-run and pass new initialPath.

    const currentAlbum = currentPath[currentPath.length - 1];

    // Search Logic
    const searchResults = useMemo(() => {
        if (!searchQuery || !rootAlbum) return null;

        const term = searchQuery.toLowerCase();
        const foundAlbums: Album[] = [];
        const foundPhotos: PhotoItem[] = [];
        const MAX_PHOTOS = 20;

        const searchRecursive = (album: Album) => {
            // Stop recursing for photos if limit reached, but we might still want albums? 
            // Let's just stop heavy lifting if full.
            if (foundPhotos.length >= MAX_PHOTOS) return;

            if (album.name.toLowerCase().includes(term)) {
                foundAlbums.push(album);
            }

            for (const p of album.photos) {
                if (foundPhotos.length >= MAX_PHOTOS) break;
                if (p.name.toLowerCase().includes(term)) {
                    foundPhotos.push(p);
                }
            }

            album.subAlbums.forEach(searchRecursive);
        };

        // Recursively search from root children.
        // We prioritize albums if needed, but here we just run it.
        rootAlbum.subAlbums.forEach(searchRecursive);

        // Also check root photos
        for (const p of rootAlbum.photos) {
            if (foundPhotos.length >= MAX_PHOTOS) break;
            if (p.name.toLowerCase().includes(term)) foundPhotos.push(p);
        }

        return { albums: foundAlbums, photos: foundPhotos };
    }, [searchQuery, rootAlbum]);

    if (!rootAlbum) {
        return (
            <div className="flex h-screen items-center justify-center p-8 bg-black text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Catálogo no sincronizado</h1>
                    <p className="text-gray-400">Por favor configura y sincroniza el catálogo en el panel de Administración.</p>
                </div>
            </div>
        );
    }

    // Determine what to show
    const isSearching = !!searchQuery;
    const visibleAlbums = isSearching ? searchResults!.albums : currentAlbum.subAlbums;
    const visiblePhotos = isSearching ? searchResults!.photos : currentAlbum.photos;

    // Construct Grid Style
    // ...

    // Handlers
    const constructUrl = (path: Album[]) => {
        // Skip root
        const segments = path.slice(1).map(a => slugify(a.name));
        return '/' + segments.join('/');
    };

    const handleNavigate = (album: Album) => {
        setSearchQuery('');

        let newPath: Album[];

        // If searching, we need to find the absolute path from root
        if (isSearching && rootAlbum) {
            const absolutePath = findPathToAlbum(rootAlbum, album.id);
            newPath = absolutePath || [...currentPath, album]; // Fallback
        } else {
            // Normal navigation: just append to current
            newPath = [...currentPath, album];
        }

        setCurrentPath(newPath); // Optimistic
        router.push(constructUrl(newPath), { scroll: false });
    };

    const handleBack = () => {
        if (currentPath.length > 1) {
            const newPath = currentPath.slice(0, -1);
            setCurrentPath(newPath);
            router.push(constructUrl(newPath), { scroll: false });
        }
    };

    const handleBreadcrumb = (index: number) => {
        const newPath = currentPath.slice(0, index + 1);
        setCurrentPath(newPath);
        router.push(constructUrl(newPath), { scroll: false });
    };

    // Lightbox handlers
    const openLightbox = (index: number) => setLightboxPhotoIndex(index);
    const closeLightbox = () => setLightboxPhotoIndex(-1);

    const mainStyle = {
        backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: config.textColor || undefined
    };

    return (
        <div
            className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-20 transition-colors relative"
            style={mainStyle}
        >
            {/* Header / Search Bar */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 p-4 relative">
                <div className="max-w-7xl mx-auto flex gap-4 items-center">
                    {/* Navigation Controls */}
                    {(currentPath.length > 1 || searchQuery) && (
                        <button
                            onClick={() => {
                                if (searchQuery) {
                                    setSearchQuery('');
                                    if (rootAlbum) {
                                        setCurrentPath([rootAlbum]);
                                        router.push(constructUrl([rootAlbum]), { scroll: false });
                                    }
                                } else {
                                    handleBack();
                                }
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                            title={searchQuery ? "Ir al Inicio" : "Atrás"}
                        >
                            {searchQuery ? (
                                <FiHome size={24} style={{ color: config.textColor }} />
                            ) : (
                                <FiArrowLeft size={24} style={{ color: config.textColor }} />
                            )}
                        </button>
                    )}

                    <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-zinc-900 rounded-full px-4 py-2 border border-transparent focus-within:border-blue-500 transition-colors bg-opacity-90">
                        <FiSearch className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar álbumes y fotos..."
                            className="bg-transparent border-none outline-none w-full text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ color: config.textColor ? '#000' : undefined }} // Keep input readable
                        />
                    </div>

                    {/* Simple Stats or Branding */}
                    <div className="hidden sm:block text-sm font-medium opacity-50">
                        {rootAlbum.name}
                    </div>
                </div>

                {/* Breadcrumbs for browsing */}
                {!isSearching && (
                    <div className="max-w-7xl mx-auto mt-2 px-1 flex gap-2 overflow-x-auto text-sm no-scrollbar">
                        {currentPath.map((album, idx) => (
                            <div key={album.id} className="flex items-center whitespace-nowrap">
                                {idx > 0 && <span className="mx-2 opacity-30">/</span>}
                                <button
                                    onClick={() => handleBreadcrumb(idx)}
                                    className={`hover:underline ${idx === currentPath.length - 1 ? 'font-bold' : 'opacity-60'}`}
                                >
                                    {album.name}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">

                {/* Albums Grid */}
                {visibleAlbums.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold mb-4 opacity-80 flex items-center gap-2">
                            <FiGrid /> {isSearching ? 'Álbumes encontrados' : 'Álbumes'}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 md:gap-6 gap-x-4 gap-y-6">
                            {visibleAlbums.map((album, idx) => (
                                <AlbumCard key={album.id} album={album} config={config} priority={idx < 6} onClick={() => handleNavigate(album)} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Photos Grid */}
                {visiblePhotos.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold mb-4 opacity-80 mt-8">
                            {isSearching ? 'Fotos encontradas' : 'Fotos'}
                        </h2>
                        <div className="grid gap-1 sm:gap-4 md:gap-6">
                            <style jsx>{`
                         @media (min-width: 768px) {
                             .dynamic-grid {
                                 grid-template-columns: repeat(${config.gridColumns || 5}, minmax(0, 1fr));
                             }
                         }
                         @media (max-width: 767px) {
                            .dynamic-grid {
                                grid-template-columns: repeat(${config.mobileGridColumns || 2}, minmax(0, 1fr));
                            }
                         }
                     `}</style>
                            <div className="dynamic-grid grid gap-1 sm:gap-4 md:gap-6">
                                {visiblePhotos.map((photo, idx) => (
                                    <PhotoCard key={photo.id} photo={photo} priority={idx < 10} onClick={() => openLightbox(idx)} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {visibleAlbums.length === 0 && visiblePhotos.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p>No se encontró contenido.</p>
                    </div>
                )}

            </main>

            {/* Lightbox Overlay */}
            <Lightbox
                open={lightboxPhotoIndex >= 0}
                close={() => setLightboxPhotoIndex(-1)}
                index={lightboxPhotoIndex}
                slides={visiblePhotos.map(p => {
                    const src = p.fullLink || '';
                    const hqSrc = src ? `${src}${src.includes('?') ? '&' : '?'}w=1600` : '';
                    return {
                        src: hqSrc,
                        alt: p.name,
                    };
                })}
                plugins={[Zoom]}
                zoom={{ maxZoomPixelRatio: 3 }}
                controller={{ closeOnBackdropClick: true }}
            // Remove toolbar buttons (Download/Share are not present by default in core)
            />
        </div>
    );
}
