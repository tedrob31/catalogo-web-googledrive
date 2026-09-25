'use client';

import { useState, useMemo, useEffect } from 'react';
import { CacheStructure, Album, PhotoItem, findPathToAlbum, findAlbumBySlugPath } from '@/lib/types';
import { AppConfig } from '@/lib/config';
import { slugify } from '@/lib/utils';
import AlbumCard from './AlbumCard';
import PhotoCard from './PhotoCard';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { useRouter } from 'next/navigation';

import { FiSearch, FiArrowLeft, FiGrid, FiHome } from 'react-icons/fi';
import { StorefrontConfig } from '@/lib/storefront';
import StorefrontView from './storefront/StorefrontView';
import SeasonalEffects from './SeasonalEffects';
import ClickEffects from './ClickEffects';

interface CatalogViewProps {
    data: CacheStructure | null;
    config: AppConfig;
    initialPath?: Album[];
    storefront?: StorefrontConfig;
}

export default function CatalogView({ data, config, initialPath, storefront }: CatalogViewProps) {
    const rootAlbum = data?.root;
    const router = useRouter();

    // Estado de navegación en cliente instantáneo (0ms)
    const [activePath, setActivePath] = useState<Album[]>(initialPath || (rootAlbum ? [rootAlbum] : []));
    const [searchQuery, setSearchQuery] = useState('');
    const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number>(-1);

    // Sincronizar si cambia initialPath desde SSR
    useEffect(() => {
        if (initialPath && initialPath.length > 0) {
            setActivePath(initialPath);
        }
    }, [initialPath]);

    const currentAlbum = activePath[activePath.length - 1];

    // Search Logic
    const searchResults = useMemo(() => {
        if (!searchQuery || !rootAlbum) return null;

        const term = searchQuery.toLowerCase();
        const foundAlbums: Album[] = [];
        const foundPhotos: PhotoItem[] = [];
        const MAX_PHOTOS = 20;

        const searchRecursive = (album: Album) => {
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

        rootAlbum.subAlbums.forEach(searchRecursive);

        for (const p of rootAlbum.photos) {
            if (foundPhotos.length >= MAX_PHOTOS) break;
            if (p.name.toLowerCase().includes(term)) foundPhotos.push(p);
        }

        return { albums: foundAlbums, photos: foundPhotos };
    }, [searchQuery, rootAlbum]);

    // Soporte para botones de Atrás / Adelante del navegador y celular (0ms)
    useEffect(() => {
        const handlePopState = () => {
            if (!rootAlbum) return;
            const segments = window.location.pathname.split('/').filter(Boolean);
            if (segments.length === 0) {
                setActivePath([rootAlbum]);
                return;
            }
            const found = findAlbumBySlugPath(rootAlbum, segments);
            setActivePath(found || [rootAlbum]);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [rootAlbum]);

    if (!rootAlbum) {
        return (
            <div className="flex h-screen items-center justify-center p-8 bg-white dark:bg-black text-black dark:text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Catálogo no sincronizado</h1>
                    <p className="text-gray-500 dark:text-gray-400">Por favor configura y sincroniza el catálogo en el panel de Administración.</p>
                </div>
            </div>
        );
    }

    // Determine what to show
    const isSearching = !!searchQuery;
    const visibleAlbums = isSearching ? searchResults!.albums : currentAlbum?.subAlbums || [];
    const visiblePhotos = isSearching ? searchResults!.photos : currentAlbum?.photos || [];

    // Handlers con navegación instantánea (0ms) y sincronización de URL
    const constructUrl = (path: Album[]) => {
        const segments = path.slice(1).map(a => slugify(a.name));
        return segments.length > 0 ? '/' + segments.join('/') : '/';
    };

    const handleNavigate = (album: Album) => {
        setSearchQuery('');

        let newPath: Album[];
        if (isSearching && rootAlbum) {
            const absolutePath = findPathToAlbum(rootAlbum, album.id);
            newPath = absolutePath || [...activePath, album];
        } else {
            newPath = [...activePath, album];
        }

        // 1. Navegación instantánea en memoria (0ms)
        setActivePath(newPath);

        // 2. Sincronizar URL en el navegador sin bloquear con peticiones de servidor
        const newUrl = constructUrl(newPath);
        window.history.pushState({ path: newPath.map(a => a.id) }, '', newUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        if (activePath.length > 1) {
            const newPath = activePath.slice(0, -1);
            setActivePath(newPath);
            const newUrl = constructUrl(newPath);
            window.history.pushState({ path: newPath.map(a => a.id) }, '', newUrl);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBreadcrumb = (index: number) => {
        const newPath = activePath.slice(0, index + 1);
        setActivePath(newPath);
        const newUrl = constructUrl(newPath);
        window.history.pushState({ path: newPath.map(a => a.id) }, '', newUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Lightbox handlers
    const openLightbox = (index: number) => setLightboxPhotoIndex(index);
    const closeLightbox = () => setLightboxPhotoIndex(-1);

    const mainStyle = {
        backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: config.textColor || undefined,
    };

    return (
        <div
            className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 pb-20 transition-colors relative"
            style={mainStyle}
        >
            <SeasonalEffects config={config} />
            <ClickEffects config={config} />

            {/* Header / Search Bar con Modo Noche Adaptativo */}
            <header className="sticky top-0 z-40 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 p-4 text-gray-900 dark:text-gray-100 relative">
                <div className="max-w-7xl mx-auto flex gap-4 items-center">
                    {/* Navigation Controls */}
                    {(activePath.length > 1 || searchQuery) && (
                        <button
                            onClick={() => {
                                if (searchQuery) {
                                    setSearchQuery('');
                                    if (rootAlbum) {
                                        setActivePath([rootAlbum]);
                                        window.history.pushState({}, '', constructUrl([rootAlbum]));
                                    }
                                } else {
                                    handleBack();
                                }
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-700 dark:text-gray-200 transition-colors"
                            title={searchQuery ? "Ir al Inicio" : "Atrás"}
                        >
                            {searchQuery ? (
                                <FiHome size={24} style={config.textColor ? { color: config.textColor } : undefined} />
                            ) : (
                                <FiArrowLeft size={24} style={config.textColor ? { color: config.textColor } : undefined} />
                            )}
                        </button>
                    )}

                    <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-zinc-900 rounded-full px-4 py-2 border border-transparent focus-within:border-blue-500 transition-colors bg-opacity-90">
                        <FiSearch className="text-gray-400 dark:text-gray-500 shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar álbumes y fotos..."
                            className="bg-transparent border-none outline-none w-full text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={config.textColor ? { color: config.textColor } : undefined}
                        />
                    </div>

                    {/* Simple Stats or Branding */}
                    <div className="hidden sm:block text-sm font-medium opacity-70 text-gray-700 dark:text-gray-300">
                        {rootAlbum.name}
                    </div>
                </div>

                {/* Breadcrumbs for browsing con soporte completo de Modo Noche */}
                {!isSearching && (
                    <div className="max-w-7xl mx-auto mt-2 px-1 flex gap-2 overflow-x-auto text-sm no-scrollbar">
                        {activePath.map((album, idx) => (
                            <div key={album.id} className="flex items-center whitespace-nowrap">
                                {idx > 0 && <span className="mx-2 opacity-40 text-gray-400 dark:text-gray-600">/</span>}
                                <button
                                    onClick={() => handleBreadcrumb(idx)}
                                    className={`hover:underline transition-colors ${
                                        idx === activePath.length - 1
                                            ? 'font-bold text-gray-900 dark:text-white'
                                            : 'opacity-70 text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    {album.name}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-4 space-y-8 animate-in fade-in duration-300">
                {/* --- STOREFRONT BUILDER INJECTION --- */}
                {!isSearching && activePath.length === 1 && storefront?.enabled && storefront.blocks.length > 0 ? (
                    <StorefrontView storefront={storefront} appConfig={config} />
                ) : (
                    <>
                        {/* Albums Grid */}
                        {visibleAlbums.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <FiGrid /> {isSearching ? 'Álbumes encontrados' : 'Álbumes'}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 md:gap-6 gap-x-4 gap-y-6">
                                    {visibleAlbums.map((album, idx) => (
                                        <AlbumCard
                                            key={album.id}
                                            album={album}
                                            config={config}
                                            priority={idx < 6}
                                            onClick={() => handleNavigate(album)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Photos Grid */}
                        {visiblePhotos.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 mt-8">
                                    {isSearching ? 'Fotos encontradas' : 'Fotos'}
                                </h2>
                                <div className="grid gap-1 sm:gap-4 md:gap-6">
                                    <div
                                        className="dynamic-catalog-grid grid gap-1 sm:gap-4 md:gap-6"
                                        style={{
                                            '--grid-cols-desktop': config.gridColumns || 5,
                                            '--grid-cols-mobile': config.mobileGridColumns || 2
                                        } as any}
                                    >
                                        {visiblePhotos.map((photo, idx) => (
                                            <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                priority={idx < 10}
                                                onClick={() => openLightbox(idx)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {visibleAlbums.length === 0 && visiblePhotos.length === 0 && (
                            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                                <p>No se encontró contenido.</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Lightbox Overlay */}
            <Lightbox
                open={lightboxPhotoIndex >= 0}
                close={() => setLightboxPhotoIndex(-1)}
                index={lightboxPhotoIndex}
                slides={visiblePhotos.map(p => ({
                    src: p.fullLink || '',
                    alt: p.name,
                }))}
                plugins={[Zoom]}
                zoom={{ maxZoomPixelRatio: 3 }}
                controller={{ closeOnBackdropClick: true }}
            />
        </div>
    );
}
