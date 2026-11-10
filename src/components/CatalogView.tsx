'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CacheStructure, Album, PhotoItem, findPathToAlbum, findAlbumBySlugPath } from '@/lib/types';
import { AppConfig } from '@/lib/config';
import { slugify } from '@/lib/utils';
import AlbumCard from './AlbumCard';
import PhotoCard from './PhotoCard';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import { useRouter } from 'next/navigation';

import { FiSearch, FiArrowLeft, FiGrid, FiHome } from 'react-icons/fi';
import { FaWhatsapp, FaInstagram, FaTiktok, FaFacebook } from 'react-icons/fa';
import { StorefrontConfig } from '@/lib/storefront';
import StorefrontView from './storefront/StorefrontView';
import SeasonalEffects from './SeasonalEffects';
import ClickEffects from './ClickEffects';
import { hexToRgba, isColorDark } from '@/lib/theme-presets';
import { optimizeWallpaperUrl } from '@/lib/cloudflare-images';

interface CatalogViewProps {
    data: CacheStructure | null;
    config: AppConfig;
    initialPath?: Album[];
    storefront?: StorefrontConfig;
    tenantId?: string;
}

function formatSocialUrl(value: string, platform: 'instagram' | 'tiktok' | 'facebook'): string {
    const clean = value.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (platform === 'instagram') {
        const handle = clean.replace(/^@/, '');
        return `https://instagram.com/${handle}`;
    }
    if (platform === 'tiktok') {
        const handle = clean.startsWith('@') ? clean : `@${clean}`;
        return `https://tiktok.com/${handle}`;
    }
    if (platform === 'facebook') {
        return `https://facebook.com/${clean}`;
    }
    return clean;
}

