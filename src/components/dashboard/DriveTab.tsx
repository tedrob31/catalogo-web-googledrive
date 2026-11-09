'use client';

import { useState, useMemo, useEffect } from 'react';
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
  FaChevronRight,
  FaChevronDown,
  FaSave,
  FaTimesCircle,
  FaLayerGroup,
  FaExpandArrowsAlt,
  FaCompressArrowsAlt,
  FaUnlink,
} from 'react-icons/fa';

export interface AlbumItem {
  id: string;
  name: string;
  slug: string;
  path?: string;
  parent_id?: string | null;
  photosCount?: number;
  firstPhotoThumb?: string;
  coverPhotoUrl?: string;
  cover_photo_r2_key?: string | null;
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
  savedFolderCovers: Record<string, string>;
  hasPendingChanges: boolean;
  pendingCount: number;
  onSaveCoverChanges: () => Promise<void>;
  onDiscardCoverChanges: () => void;
  onResetCover: (albumId: string) => void;
  savingCovers: boolean;
  onOpenCoverSelector: (albumId: string) => void;
  onDisconnectDrive?: () => void;
  disconnectingDrive?: boolean;
}

// Estructura de Nodo para el Árbol Jerárquico
interface TreeNode extends AlbumItem {
  children: TreeNode[];
  level: number;
  totalPhotosRecursive: number;
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
  savedFolderCovers = {},
  hasPendingChanges = false,
  pendingCount = 0,
  onSaveCoverChanges,
  onDiscardCoverChanges,
  onResetCover,
  savingCovers,
  onOpenCoverSelector,
  onDisconnectDrive,
  disconnectingDrive = false,
}: DriveTabProps) {
  // Estado local para búsqueda en el listado de álbumes encontrados
  const [albumFilter, setAlbumFilter] = useState('');

  // Estado de carpetas expandidas en el árbol (por ID)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  // 1. Construcción del Árbol Jerárquico de Álbumes
  const { rootNodes, allNodeIds } = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();
    const allIds = new Set<string>();

    albums.forEach((a) => {
      nodeMap.set(a.id, {
        ...a,
        children: [],
        level: 0,
        totalPhotosRecursive: a.photosCount || 0,
      });
      allIds.add(a.id);
    });

    const roots: TreeNode[] = [];

    nodeMap.forEach((node) => {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Función recursiva para calcular niveles y fotos totales
    function processNode(node: TreeNode, level: number): number {
      node.level = level;
      let sum = node.photosCount || 0;
      node.children.forEach((child) => {
        sum += processNode(child, level + 1);
      });
      node.totalPhotosRecursive = sum;
      return sum;
    }

    roots.forEach((r) => processNode(r, 0));

    return { rootNodes: roots, allNodeIds: allIds };
  }, [albums]);

  // Inicializar todas las carpetas como expandidas en la primera carga
  useEffect(() => {
    if (allNodeIds.size > 0 && expandedFolderIds.size === 0) {
      setExpandedFolderIds(new Set(allNodeIds));
    }
  }, [allNodeIds]);

  const toggleExpand = (id: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedFolderIds(new Set(allNodeIds));
  const collapseAll = () => setExpandedFolderIds(new Set());

  // 2. Álbumes filtrados por búsqueda rápida
  const searchResults = useMemo(() => {
    if (!albumFilter.trim()) return null;
    const q = albumFilter.toLowerCase();
    return albums.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.path && a.path.toLowerCase().includes(q)) ||
        a.slug.toLowerCase().includes(q)
    );
  }, [albums, albumFilter]);

  // Renderizador recursivo de cada fila en el árbol
  function renderTreeNode(node: TreeNode) {
    const isExpanded = expandedFolderIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const customCover = folderCovers[node.id];
    const isChanged = folderCovers[node.id] !== savedFolderCovers[node.id];
    const displayCover = customCover || node.coverPhotoUrl || node.firstPhotoThumb;

    return (
      <div key={node.id} className="flex flex-col">
        {/* Fila del Álbum */}
        <div
          className={`py-3 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl transition border ${
            isChanged
              ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
              : 'border-transparent hover:bg-zinc-800/40'
          }`}
          style={{ paddingLeft: `${Math.max(12, node.level * 24 + 12)}px` }}
        >
          {/* Lado Izquierdo: Toggle, Icono y Datos */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Botón Expandir/Colapsar si tiene hijos */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="w-6 h-6 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition shrink-0 cursor-pointer border border-zinc-700/50"
                title={isExpanded ? 'Colapsar subcarpetas' : 'Expandir subcarpetas'}
              >
                {isExpanded ? (
                  <FaChevronDown className="text-[10px]" />
                ) : (
                  <FaChevronRight className="text-[10px]" />
                )}
              </button>
            ) : (
              <div className="w-6 shrink-0" />
            )}

            {/* Miniatura de Portada */}
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shrink-0 flex items-center justify-center shadow-inner">
              {displayCover ? (
                <Image
                  src={displayCover}
                  alt={node.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <FaImages className="text-zinc-600 text-base" />
              )}
            </div>

            {/* Información del Álbum */}
            <div className="truncate min-w-0">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  isExpanded ? (
                    <FaFolderOpen className="text-amber-400 text-xs shrink-0" />
                  ) : (
                    <FaFolder className="text-amber-400 text-xs shrink-0" />
                  )
                ) : (
                  <FaFolder className="text-zinc-500 text-xs shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                  {node.name}
                </span>

                {/* Badge de Portada */}
                {customCover ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium border border-amber-500/30 shrink-0">
                    Personalizada
                  </span>
                ) : node.photosCount && node.photosCount > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium shrink-0 border border-zinc-700/50">
                    1ra Foto
                  </span>
                ) : null}

                {isChanged && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30 shrink-0 animate-pulse">
                    Sin guardar
                  </span>
                )}
              </div>

              <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5 truncate">
                <span className="font-mono text-zinc-500 truncate max-w-xs">{node.path || node.slug}</span>
                <span>•</span>
                <span className="text-zinc-300 font-medium shrink-0">
                  {node.photosCount || 0} fotos directas
                </span>
                {hasChildren && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400/90 font-medium shrink-0">
                      {node.children.length} subcarpetas ({node.totalPhotosRecursive} fotos total)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Acciones de Portada */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pl-9 sm:pl-0">
            <button
              type="button"
              onClick={() => onOpenCoverSelector(node.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/70 text-zinc-100 rounded-lg text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <FaEdit className="text-[10px]" />
              <span>{customCover ? 'Cambiar Portada' : 'Elegir Portada'}</span>
            </button>

            {customCover && (
              <button
                type="button"
                onClick={() => onResetCover(node.id)}
                title="Restablecer a la primera foto del álbum"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <FaUndo className="text-[10px]" />
                <span>Por defecto</span>
              </button>
            )}
          </div>
        </div>

        {/* Hijos Anidados (si está expandido) */}
        {hasChildren && isExpanded && (
          <div className="border-l border-zinc-800/80 ml-6 pl-2 my-0.5 space-y-1">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PASO 1: VINCULAR CUENTA DE GOOGLE DRIVE */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-sm">
        <h2 className="text-base font-bold text-zinc-100 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 text-amber-400 flex items-center justify-center text-xs font-mono font-bold shadow-sm">
            1
          </span>
          <span>Vincular Cuenta de Google Drive</span>
        </h2>
        <p className="text-xs text-zinc-400 mb-4">
          Autoriza a c4talogo.com a leer tus carpetas y fotos de Google Drive en modo de solo lectura. Puedes usar una cuenta de Google diferente a la de inicio de sesión.
        </p>

        {integration?.is_connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <FaCheckCircle className="text-emerald-400 text-sm shrink-0" />
              <span>
                Cuenta Drive vinculada: <strong className="text-white font-semibold">{integration.google_email}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/auth/google"
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-100 rounded-lg transition font-medium text-xs shadow-sm"
              >
                Cambiar cuenta
              </a>
              {onDisconnectDrive && (
                <button
                  type="button"
                  onClick={onDisconnectDrive}
                  disabled={disconnectingDrive}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-lg transition font-medium text-xs flex items-center gap-1.5 disabled:opacity-50"
                  title="Revocar acceso en los servidores de Google y desvincular cuenta"
                >
                  <FaUnlink className="text-xs" />
                  <span>{disconnectingDrive ? 'Desvinculando...' : 'Desvincular'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-900 hover:bg-white font-semibold text-xs rounded-xl transition shadow-sm"
          >
            <FaGoogle className="text-red-500" />
            <span>Conectar con Google Drive</span>
          </a>
        )}
      </div>

      {/* PASO 2: SELECCIONAR CARPETAS */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-sm shadow-sm">
        <h2 className="text-base font-bold text-zinc-100 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 text-amber-400 flex items-center justify-center text-xs font-mono font-bold shadow-sm">
            2
          </span>
          <span>Seleccionar Carpetas de Catálogo y Portadas</span>
        </h2>
        <p className="text-xs text-zinc-400 mb-4">
          Busca en tu Google Drive la carpeta principal donde tienes organizados tus álbumes o fotos.
        </p>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs" />
            <input
              type="text"
              placeholder="Escribe el nombre de tu carpeta en Drive (ej. Catálogo 2026)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchFolders()}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            />
          </div>
          <button
            onClick={onSearchFolders}
            disabled={searchingFolders}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs rounded-xl border border-zinc-700/70 transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {searchingFolders ? 'Buscando...' : 'Buscar en Drive'}
          </button>
        </div>

        {folders.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto mb-6 pr-1">
            <div className="text-xs font-medium text-zinc-400 mb-1">Resultados de búsqueda en Google Drive:</div>
            {folders.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/40 hover:bg-zinc-800/40 border border-zinc-800/60 transition text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FaFolder className="text-amber-400 shrink-0" />
                  <span className="truncate text-zinc-200 font-medium">{f.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedCatalogFolder(f)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      selectedCatalogFolder?.id === f.id
                        ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60'
                    }`}
                  >
                    {selectedCatalogFolder?.id === f.id ? 'Catálogo Seleccionado' : 'Elegir como Catálogo'}
                  </button>
                  <button
                    onClick={() => setSelectedCoverFolder(f)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                      selectedCoverFolder?.id === f.id
                        ? 'bg-rose-500 text-white font-semibold shadow-sm'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60'
                    }`}
                  >
                    {selectedCoverFolder?.id === f.id ? 'Portadas Seleccionadas' : 'Elegir Portadas'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">Carpeta Principal del Catálogo:</label>
            <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs flex items-center justify-between">
              <span className="font-semibold text-amber-400 truncate">
                {selectedCatalogFolder ? selectedCatalogFolder.name : 'Ninguna seleccionada'}
              </span>
              {selectedCatalogFolder && (
                <span className="text-[10px] font-mono text-zinc-500">{selectedCatalogFolder.id.slice(0, 8)}...</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1">Carpeta de Portadas (Opcional):</label>
            <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs flex items-center justify-between">
              <span className="font-semibold text-rose-400 truncate">
                {selectedCoverFolder ? selectedCoverFolder.name : 'Ninguna (usará primera foto del álbum)'}
              </span>
              {selectedCoverFolder && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">{selectedCoverFolder.id.slice(0, 8)}...</span>
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
          className="mt-6 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.99]"
        >
          {savingFolders ? 'Guardando configuración...' : 'Guardar Selección de Carpetas'}
        </button>
      </div>

      {/* PASO 3: NAVEGACIÓN JERÁRQUICA DE ÁLBUMES Y ASIGNACIÓN DE PORTADAS */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 relative backdrop-blur-sm shadow-sm">
        {/* Banner Sticky de Cambios Pendientes */}
        {hasPendingChanges && (
          <div className="sticky top-20 z-20 mb-6 p-4 rounded-xl bg-zinc-900/95 border border-amber-500/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                {pendingCount}
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <span>Tienes {pendingCount} cambio(s) de portada pendientes</span>
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Guarda tus cambios cuando termines para actualizar tu tienda y purgar el CDN de una sola vez.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onDiscardCoverChanges}
                disabled={savingCovers}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={onSaveCoverChanges}
                disabled={savingCovers}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <FaSave className="text-xs" />
                <span>{savingCovers ? 'Guardando...' : 'Guardar Cambios de Portadas'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Encabezado del Paso 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 text-amber-400 flex items-center justify-center text-xs font-mono font-bold shadow-sm">
                3
              </span>
              <span>Álbumes Encontrados y Asignación de Portadas</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Explora las carpetas por jerarquía o usa el buscador rápido para personalizar las portadas de cualquier categoría o producto.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 font-mono border border-zinc-700/60">
              {albums.length} carpetas
            </span>

            {/* BOTÓN PRINCIPAL EN CABECERA: Siempre visible */}
            {hasPendingChanges ? (
              <button
                type="button"
                onClick={onSaveCoverChanges}
                disabled={savingCovers}
                className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                title="Guardar todos los cambios de portadas en la base de datos"
              >
                <FaSave className="text-xs" />
                <span>{savingCovers ? 'Guardando...' : `Guardar Cambios (${pendingCount})`}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <FaCheckCircle className="text-xs" />
                <span>Portadas al día</span>
              </div>
            )}
          </div>
        </div>

        {/* Mini Buscador y Acciones de Expansión */}
        {albums.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4 pb-4 border-b border-zinc-800/80">
            {/* Mini Buscador de Álbum */}
            <div className="relative flex-1 w-full">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs" />
              <input
                type="text"
                placeholder="🔍 Filtrar álbum por nombre o subcarpeta (ej: Blusas, Jeans, Zapatillas...)"
                value={albumFilter}
                onChange={(e) => setAlbumFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
              />
              {albumFilter && (
                <button
                  type="button"
                  onClick={() => setAlbumFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  <FaTimesCircle />
                </button>
              )}
            </div>

            {/* Acciones de Árbol y Botones de Guardado Rápido */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {!albumFilter && (
                <>
                  <button
                    type="button"
                    onClick={expandAll}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 rounded-lg text-xs font-medium transition cursor-pointer"
                    title="Expandir todas las carpetas"
                  >
                    <FaExpandArrowsAlt className="text-[10px]" />
                    <span>Expandir todo</span>
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 rounded-lg text-xs font-medium transition cursor-pointer"
                    title="Colapsar todas las carpetas"
                  >
                    <FaCompressArrowsAlt className="text-[10px]" />
                    <span>Colapsar todo</span>
                  </button>
                </>
              )}

              {hasPendingChanges && (
                <>
                  <button
                    type="button"
                    onClick={onDiscardCoverChanges}
                    disabled={savingCovers}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                    title="Descartar cambios no guardados"
                  >
                    <FaTimesCircle className="text-[10px]" />
                    <span>Descartar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onSaveCoverChanges}
                    disabled={savingCovers}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer"
                  >
                    <FaSave className="text-[10px]" />
                    <span>{savingCovers ? 'Guardando...' : `Guardar (${pendingCount})`}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Contenido: Si no hay álbumes */}
        {albums.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30">
            <FaFolderOpen className="text-3xl text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-300 font-medium">Aún no se han cargado álbumes</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Selecciona tu carpeta principal arriba y presiona el botón <strong>&quot;Sincronizar Catálogo&quot;</strong> para importar la estructura de carpetas y fotos.
            </p>
          </div>
        ) : searchResults ? (
          /* VISTA 1: Resultados del Buscador Rápido */
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            <div className="text-xs text-zinc-400 mb-2">
              Coincidencias encontradas: <strong className="text-white">{searchResults.length}</strong>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No hay álbumes que coincidan con &quot;{albumFilter}&quot;.
              </div>
            ) : (
              searchResults.map((album) => {
                const customCover = folderCovers[album.id];
                const isChanged = folderCovers[album.id] !== savedFolderCovers[album.id];
                const displayCover = customCover || album.coverPhotoUrl || album.firstPhotoThumb;

                return (
                  <div
                    key={album.id}
                    className={`py-3 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl transition border ${
                      isChanged
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                        : 'bg-zinc-950/40 hover:bg-zinc-800/40 border-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shrink-0 flex items-center justify-center">
                        {displayCover ? (
                          <Image
                            src={displayCover}
                            alt={album.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <FaImages className="text-zinc-600 text-base" />
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-100 truncate">
                            {album.name}
                          </span>
                          {customCover ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium border border-amber-500/30">
                              Personalizada
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium border border-zinc-700/50">
                              1ra Foto
                            </span>
                          )}

                          {isChanged && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30 shrink-0 animate-pulse">
                              Sin guardar
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-amber-400/80">{album.path || album.slug}</span>
                          <span>•</span>
                          <span className="text-zinc-300 font-medium">
                            {album.photosCount ?? 0} fotos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => onOpenCoverSelector(album.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-100 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                      >
                        <FaEdit className="text-[10px]" />
                        <span>{customCover ? 'Cambiar Portada' : 'Elegir Portada'}</span>
                      </button>

                      {customCover && (
                        <button
                          type="button"
                          onClick={() => onResetCover(album.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
                        >
                          <FaUndo className="text-[10px]" />
                          <span>Por defecto</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* VISTA 2: Navegación por Árbol Jerárquico de Carpetas */
          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {rootNodes.map((root) => renderTreeNode(root))}
          </div>
        )}

        {/* Botón flotante al pie si hay cambios */}
        {hasPendingChanges && (
          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-amber-400 font-medium flex items-center gap-2">
              <FaLayerGroup />
              <span>{pendingCount} cambio(s) de portada sin guardar en la base de datos</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onDiscardCoverChanges}
                disabled={savingCovers}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Descartar Cambios
              </button>
              <button
                type="button"
                onClick={onSaveCoverChanges}
                disabled={savingCovers}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <FaSave />
                <span>{savingCovers ? 'Guardando en Supabase...' : 'Guardar Cambios de Portadas'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
