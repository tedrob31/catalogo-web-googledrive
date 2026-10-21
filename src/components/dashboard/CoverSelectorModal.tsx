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

  // Memoizar lista de ítems para evitar recrear objetos en cada render
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

  // Filtrado optimizado con memoization
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Fondo oscuro optimizado sin backdrop-blur pesado para scroll fluido a 60-120fps */}
      <div 
        className="fixed inset-0 bg-black/85 transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FaImage className="text-amber-400" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier imagen de tu biblioteca para seleccionarla.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <FaTimes />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
          <input
            type="text"
            placeholder="Buscar por nombre de archivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Image Grid con aceleración de hardware y content-visibility para scroll ultrarrápido */}
        <div className="overflow-y-auto flex-1 pr-1 overscroll-contain [will-change:scroll-position]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              No se encontraron imágenes disponibles. Sube fotos a la carpeta de Portadas o sincroniza tu catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id || item.url}
                  onClick={() => {
                    onSelect(item.url, item.r2_key);
                    onClose();
                  }}
                  className="cursor-pointer border border-white/10 hover:border-amber-400 active:scale-95 rounded-xl overflow-hidden group relative bg-slate-800 transition-colors [content-visibility:auto] [contain-intrinsic-size:180px]"
                >
                  <div className="relative aspect-square w-full bg-slate-950">
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
                  <div className="p-2 bg-slate-900 border-t border-white/5">
                    <p className="text-[11px] truncate text-slate-200 font-medium group-hover:text-amber-400 transition-colors" title={item.name}>
                      {item.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
