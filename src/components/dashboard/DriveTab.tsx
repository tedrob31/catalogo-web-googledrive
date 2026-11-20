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

/** Section heading: uppercase 12px title plus one short sentence of intent. */
function Section({
  id,
  title,
  note,
  index,
  state,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  /** Si viene, la sección se dibuja como paso numerado de la puesta en marcha. */
  index?: number;
  state?: 'done' | 'pending';
  children: React.ReactNode;
}) {
  // Sin `index` es una sección comun; con `index` es un paso, y se dibuja distinto a proposito:
  // los cuatro pasos son la puesta en marcha y antes se leian todos iguales, sin avance visible.
  if (index === undefined) {
    return (
      <section aria-labelledby={id} className="mb-8">
        <h2
          id={id}
          className="border-b border-shell-line pb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted"
        >
          {title}
        </h2>
        {note && (
          <p className="mb-1 mt-2 max-w-[66ch] text-[12.5px] leading-relaxed text-shell-ink-soft">
            {note}
          </p>
        )}
        {children}
      </section>
    );
  }

  const done = state === 'done';

  return (
    <section aria-labelledby={id} className="mb-6 border-t border-shell-line pt-4 first:border-t-0">
      <div className="mb-1.5 flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11.5px] font-bold ${
            done
              ? 'border-shell-accent bg-shell-accent text-shell-accent-ink'
              : 'border-shell-line-strong text-shell-muted'
          }`}
        >
          {done ? '✓' : index}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-[14px] font-semibold text-shell-ink">
            {title}
          </h2>
          {note && (
            <p className="mt-0.5 max-w-[66ch] text-[12.5px] leading-relaxed text-shell-muted">
              {note}
            </p>
          )}
        </div>
        {state === 'done' && (
          <span className="shrink-0 rounded border border-shell-accent/40 px-1.5 py-0.5 text-[10px] font-semibold text-shell-accent">
            listo
          </span>
        )}
        {state === 'pending' && (
          <span className="shrink-0 rounded border border-shell-line-strong px-1.5 py-0.5 text-[10px] font-semibold text-shell-warn">
            pendiente
          </span>
        )}
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}

/** Label / control row: the density unit of this panel. */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-shell-line py-3 last:border-b-0 md:grid-cols-[200px_1fr] md:items-center md:gap-4">
      <div className="text-[13px] text-shell-ink-soft">
        {label}
        {hint && <small className="mt-0.5 block text-[11.5px] text-shell-muted">{hint}</small>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13.5px]">{children}</div>
    </div>
  );
}

const btn =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1 text-[12.5px] font-semibold text-shell-ink transition-colors hover:bg-shell-surface disabled:cursor-not-allowed disabled:opacity-50';

const btnPrimary =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-shell-accent bg-shell-accent px-3 py-1.5 text-[12.5px] font-semibold text-shell-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

const btnQuiet =
  'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-shell-muted transition-colors hover:text-shell-danger disabled:cursor-not-allowed disabled:opacity-50';

const inputCls =
  'w-full rounded-md border border-shell-line-strong bg-shell-raised py-1.5 pl-7 pr-8 text-[13px] text-shell-ink placeholder:text-shell-muted focus:outline-none focus:ring-2 focus:ring-shell-accent/60';

const tagBase =
  'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-none';
const tagOk = `${tagBase} border-shell-accent/40 bg-shell-accent/10 text-shell-accent`;
const tagWarn = `${tagBase} border-shell-warn/40 bg-shell-warn/10 text-shell-warn`;
const tagDanger = `${tagBase} border-shell-danger/40 bg-shell-danger/10 text-shell-danger`;
const tagOff = `${tagBase} border-shell-line-strong bg-shell-raised text-shell-muted`;

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

  // Inicializar las carpetas raíz expandidas para navegación instantánea y fluida (evita sobrecargar el DOM)
  useEffect(() => {
    if (rootNodes.length > 0 && expandedFolderIds.size === 0) {
      setExpandedFolderIds(new Set(rootNodes.map((r) => r.id)));
    }
  }, [rootNodes]);

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
          className={`flex flex-col gap-2 border-b border-shell-line px-2 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
            isChanged ? 'bg-shell-raised' : 'hover:bg-shell-surface'
          }`}
          style={{ paddingLeft: `${node.level * 18 + 8}px` }}
        >
          {/* Lado Izquierdo: Toggle, Icono y Datos */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {/* Botón Expandir/Colapsar si tiene hijos */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Colapsar subcarpetas' : 'Expandir subcarpetas'}
                title={isExpanded ? 'Colapsar subcarpetas' : 'Expandir subcarpetas'}
                className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-shell-line-strong bg-shell-raised text-shell-muted transition-colors hover:text-shell-ink focus:outline-none focus:ring-2 focus:ring-shell-accent/60"
              >
                {isExpanded ? (
                  <FaChevronDown className="text-[9px]" aria-hidden />
                ) : (
                  <FaChevronRight className="text-[9px]" aria-hidden />
                )}
              </button>
            ) : (
              <div className="w-5 shrink-0" />
            )}

            {/* Miniatura de Portada */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-shell-line-strong bg-shell-bg">
              {displayCover ? (
                <Image
                  src={displayCover}
                  alt={node.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <FaImages className="text-[13px] text-shell-muted" aria-hidden />
              )}
            </div>

            {/* Información del Álbum */}
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  isExpanded ? (
                    <FaFolderOpen className="shrink-0 text-[11px] text-shell-accent" aria-hidden />
                  ) : (
                    <FaFolder className="shrink-0 text-[11px] text-shell-accent" aria-hidden />
                  )
                ) : (
                  <FaFolder className="shrink-0 text-[11px] text-shell-muted" aria-hidden />
                )}
                <span className="truncate text-[13px] font-semibold text-shell-ink">
                  {node.name}
                </span>

                {/* Badge de Portada */}
                {customCover ? (
                  <span className={tagWarn}>Personalizada</span>
                ) : node.photosCount && node.photosCount > 0 ? (
                  <span className={tagOff}>1ra Foto</span>
                ) : null}

                {isChanged && <span className={tagDanger}>Sin guardar</span>}
              </div>

              <div className="mt-0.5 flex items-center gap-2 truncate text-[11.5px] text-shell-muted">
                <span className="max-w-xs truncate">{node.path || node.slug}</span>
                <span aria-hidden>·</span>
                <span className="shrink-0 tabular-nums text-shell-ink-soft">
                  {node.photosCount || 0} fotos directas
                </span>
                {hasChildren && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="shrink-0 tabular-nums text-shell-accent">
                      {node.children.length} subcarpetas ({node.totalPhotosRecursive} fotos total)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Acciones de Portada */}
          <div className="flex shrink-0 items-center gap-1.5 self-end pl-8 sm:self-auto sm:pl-0">
            <button
              type="button"
              onClick={() => onOpenCoverSelector(node.id)}
              className={btn}
            >
              <FaEdit className="text-[9px]" aria-hidden />
              <span>{customCover ? 'Cambiar portada' : 'Elegir portada'}</span>
            </button>

            {customCover && (
              <button
                type="button"
                onClick={() => onResetCover(node.id)}
                title="Restablecer a la primera foto del álbum"
                className={btnQuiet}
              >
                <FaUndo className="text-[9px]" aria-hidden />
                <span>Por defecto</span>
              </button>
            )}
          </div>
        </div>

        {/* Hijos Anidados (si está expandido) */}
        {hasChildren && isExpanded && (
          <div className="ml-3 border-l border-shell-line pl-1">
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-shell-ink">Drive</h1>
      <p className="mb-7 mt-1 max-w-[66ch] text-[13px] leading-relaxed text-shell-muted">
        Dos carpetas y listo. Elegís la carpeta del catálogo y la de portadas: el catálogo se arma
        solo con la jerarquía que ya tenés en tu Drive, donde cada carpeta es un álbum y cada foto un
        ítem. No hay productos ni descripciones que cargar.
      </p>

      {/* ---------- 1. Conectar Google Drive ---------- */}
      <Section
        id="h-cuenta"
        index={1}
        title="Conectar Google Drive"
        state={integration?.is_connected ? 'done' : 'pending'}
        note="Damos acceso de solo lectura a tus carpetas y fotos: c4talogo nunca modifica nada en tu Drive."
      >
        {integration?.is_connected ? (
          <Row label="Cuenta conectada" hint="Podés usar una cuenta de Google distinta a la del login">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-shell-ink">
              <FaCheckCircle className="shrink-0 text-[11px] text-shell-accent" aria-hidden />
              <span className="truncate">{integration.google_email}</span>
            </span>
            <span className={tagOk}>Vinculada</span>
            <a href="/api/auth/google" className={btn}>
              Cambiar cuenta
            </a>
            {onDisconnectDrive && (
              <button
                type="button"
                onClick={onDisconnectDrive}
                disabled={disconnectingDrive}
                className={btnQuiet}
                title="Revocar acceso en los servidores de Google y desvincular cuenta"
              >
                <FaUnlink className="text-[9px]" aria-hidden />
                <span>{disconnectingDrive ? 'Desvinculando...' : 'Desvincular'}</span>
              </button>
            )}
          </Row>
        ) : (
          <Row label="Cuenta de Google" hint="Todavía no vinculaste ninguna cuenta">
            <a href="/api/auth/google" className={btnPrimary}>
              <FaGoogle className="text-[11px]" aria-hidden />
              <span>Conectar con Google Drive</span>
            </a>
          </Row>
        )}
      </Section>

      {/* ---------- 2. Carpeta del catálogo ---------- */}
      <Section
        id="h-catalogo"
        index={2}
        title="Elegir la carpeta del catálogo"
        state={integration?.catalog_folder_id ? 'done' : 'pending'}
        note="Es la carpeta que ya tenés ordenada: cada subcarpeta se vuelve un álbum de tu catálogo."
      >
        <Row label="Buscar en tu Drive" hint="Nombre de la carpeta principal (ej. Catálogo 2026)">
          <div className="relative w-full max-w-sm">
            <FaSearch
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-shell-muted"
              aria-hidden
            />
            <input
              type="text"
              aria-label="Buscar carpeta en Google Drive"
              placeholder="Nombre de tu carpeta en Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchFolders()}
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={onSearchFolders}
            disabled={searchingFolders}
            className={btn}
          >
            {searchingFolders ? 'Buscando...' : 'Buscar en Drive'}
          </button>
        </Row>

        <Row label="Carpeta del catálogo" hint="Se guarda al final del paso 3">
          {selectedCatalogFolder ? (
            <>
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-shell-ink">
                <FaFolder className="shrink-0 text-[11px] text-shell-accent" aria-hidden />
                <span className="truncate font-semibold">{selectedCatalogFolder.name}</span>
              </span>
              <span className="text-[11.5px] tabular-nums text-shell-muted">
                {selectedCatalogFolder.id.slice(0, 8)}...
              </span>
            </>
          ) : (
            <span className="text-[13px] text-shell-muted">Ninguna todavía</span>
          )}
        </Row>

        {/* Resultados de la búsqueda: desde acá se eligen las dos carpetas */}
        {folders.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap items-baseline gap-2 pb-1.5">
              <span className="text-[12px] font-semibold text-shell-ink-soft">
                Resultados en tu Drive
              </span>
              <span className="text-[11.5px] text-shell-muted">
                de esta misma lista salen las dos carpetas: catálogo y portadas
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border border-shell-line">
              {folders.map((f) => {
                const isCatalog = selectedCatalogFolder?.id === f.id;
                const isCover = selectedCoverFolder?.id === f.id;

                return (
                  <div
                    key={f.id}
                    className="flex flex-col gap-2 border-b border-shell-line px-2.5 py-2 transition-colors last:border-b-0 hover:bg-shell-surface sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FaFolder
                        className={`shrink-0 text-[11px] ${isCatalog || isCover ? 'text-shell-accent' : 'text-shell-muted'}`}
                        aria-hidden
                      />
                      <span className="truncate text-[13px] text-shell-ink">{f.name}</span>
                      {isCatalog && <span className={tagOk}>catálogo</span>}
                      {isCover && <span className={tagWarn}>portadas</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCatalogFolder(f)}
                        aria-pressed={isCatalog}
                        className={
                          isCatalog
                            ? `${btn} border-shell-accent bg-shell-accent text-shell-accent-ink`
                            : btn
                        }
                      >
                        {isCatalog ? 'Es el catálogo' : 'Elegir como catálogo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCoverFolder(f)}
                        aria-pressed={isCover}
                        className={
                          isCover
                            ? `${btn} border-shell-warn bg-shell-warn text-shell-bg`
                            : btn
                        }
                      >
                        {isCover ? 'Son las portadas' : 'Elegir portadas'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ---------- 3. Carpeta de portadas ---------- */}
      <Section
        id="h-portadas"
        index={3}
        title="Elegir la carpeta de portadas"
        state={integration?.cover_folder_id ? 'done' : 'pending'}
        note="Opcional: si no la elegís, cada álbum muestra su primera foto como portada."
      >
        <Row label="Carpeta de portadas" hint="Se marca con «Elegir portadas» en la lista del paso 2">
          {selectedCoverFolder ? (
            <>
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-shell-ink">
                <span className="truncate font-semibold">{selectedCoverFolder.name}</span>
              </span>
              <span className="text-[11.5px] tabular-nums text-shell-muted">
                {selectedCoverFolder.id.slice(0, 8)}...
              </span>
              <button
                type="button"
                onClick={() => setSelectedCoverFolder(null)}
                className={btnQuiet}
                aria-label="Quitar la carpeta de portadas"
              >
                Quitar
              </button>
            </>
          ) : (
            <span className="text-[13px] text-shell-muted">
              Ninguna · se usará la primera foto de cada álbum
            </span>
          )}
        </Row>

        <Row label="Guardar carpetas" hint="Guarda el catálogo y las portadas de una sola vez">
          <button
            type="button"
            onClick={onSaveFolders}
            disabled={savingFolders || !selectedCatalogFolder}
            className={btnPrimary}
          >
            {savingFolders ? 'Guardando configuración...' : 'Guardar selección de carpetas'}
          </button>
          {!selectedCatalogFolder && (
            <span className="text-[11.5px] text-shell-muted">
              Elegí primero la carpeta del catálogo
            </span>
          )}
        </Row>
      </Section>

      {/* ---------- 4. Portada de cada álbum ---------- */}
      <Section
        id="h-albumes"
        index={4}
        title="Asignar una portada a cada álbum"
        note="Opcional. La portada la resuelve tu carpeta de portadas; acá podés cambiarla álbum por álbum."
      >
        {/* Banner Sticky de Cambios Pendientes */}
        {hasPendingChanges && (
          <div className="sticky top-20 z-20 mb-3 flex flex-col gap-2 rounded-md border border-shell-warn/40 bg-shell-raised px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <FaLayerGroup className="shrink-0 text-[11px] text-shell-warn" aria-hidden />
              <span className="text-[12.5px] font-semibold text-shell-ink">
                {pendingCount} cambio(s) de portada sin guardar
              </span>
              <span className="hidden truncate text-[11.5px] text-shell-muted sm:inline">
                se aplican a tu tienda de una sola vez
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onDiscardCoverChanges}
                disabled={savingCovers}
                className={btn}
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={onSaveCoverChanges}
                disabled={savingCovers}
                className={btnPrimary}
              >
                <FaSave className="text-[10px]" aria-hidden />
                <span>{savingCovers ? 'Guardando...' : 'Guardar cambios'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Estado del listado de portadas */}
        <Row label="Portadas del catálogo" hint={`${albums.length} carpetas en tu Drive`}>
          {hasPendingChanges ? (
            <button
              type="button"
              onClick={onSaveCoverChanges}
              disabled={savingCovers}
              className={btnPrimary}
              title="Guardar todos los cambios de portadas en la base de datos"
            >
              <FaSave className="text-[10px]" aria-hidden />
              <span>{savingCovers ? 'Guardando...' : `Guardar cambios (${pendingCount})`}</span>
            </button>
          ) : (
            <span className={tagOk}>
              <FaCheckCircle className="text-[9px]" aria-hidden />
              Portadas al día
            </span>
          )}
        </Row>

        {/* Mini Buscador y Acciones de Expansión */}
        {albums.length > 0 && (
          <Row label="Buscar álbum" hint="Filtra por nombre, ruta o slug">
            <div className="relative w-full max-w-sm">
              <FaSearch
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-shell-muted"
                aria-hidden
              />
              <input
                type="text"
                aria-label="Filtrar álbum por nombre o subcarpeta"
                placeholder="Filtrar álbum por nombre o subcarpeta"
                value={albumFilter}
                onChange={(e) => setAlbumFilter(e.target.value)}
                className={inputCls}
              />
              {albumFilter && (
                <button
                  type="button"
                  onClick={() => setAlbumFilter('')}
                  aria-label="Limpiar filtro de álbumes"
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[11px] text-shell-muted transition-colors hover:text-shell-ink focus:outline-none focus:ring-2 focus:ring-shell-accent/60"
                >
                  <FaTimesCircle aria-hidden />
                </button>
              )}
            </div>

            {!albumFilter && (
              <>
                <button
                  type="button"
                  onClick={expandAll}
                  className={btn}
                  title="Expandir todas las carpetas"
                >
                  <FaExpandArrowsAlt className="text-[9px]" aria-hidden />
                  <span>Expandir todo</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className={btn}
                  title="Colapsar todas las carpetas"
                >
                  <FaCompressArrowsAlt className="text-[9px]" aria-hidden />
                  <span>Colapsar todo</span>
                </button>
              </>
            )}
          </Row>
        )}

        {/* Contenido: Si no hay álbumes */}
        {albums.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-shell-line px-4 py-10 text-center">
            <FaFolderOpen className="mx-auto mb-2 text-2xl text-shell-muted" aria-hidden />
            <p className="text-[12.5px] font-semibold text-shell-ink">
              Aún no se han cargado álbumes
            </p>
            <p className="mx-auto mt-1 max-w-[56ch] text-[11.5px] leading-relaxed text-shell-muted">
              Elegí tu carpeta principal en el paso 2 y presioná{' '}
              <strong className="text-shell-ink-soft">&quot;Sincronizar Catálogo&quot;</strong> para
              importar la estructura de carpetas y fotos.
            </p>
          </div>
        ) : searchResults ? (
          /* VISTA 1: Resultados del Buscador Rápido */
          <div className="mt-3">
            <div className="flex items-baseline gap-2 pb-1.5">
              <span className="text-[12px] font-semibold text-shell-ink-soft">Coincidencias</span>
              <span className="text-[11.5px] tabular-nums text-shell-muted">
                {searchResults.length} de {albums.length}
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="rounded-md border border-dashed border-shell-line px-4 py-8 text-center text-[12px] text-shell-muted">
                No hay álbumes que coincidan con &quot;{albumFilter}&quot;.
              </div>
            ) : (
              <div className="rounded-md border border-shell-line md:max-h-[550px] md:overflow-y-auto">
                {searchResults.map((album) => {
                  const customCover = folderCovers[album.id];
                  const isChanged = folderCovers[album.id] !== savedFolderCovers[album.id];
                  const displayCover = customCover || album.coverPhotoUrl || album.firstPhotoThumb;

                  return (
                    <div
                      key={album.id}
                      className={`flex flex-col gap-2 border-b border-shell-line px-2.5 py-2.5 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${
                        isChanged ? 'bg-shell-raised' : 'hover:bg-shell-surface'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-shell-line-strong bg-shell-bg">
                          {displayCover ? (
                            <Image
                              src={displayCover}
                              alt={album.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <FaImages className="text-[13px] text-shell-muted" aria-hidden />
                          )}
                        </div>

                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-shell-ink">
                              {album.name}
                            </span>
                            {customCover ? (
                              <span className={tagWarn}>Personalizada</span>
                            ) : (
                              <span className={tagOff}>1ra Foto</span>
                            )}
                            {isChanged && <span className={tagDanger}>Sin guardar</span>}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-shell-muted">
                            <span className="truncate">{album.path || album.slug}</span>
                            <span aria-hidden>·</span>
                            <span className="shrink-0 tabular-nums text-shell-ink-soft">
                              {album.photosCount ?? 0} fotos
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => onOpenCoverSelector(album.id)}
                          className={btn}
                        >
                          <FaEdit className="text-[9px]" aria-hidden />
                          <span>{customCover ? 'Cambiar portada' : 'Elegir portada'}</span>
                        </button>

                        {customCover && (
                          <button
                            type="button"
                            onClick={() => onResetCover(album.id)}
                            title="Restablecer a la primera foto del álbum"
                            className={btnQuiet}
                          >
                            <FaUndo className="text-[9px]" aria-hidden />
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
        ) : (
          /* VISTA 2: Navegación por Árbol Jerárquico de Carpetas */
          <div className="mt-3 rounded-md border border-shell-line md:max-h-[550px] md:overflow-y-auto">
            {rootNodes.map((root) => renderTreeNode(root))}
          </div>
        )}
      </Section>
    </div>
  );
}
