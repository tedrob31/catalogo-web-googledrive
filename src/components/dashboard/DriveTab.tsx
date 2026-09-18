'use client';

import Image from 'next/image';
import {
  FaGoogle,
  FaCheckCircle,
  FaSearch,
  FaFolder,
  FaFolderOpen,
  FaImages,
  FaUndo,
  FaEdit,
  FaCloudUploadAlt,
} from 'react-icons/fa';

export interface AlbumItem {
  id: string;
  name: string;
  slug: string;
  path?: string;
  photosCount?: number;
  firstPhotoThumb?: string;
  coverPhotoUrl?: string;
}

interface DriveTabProps {
  integration: any;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchingFolders: boolean;
  folders: Array<{ id: string; name: string }>;
  selectedCatalogFolder: { id: string; name: string } | null;
  setSelectedCatalogFolder: (f: { id: string; name: string }) => void;
  selectedCoverFolder: { id: string; name: string } | null;
  setSelectedCoverFolder: (f: { id: string; name: string } | null) => void;
  savingFolders: boolean;
  onSearchFolders: () => void;
  onSaveFolders: () => void;
  albums: AlbumItem[];
  folderCovers: Record<string, string>;
  onOpenCoverSelector: (albumId: string) => void;
  onResetCover: (albumId: string) => void;
}

export default function DriveTab({
  integration,
  searchQuery,
  setSearchQuery,
  searchingFolders,
  folders,
  selectedCatalogFolder,
  setSelectedCatalogFolder,
  selectedCoverFolder,
  setSelectedCoverFolder,
  savingFolders,
  onSearchFolders,
  onSaveFolders,
  albums = [],
  folderCovers = {},
  onOpenCoverSelector,
  onResetCover,
}: DriveTabProps) {
  return (
    <div className="space-y-6">
      {/* PASO 1: VINCULAR CUENTA DE GOOGLE DRIVE */}
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
            1
          </span>
          <span>Vincular Cuenta de Google Drive</span>
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Autoriza a c4talogo.com a leer tus carpetas y fotos de Google Drive en modo de solo lectura.
        </p>

        {integration?.is_connected ? (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <FaCheckCircle className="text-emerald-400 text-sm" />
              <span>Conectado como <strong className="text-white">{integration.google_email}</strong></span>
            </div>
            <a
              href="/api/auth/google"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium"
            >
              Reconectar cuenta
            </a>
          </div>
        ) : (
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-900 hover:bg-gray-100 font-semibold text-xs rounded-xl transition shadow-md"
          >
            <FaGoogle className="text-red-500" />
            <span>Conectar con Google Drive</span>
          </a>
        )}
      </div>

      {/* PASO 2: SELECCIONAR CARPETAS */}
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
            2
          </span>
          <span>Seleccionar Carpetas de Catálogo y Portadas</span>
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Busca en tu Google Drive la carpeta principal donde tienes organizados tus álbumes o fotos.
        </p>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
            <input
              type="text"
              placeholder="Escribe el nombre de tu carpeta en Drive (ej. Catálogo 2026)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchFolders()}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
          <button
            onClick={onSearchFolders}
            disabled={searchingFolders}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            {searchingFolders ? 'Buscando...' : 'Buscar en Drive'}
          </button>
        </div>

        {folders.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto mb-6 pr-1">
            <div className="text-xs font-medium text-slate-400 mb-1">Resultados de búsqueda en Google Drive:</div>
            {folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FaFolder className="text-amber-400 shrink-0" />
                  <span className="truncate text-white font-medium">{f.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedCatalogFolder(f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      selectedCatalogFolder?.id === f.id
                        ? 'bg-amber-500 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-slate-300'
                    }`}
                  >
                    {selectedCatalogFolder?.id === f.id ? 'Catálogo Seleccionado' : 'Elegir como Catálogo'}
                  </button>
                  <button
                    onClick={() => setSelectedCoverFolder(f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      selectedCoverFolder?.id === f.id
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-slate-300'
                    }`}
                  >
                    {selectedCoverFolder?.id === f.id ? 'Portadas Seleccionadas' : 'Elegir Portadas'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Carpeta Principal del Catálogo:</label>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs flex items-center justify-between">
              <span className="font-semibold text-amber-400 truncate">
                {selectedCatalogFolder ? selectedCatalogFolder.name : 'Ninguna seleccionada'}
              </span>
              {selectedCatalogFolder && (
                <span className="text-[10px] font-mono text-slate-500">{selectedCatalogFolder.id.slice(0, 8)}...</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Carpeta de Portadas (Opcional):</label>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs flex items-center justify-between">
              <span className="font-semibold text-rose-400 truncate">
                {selectedCoverFolder ? selectedCoverFolder.name : 'Ninguna (usará primera foto del álbum)'}
              </span>
              {selectedCoverFolder && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">{selectedCoverFolder.id.slice(0, 8)}...</span>
                  <button
                    onClick={() => setSelectedCoverFolder(null)}
                    className="text-[10px] text-red-400 hover:underline cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onSaveFolders}
          disabled={savingFolders || !selectedCatalogFolder}
          className="mt-6 w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow"
        >
          {savingFolders ? 'Guardando configuración...' : 'Guardar Selección de Carpetas'}
        </button>
      </div>

      {/* PASO 3: ÁLBUMES Y PORTADAS ENCONTRADAS (SECCIÓN RECUPERADA) */}
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              <span>Álbumes Encontrados y Asignación de Portadas</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Aquí aparecen las carpetas detectadas en tu catálogo de Google Drive tras sincronizar. Puedes personalizar la foto de portada de cada una.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 font-mono border border-white/5 self-start sm:self-auto">
            {albums.length} álbumes
          </span>
        </div>

        {albums.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
            <FaFolderOpen className="text-3xl text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-300 font-medium">Aún no se han cargado álbumes</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Selecciona tu carpeta principal arriba y presiona el botón <strong>&quot;Sincronizar Catálogo&quot;</strong> para importar la estructura de carpetas y fotos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[550px] overflow-y-auto pr-1">
            {albums.map((album) => {
              const customCover = folderCovers[album.id];
              const displayCover = customCover || album.coverPhotoUrl || album.firstPhotoThumb;

              return (
                <div
                  key={album.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition"
                >
                  {/* Info del Álbum */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 flex items-center justify-center">
                      {displayCover ? (
                        <Image
                          src={displayCover}
                          alt={album.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <FaImages className="text-slate-600 text-lg" />
                      )}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {album.name}
                        </span>
                        {customCover ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium border border-amber-500/30">
                            Personalizada
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-medium">
                            1ra Foto
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-500">{album.path || album.slug}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-medium">
                          {album.photosCount ?? 0} fotos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Portada */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => onOpenCoverSelector(album.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <FaEdit className="text-[10px]" />
                      <span>{customCover ? 'Cambiar Portada' : 'Elegir Portada'}</span>
                    </button>

                    {customCover && (
                      <button
                        onClick={() => onResetCover(album.id)}
                        title="Restablecer a la primera foto del álbum"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <FaUndo className="text-[10px]" />
                        <span>Por defecto</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