export default function CatalogView({ data, config, initialPath, storefront, tenantId }: CatalogViewProps) {
    const rootAlbum = data?.root;
    const router = useRouter();

    // Estado de navegación en cliente instantáneo (0ms)
    const [activePath, setActivePath] = useState<Album[]>(initialPath || (rootAlbum ? [rootAlbum] : []));
    const [searchQuery, setSearchQuery] = useState('');
    const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState<number>(-1);

    // Sincronizar si cambia initialPath desde SSR (evitar re-renders y ciclos si los álbumes son idénticos)
    useEffect(() => {
        if (initialPath && initialPath.length > 0) {
            setActivePath(prev => {
                if (
                    prev.length === initialPath.length &&
                    prev.every((alb, idx) => alb.id === initialPath[idx].id)
                ) {
                    return prev;
                }
                return initialPath;
            });
        }
    }, [initialPath]);

    // Refrescar silenciosamente en segundo plano con limitador (mínimo 30 segundos entre peticiones)
    // Esto garantiza que cientos de usuarios simultáneos navegando carpetas o alternando pestañas
    // no saturen el ancho de banda ni el servidor, mientras se mantiene el catálogo siempre actualizado.
    const lastBackgroundRefreshRef = useRef<number>(0);
    const triggerBackgroundRefresh = useCallback((minIntervalMs = 30000) => {
        const now = Date.now();
        if (now - lastBackgroundRefreshRef.current > minIntervalMs) {
            lastBackgroundRefreshRef.current = now;
            router.refresh();
        }
    }, [router]);

    // Refrescar automáticamente con el servidor cuando el usuario vuelve a enfocar la pestaña de la tienda
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                triggerBackgroundRefresh(30000);
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onVisibilityChange);
        };
    }, [triggerBackgroundRefresh]);

    // Mantener sincronizado el álbum actual siempre con los datos frescos de rootAlbum (props)
    const currentAlbum = useMemo(() => {
        if (!rootAlbum) return null;
        const currentTargetId = activePath[activePath.length - 1]?.id;
        if (!currentTargetId || currentTargetId === rootAlbum.id) {
            return rootAlbum;
        }
        const freshPath = findPathToAlbum(rootAlbum, currentTargetId);
        return freshPath ? freshPath[freshPath.length - 1] : rootAlbum;
    }, [rootAlbum, activePath]);

    // Enviar evento de métrica no bloqueante a la API
    const sendMetricPayload = useCallback(
        (pathStr: string, title: string, eventType: 'view' | 'whatsapp') => {
            if (!tenantId) return;
            try {
                const payload = JSON.stringify({
                    tenant_id: tenantId,
                    path: pathStr || '/',
                    title: title || 'Catálogo Principal',
                    event_type: eventType,
                });

                if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                    const blob = new Blob([payload], { type: 'application/json' });
                    navigator.sendBeacon('/api/analytics/track/', blob);
                } else {
                    fetch('/api/analytics/track/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: payload,
                        keepalive: true,
                    }).catch(() => {});
                }
            } catch {
                // Silencioso para garantizar que no interrumpa al usuario
            }
        },
        [tenantId]
    );

    // Registro de vistas deduplicado con ventana de cooldown (15 min por ruta/sesión)
    // Previene métricas infladas por cambio de foco (Alt+Tab), lecturas prolongadas o refrescos en background
    const inMemoryViewsRef = useRef<Map<string, number>>(new Map());
    const trackPageView = useCallback(
        (pathStr: string, title: string) => {
            if (!tenantId || typeof window === 'undefined') return;

            const now = Date.now();
            const VIEW_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos por ruta en la misma sesión
            const key = `c4t_view_${tenantId}_${pathStr}`;

            try {
                const lastTracked = Number(sessionStorage.getItem(key) || 0);
                if (lastTracked && now - lastTracked < VIEW_COOLDOWN_MS) {
                    return;
                }
                sessionStorage.setItem(key, String(now));
            } catch {
                const lastTracked = inMemoryViewsRef.current.get(key) || 0;
                if (lastTracked && now - lastTracked < VIEW_COOLDOWN_MS) {
                    return;
                }
                inMemoryViewsRef.current.set(key, now);
            }

            sendMetricPayload(pathStr, title, 'view');
        },
        [tenantId, sendMetricPayload]
    );

    // Registro de clics a WhatsApp con debounce (mínimo 3 segundos entre clics)
    const lastWhatsappClickRef = useRef<number>(0);
    const trackWhatsappClick = useCallback(
        (pathStr: string, title: string) => {
            if (!tenantId) return;
            const now = Date.now();
            if (now - lastWhatsappClickRef.current < 3000) {
                return;
            }
            lastWhatsappClickRef.current = now;
            sendMetricPayload(pathStr, title, 'whatsapp');
        },
        [tenantId, sendMetricPayload]
    );

    // Construcción de ruta canónica y título para métricas
    const currentPathStr = useMemo(() => {
        if (!activePath || activePath.length <= 1) return '/';
        const segments = activePath.slice(1).map(a => slugify(a.name));
        return segments.length > 0 ? '/' + segments.join('/') : '/';
    }, [activePath]);

    const currentAlbumTitle = useMemo(() => {
        if (!activePath || activePath.length === 0) return rootAlbum?.name || 'Catálogo Principal';
        return activePath[activePath.length - 1]?.name || rootAlbum?.name || 'Catálogo Principal';
    }, [activePath, rootAlbum?.name]);

    // Registrar vista al ingresar o navegar entre álbumes
    useEffect(() => {
        if (!rootAlbum) return;
        trackPageView(currentPathStr, currentAlbumTitle);
    }, [currentPathStr, currentAlbumTitle, rootAlbum, trackPageView]);

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

        // 3. Refrescar silenciosamente en background solo si ha pasado suficiente tiempo (throttle)
        triggerBackgroundRefresh();
    };

    const handleBack = () => {
        if (activePath.length > 1) {
            const newPath = activePath.slice(0, -1);
            setActivePath(newPath);
            const newUrl = constructUrl(newPath);
            window.history.pushState({ path: newPath.map(a => a.id) }, '', newUrl);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            triggerBackgroundRefresh();
        }
    };

    const handleBreadcrumb = (index: number) => {
        const newPath = activePath.slice(0, index + 1);
        setActivePath(newPath);
        const newUrl = constructUrl(newPath);
        window.history.pushState({ path: newPath.map(a => a.id) }, '', newUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        triggerBackgroundRefresh();
    };

    // Lightbox handlers
    const openLightbox = (index: number) => setLightboxPhotoIndex(index);
    const closeLightbox = () => setLightboxPhotoIndex(-1);

    const plugins = useMemo(() => {
        return config.allowPhotoDownload ? [Zoom, Download] : [Zoom];
    }, [config.allowPhotoDownload]);

    const isWhiteColor = !config.secondaryColor || config.secondaryColor.toLowerCase() === '#ffffff' || config.secondaryColor.toLowerCase() === '#fff';
    const hasCustomBgColor = !isWhiteColor;
    const isDark = hasCustomBgColor ? isColorDark(config.secondaryColor) : false;

    const textColor = config.textColor || (isDark ? '#f8fafc' : '#0f172a');
    const headerBgColor = hexToRgba(config.secondaryColor || (isDark ? '#090d16' : '#ffffff'), 0.88);
    const headerBorderColor = config.cardBorderColor || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)');

    const mainStyle: React.CSSProperties = {
        backgroundColor: hasCustomBgColor && !config.backgroundImage ? config.secondaryColor : undefined,
        color: hasCustomBgColor ? textColor : undefined,
    };

    const hasSocialLinks = Boolean(
        config.socialLinks?.instagram ||
        config.socialLinks?.tiktok ||
        config.socialLinks?.facebook ||
        config.whatsappNumber
    );

    return (
        <div
            className={`min-h-screen flex flex-col transition-colors relative ${hasCustomBgColor && isDark ? 'dark' : ''} ${
                config.backgroundImage
                    ? 'bg-transparent'
                    : hasCustomBgColor
                    ? ''
                    : 'bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100'
            }`}
            style={mainStyle}
        >
            {/* Foto de fondo fija (wallpaper) con aceleración por hardware aislada en GPU (0ms lag en celulares) */}
            {config.backgroundImage && (
                <>
                    <div
                        className="fixed top-0 left-0 w-full h-[100dvh] pointer-events-none -z-10 bg-cover bg-center bg-no-repeat [transform:translate3d(0,0,0)] [backface-visibility:hidden] will-change-transform"
                        style={{
                            backgroundImage: `url(${optimizeWallpaperUrl(config.backgroundImage)})`,
                        }}
                    />
                    {/* Filtro scrim de opacidad para garantizar lectura y contraste de fotos */}
                    <div
                        className="fixed inset-0 pointer-events-none -z-10"
                        style={{
                            backgroundColor: hasCustomBgColor ? config.secondaryColor : (isDark ? '#000000' : '#ffffff'),
                            opacity: isDark ? 0.45 : 0.25,
                        }}
                    />
                </>
            )}

            <SeasonalEffects config={config} />
            <ClickEffects config={config} />

            {/* Header / Search Bar con Adaptación Translúcida Dinámica según el Tema */}
            <header
                className={`sticky top-0 z-40 backdrop-blur-md border-b p-3.5 sm:p-4 transition-colors relative ${
                    hasCustomBgColor
                        ? ''
                        : 'bg-white/85 dark:bg-zinc-950/85 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-gray-100'
                }`}
                style={
                    hasCustomBgColor
                        ? {
                              backgroundColor: headerBgColor,
                              borderColor: headerBorderColor,
                              color: textColor,
                          }
                        : undefined
                }
            >
                <div className="max-w-7xl mx-auto flex gap-3 sm:gap-4 items-center">
                    {/* Navigation Controls con contraste permanente garantizado */}
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
                            className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                                hasCustomBgColor
                                    ? ''
                                    : 'text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 bg-black/5 dark:bg-white/10'
                            }`}
                            style={
                                hasCustomBgColor
                                    ? {
                                          color: textColor,
                                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                      }
                                    : undefined
                            }
                            title={searchQuery ? "Ir al Inicio" : "Atrás"}
                        >
                            {searchQuery ? (
                                <FiHome size={20} className="sm:w-[22px] sm:h-[22px]" />
                            ) : (
                                <FiArrowLeft size={20} className="sm:w-[22px] sm:h-[22px]" />
                            )}
                        </button>
                    )}

                    <div
                        className={`flex-1 flex items-center gap-2 rounded-full px-4 py-2 border transition-colors ${
                            hasCustomBgColor
                                ? ''
                                : 'bg-gray-100 dark:bg-zinc-900 border-transparent focus-within:border-blue-500/60'
                        }`}
                        style={
                            hasCustomBgColor
                                ? {
                                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                                  }
                                : undefined
                        }
                    >
                        <FiSearch
                            className={`shrink-0 ${hasCustomBgColor ? 'opacity-60' : 'text-gray-400 dark:text-gray-500'}`}
                            style={hasCustomBgColor ? { color: textColor } : undefined}
                        />
                        <input
                            type="text"
                            placeholder="Buscar álbumes y fotos..."
                            className={`bg-transparent border-none outline-none w-full text-sm ${
                                hasCustomBgColor
                                    ? 'placeholder:opacity-50'
                                    : 'text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400'
                            }`}
                            style={hasCustomBgColor ? { color: textColor } : undefined}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Simple Stats or Branding */}
                    <div
                        className={`hidden sm:block text-sm font-semibold truncate max-w-xs ${
                            hasCustomBgColor
                                ? 'opacity-80'
                                : 'text-gray-700 dark:text-gray-300'
                        }`}
                        style={hasCustomBgColor ? { color: textColor } : undefined}
                    >
                        {rootAlbum.name}
                    </div>
                </div>

                {/* Breadcrumbs for browsing con contraste adaptado al tema */}
                {!isSearching && (
                    <div className="max-w-7xl mx-auto mt-2 px-1 flex gap-2 overflow-x-auto text-xs sm:text-sm no-scrollbar">
                        {activePath.map((album, idx) => (
                            <div key={album.id} className="flex items-center whitespace-nowrap">
                                {idx > 0 && (
                                    <span className={`mx-2 ${hasCustomBgColor ? 'opacity-40' : 'text-gray-400 dark:text-gray-600'}`}>
                                        /
                                    </span>
                                )}
                                <button
                                    onClick={() => handleBreadcrumb(idx)}
                                    className={`hover:underline transition-colors ${
                                        idx === activePath.length - 1
                                            ? hasCustomBgColor ? 'font-bold' : 'font-bold text-gray-900 dark:text-white'
                                            : hasCustomBgColor ? 'opacity-70' : 'text-gray-600 dark:text-gray-300'
                                    }`}
                                    style={hasCustomBgColor ? { color: textColor } : undefined}
                                >
                                    {album.name}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6 animate-in fade-in duration-300">
                {/* --- STOREFRONT BUILDER INJECTION --- */}
                {!isSearching && activePath.length === 1 && storefront?.enabled && storefront.blocks.length > 0 ? (
                    <StorefrontView storefront={storefront} appConfig={config} />
                ) : (
                    <>
                        {/* Albums Grid */}
                        {visibleAlbums.length > 0 && (
                            <section>
                                <h2
                                    className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                                        hasCustomBgColor ? '' : 'text-gray-900 dark:text-gray-100'
                                    }`}
                                    style={hasCustomBgColor ? { color: textColor } : undefined}
                                >
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
                                <h2
                                    className={`text-xl font-bold mb-4 mt-8 ${
                                        hasCustomBgColor ? '' : 'text-gray-900 dark:text-gray-100'
                                    }`}
                                    style={hasCustomBgColor ? { color: textColor } : undefined}
                                >
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
                                                config={config}
                                                priority={idx < 2}
                                                onClick={() => openLightbox(idx)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {visibleAlbums.length === 0 && visiblePhotos.length === 0 && (
                            <div
                                className={`text-center py-12 ${
                                    hasCustomBgColor ? 'opacity-60' : 'text-gray-500 dark:text-gray-400'
                                }`}
                                style={hasCustomBgColor ? { color: textColor } : undefined}
                            >
                                <p>No se encontró contenido.</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Footer con Redes Sociales y Marca Oficial (Compacto & Armónico) */}
            <footer
                className={`mt-8 py-6 border-t text-center relative z-10 transition-colors ${
                    hasCustomBgColor
                        ? ''
                        : 'border-gray-200/80 dark:border-zinc-800/80 text-gray-900 dark:text-gray-100'
                }`}
                style={
                    hasCustomBgColor
                        ? {
                              borderColor: headerBorderColor,
                              color: textColor,
                          }
                        : undefined
                }
            >
                <div className="max-w-4xl mx-auto px-4 space-y-3">
                    <h3
                        className={`text-sm font-bold tracking-tight ${
                            hasCustomBgColor ? '' : 'text-gray-900 dark:text-gray-100'
                        }`}
                        style={hasCustomBgColor ? { color: textColor } : undefined}
                    >
                        {config.siteTitle}
                    </h3>
                    {config.siteDescription && (
                        <p
                            className={`text-xs max-w-md mx-auto line-clamp-2 ${
                                hasCustomBgColor ? 'opacity-75' : 'text-gray-500 dark:text-gray-400'
                            }`}
                            style={hasCustomBgColor ? { color: textColor } : undefined}
                        >
                            {config.siteDescription}
                        </p>
                    )}

                    {/* Botones / Enlaces a Redes Sociales */}
                    {hasSocialLinks && (
                        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                            {config.socialLinks?.instagram && (
                                <a
                                    href={formatSocialUrl(config.socialLinks.instagram, 'instagram')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white dark:bg-zinc-900 dark:hover:from-purple-500 dark:hover:to-pink-500 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-800 transition-all shadow-sm group"
                                >
                                    <FaInstagram className="text-xs text-pink-500 group-hover:text-white transition-colors" />
                                    <span>Instagram</span>
                                </a>
                            )}
                            {config.socialLinks?.tiktok && (
                                <a
                                    href={formatSocialUrl(config.socialLinks.tiktok, 'tiktok')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-black hover:text-white dark:bg-zinc-900 dark:hover:bg-black text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-800 transition-all shadow-sm group"
                                >
                                    <FaTiktok className="text-xs text-rose-500 group-hover:text-white transition-colors" />
                                    <span>TikTok</span>
                                </a>
                            )}
                            {config.socialLinks?.facebook && (
                                <a
                                    href={formatSocialUrl(config.socialLinks.facebook, 'facebook')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-[#1877F2] hover:text-white dark:bg-zinc-900 dark:hover:bg-[#1877F2] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-800 transition-all shadow-sm group"
                                >
                                    <FaFacebook className="text-xs text-blue-600 group-hover:text-white transition-colors" />
                                    <span>Facebook</span>
                                </a>
                            )}
                            {config.whatsappNumber && (
                                <a
                                    href={`https://wa.me/${config.whatsappNumber.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        trackWhatsappClick(currentPathStr, 'Pie de página');
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-[#25D366] hover:text-white dark:bg-zinc-900 dark:hover:bg-[#25D366] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-800 transition-all shadow-sm group"
                                >
                                    <FaWhatsapp className="text-xs text-emerald-500 group-hover:text-white transition-colors" />
                                    <span>WhatsApp</span>
                                </a>
                            )}
                        </div>
                    )}

                    <div
                        className={`pt-2 text-[11px] ${
                            hasCustomBgColor ? 'opacity-50' : 'text-gray-400 dark:text-gray-500'
                        }`}
                        style={hasCustomBgColor ? { color: textColor } : undefined}
                    >
                        © {new Date().getFullYear()} {config.siteTitle}. Todos los derechos reservados.
                    </div>
                </div>
            </footer>

            {/* Lightbox Overlay con carga progresiva y descarga directa desde Cloudflare R2 */}
            <Lightbox
                open={lightboxPhotoIndex >= 0}
                close={() => setLightboxPhotoIndex(-1)}
                index={lightboxPhotoIndex}
                slides={visiblePhotos.map(p => {
                    const w = p.width || 1080;
                    const h = p.height || 1080;
                    const rawPhotoUrl = p.fullLink || p.thumbnailLink || '';
                    const baseName = (p.name || 'foto').replace(/\.[a-zA-Z0-9]{3,4}$/, '');
                    const cleanFilename = `${baseName.replace(/[/\\?%*:|"<>]/g, '_')}.jpg`;
                    return {
                        src: rawPhotoUrl,
                        alt: p.name,
                        width: w,
                        height: h,
                        download: config.allowPhotoDownload
                            ? {
                                  url: rawPhotoUrl,
                                  filename: cleanFilename,
                              }
                            : undefined,
                        srcSet: [
                            {
                                src: p.thumbnailLink || '',
                                width: 800,
                                height: Math.round((800 * h) / w),
                            },
                            {
                                src: rawPhotoUrl,
                                width: 1600,
                                height: h,
                            },
                        ],
                    };
                })}
                plugins={plugins}
                zoom={{ maxZoomPixelRatio: 3 }}
                download={
                    config.allowPhotoDownload
                        ? {
                              download: async ({ slide, saveAs }) => {
                                  const rawUrl =
                                      (typeof slide.download === 'object' ? slide.download.url : slide.src) || '';
                                  const rawFilename =
                                      (typeof slide.download === 'object' ? slide.download.filename : '') ||
                                      'foto.jpg';
                                  const baseName = rawFilename.replace(/\.[a-zA-Z0-9]{3,4}$/, '');
                                  const cleanFilename = `${baseName.replace(/[/\\?%*:|"<>]/g, '_')}.jpg`;
                                  const downloadEndpoint = `/api/download?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(cleanFilename)}`;

                                  try {
                                      // 1. Descarga vía endpoint mismo origen (CORS-free) y saveAs directo
                                      const res = await fetch(downloadEndpoint);
                                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                      const blob = await res.blob();
                                      saveAs(blob, cleanFilename);
                                  } catch (err) {
                                      // 2. Fallback nativo: clic automático a endpoint con Content-Disposition: attachment
                                      const link = document.createElement('a');
                                      link.href = downloadEndpoint;
                                      link.download = cleanFilename;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                  }
                              },
                          }
                        : undefined
                }
                controller={{ closeOnBackdropClick: true }}
            />

            {/* Botón flotante de WhatsApp con tracking de pedidos */}
            {config.whatsappNumber && (
                <a
                    href={`https://wa.me/${config.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hola, estoy viendo su catálogo en línea (${currentAlbum?.name || 'Catálogo Principal'}). Quisiera consultar sobre sus productos.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                        trackWhatsappClick(currentPathStr, currentAlbum?.name || 'Catálogo Principal');
                    }}
                    className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 sm:p-4 rounded-full shadow-2xl transition transform hover:scale-110 active:scale-95 flex items-center justify-center text-2xl sm:text-3xl"
                    title="Hacer pedido por WhatsApp"
                    aria-label="Contactar por WhatsApp"
                >
                    <FaWhatsapp />
                </a>
            )}
        </div>
    );
}
