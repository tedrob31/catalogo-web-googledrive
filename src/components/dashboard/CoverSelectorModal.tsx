'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { FaSearch, FaTimes, FaImage } from 'react-icons/fa';

interface CoverSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, r2Key?: string) => void;
  title?: string;
  availableCovers: string[];
  detailedPhotos?: Array<{
    id: string;
    name: string;
    r2_key: string;
    url: string;
    thumbnailUrl?: string;
  }>;
}

export default function CoverSelectorModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Seleccionar Portada',
  availableCovers = [],
  detailedPhotos = [],
}: CoverSelectorModalProps) {
  const [search, setSearch] = useState('');

  // Memoize the item list so objects are not rebuilt on every render
  const items = useMemo(() => {
    return detailedPhotos.length > 0
      ? detailedPhotos
      : availableCovers.map((url, idx) => ({
          id: `cover_${idx}`,
          name: url.split('/').pop()?.split('?')[0] || `Foto ${idx + 1}`,
          r2_key: '',
          url,
          thumbnailUrl: url,
        }));
  }, [detailedPhotos, availableCovers]);

  // Filtering kept memoized: the grid can hold hundreds of covers
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Scrim without a heavy backdrop-blur, so scrolling stays smooth */}
      <div
        className="fixed inset-0 bg-shell-bg/80 transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-selector-title"
        className="animate-in fade-in zoom-in-95 relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-shell-line bg-shell-surface p-5 duration-150"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-shell-line pb-3">
          <div>
            <h3
              id="cover-selector-title"
              className="flex items-center gap-2 text-[15px] font-semibold text-shell-ink"
            >
              <FaImage className="text-shell-accent" aria-hidden="true" />
              <span>{title}</span>
            </h3>
            <p className="mt-0.5 text-[12px] text-shell-muted">
              Haz clic en cualquier imagen de tu biblioteca para seleccionarla.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector de portadas"
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-shell-muted transition hover:bg-shell-raised hover:text-shell-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <FaSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-shell-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Buscar por nombre de archivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-shell-line-strong bg-shell-raised py-2 pl-9 pr-3 text-[12.5px] text-shell-ink placeholder:text-shell-muted transition focus:outline-none focus:ring-2 focus:ring-shell-accent/60"
          />
        </div>

        {/* Image grid, kept with content-visibility for fast scrolling */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 [will-change:scroll-position]">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-[12px] text-shell-muted">
              No se encontraron imágenes disponibles. Sube fotos a la carpeta de Portadas o sincroniza tu catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id || item.url}
                  onClick={() => {
                    onSelect(item.url, item.r2_key);
                    onClose();
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-md border border-shell-line bg-shell-raised transition-colors hover:border-shell-accent active:scale-95 [content-visibility:auto] [contain-intrinsic-size:180px]"
                >
                  <div className="relative aspect-square w-full bg-shell-bg">
                    <Image
                      src={item.thumbnailUrl || item.url}
                      alt={item.name}
                      fill
                      unoptimized
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
                      className="object-cover"
                    />
                  </div>
                  <div className="border-t border-shell-line bg-shell-surface p-2">
                    <p
                      className="truncate text-[11px] font-medium text-shell-ink-soft transition-colors group-hover:text-shell-accent"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex justify-end border-t border-shell-line pt-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-shell-line bg-shell-raised px-3 py-1.5 text-[12px] font-semibold text-shell-ink-soft transition hover:border-shell-line-strong hover:text-shell-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
