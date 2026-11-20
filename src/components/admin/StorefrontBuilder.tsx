'use client';

import { useState, useEffect, startTransition, Suspense } from 'react';
import Image from 'next/image';
import { StorefrontConfig, StorefrontBlock, BlockType } from '@/lib/storefront';
import { Album } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { FiArrowUp, FiArrowDown, FiTrash2, FiPlus, FiEye } from 'react-icons/fi';
import StorefrontView from '../storefront/StorefrontView';
import { AppConfig } from '@/lib/config';

interface StorefrontBuilderProps {
    availableCovers: string[];
    allAlbums: Album[];
    allAlbumUrls: string[];
}

type Spacing = NonNullable<StorefrontBlock['spacing']>;
type AspectRatio = NonNullable<StorefrontBlock['aspectRatio']>;
type TextSize = NonNullable<StorefrontBlock['textSize']>;
type TextAlignment = NonNullable<StorefrontBlock['textAlignment']>;
type TextFont = NonNullable<StorefrontBlock['textFont']>;
type TextWeight = NonNullable<StorefrontBlock['textWeight']>;

/** Orden fijo de los tipos de bloque en los menús de alta. */
const BLOCK_TYPES: BlockType[] = [
    'hero_banner',
    'category_carousel',
    'promo_grid',
    'classic_grid',
    'rich_text',
];

/** Nombres para el comerciante: los tipos internos son en inglés. */
const BLOCK_LABELS: Record<BlockType, string> = {
    hero_banner: 'Héroe banner',
    category_carousel: 'Carrusel',
    promo_grid: 'Grilla promo',
    classic_grid: 'Grilla simple',
    rich_text: 'Texto libre',
};

const fieldCls =
    'w-full rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1.5 text-[13px] text-shell-ink placeholder:text-shell-muted focus:outline-none focus:ring-2 focus:ring-shell-accent/60';

const selectCls = `${fieldCls} max-w-xs cursor-pointer`;

const btn =
    'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-shell-line-strong bg-shell-raised px-2.5 py-1 text-[12.5px] font-semibold text-shell-ink transition-colors hover:bg-shell-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-not-allowed disabled:opacity-40';

const btnQuiet =
    'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-shell-muted transition-colors hover:text-shell-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-shell-muted';

const btnPrimary =
    'inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-shell-accent bg-shell-accent px-3 py-2 text-[12.5px] font-semibold text-shell-accent-ink transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 disabled:cursor-not-allowed disabled:opacity-50';

const chip =
    'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-shell-line bg-shell-surface px-1.5 py-0.5 text-[11px] text-shell-muted transition-colors hover:border-shell-line-strong hover:text-shell-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60';

const tagCls =
    'inline-flex shrink-0 items-center rounded border border-shell-accent/40 bg-shell-accent/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-shell-accent';

/** Interruptor con el estado escrito: nunca sólo color. */
function Switch({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
}) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="text-[12px] text-shell-muted tabular-nums">{checked ? 'Sí' : 'No'}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className={`flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60 ${
                    checked ? 'bg-shell-accent' : 'border border-shell-line-strong bg-shell-raised'
                }`}
            >
                <span
                    className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}

/** Fila etiqueta / control: la unidad de densidad de este panel. */
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

/** Encabezado de sección: título de 12px en mayúsculas y una frase de intención. */
function Section({
    id,
    title,
    note,
    children,
}: {
    id: string;
    title: string;
    note?: string;
    children: React.ReactNode;
}) {
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

export default function StorefrontBuilder({ availableCovers, allAlbums, allAlbumUrls }: StorefrontBuilderProps) {
    const [config, setConfig] = useState<StorefrontConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showCoverSelector, setShowCoverSelector] = useState<{ blockId: string, itemIdx?: number } | null>(null);
    /* Sólo presentación: qué bloque está abierto en el editor. */
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/storefront')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching storefront:', err);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const res = await fetch('/api/storefront', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (!res.ok) throw new Error('Failed to save');
            alert('Storefront guardado y recargado con éxito!');
        } catch (error) {
            console.error(error);
            alert('Error al guardar el Storefront');
        } finally {
            setSaving(false);
        }
    };

    const handleAddBlock = (type: BlockType, insertIndex?: number) => {
        if (!config) return;
        const newBlock: StorefrontBlock = {
            // Only ever reached from a click handler: never during render.
            // eslint-disable-next-line react-hooks/purity
            id: `blk_${Date.now()}`,
            type,
            title: '',
            aspectRatio: 'auto',
            items: type === 'category_carousel' || type === 'promo_grid' || type === 'classic_grid' ? [] : undefined
        };

        const newBlocks = [...config.blocks];
        if (insertIndex !== undefined) {
            newBlocks.splice(insertIndex, 0, newBlock);
        } else {
            newBlocks.push(newBlock);
        }

        setConfig({ ...config, blocks: newBlocks });
        setSelectedBlockId(newBlock.id);
    };

    const handleRemoveBlock = (id: string) => {
        if (!config) return;
        startTransition(() => {
            setConfig({ ...config, blocks: config.blocks.filter(b => b.id !== id) });
        });
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if (!config) return;
        const newBlocks = [...config.blocks];
        if (direction === 'up' && index > 0) {
            [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
        } else if (direction === 'down' && index < newBlocks.length - 1) {
            [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        }
        startTransition(() => {
            setConfig({ ...config, blocks: newBlocks });
        });
    };

    const updateBlock = (index: number, updates: Partial<StorefrontBlock>) => {
        if (!config) return;
        const newBlocks = [...config.blocks];
        newBlocks[index] = { ...newBlocks[index], ...updates };
        setConfig({ ...config, blocks: newBlocks });
    };

    const handleSelectCover = (cover: string) => {
        if (!config || !showCoverSelector) return;
        const { blockId, itemIdx } = showCoverSelector;
        const blockIndex = config.blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1) return;

        const block = config.blocks[blockIndex];
        if (itemIdx !== undefined && block.items) {
            const newItems = [...block.items];
            newItems[itemIdx] = { ...newItems[itemIdx], imageUrl: cover };
            updateBlock(blockIndex, { items: newItems });
        } else {
            updateBlock(blockIndex, { imageUrl: cover });
        }
        setShowCoverSelector(null);
    };

    if (loading) return <div className="p-6 text-[13px] text-shell-muted">Cargando Creador...</div>;
    if (!config) return <div className="p-6 text-[13px] text-shell-danger">Error cargando datos.</div>;

    const selectedIndex = selectedBlockId ? config.blocks.findIndex(b => b.id === selectedBlockId) : -1;
    const selectedBlock = selectedIndex >= 0 ? config.blocks[selectedIndex] : null;

    return (
        <div className="text-shell-ink">
            <datalist id="album-urls">
                {allAlbumUrls.map((url, i) => (
                    <option key={i} value={url} />
                ))}
            </datalist>

            <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-shell-ink">
                Portada de la tienda
            </h1>
            <p className="mb-6 mt-1 max-w-[66ch] text-[13px] text-shell-muted">
                Ordená los bloques de tu página de inicio y editá uno por vez. Si está activado, los
                visitantes ven este diseño en lugar de las carpetas crudas de Google Drive.
            </p>

            {/* ---------- 1. Estado ---------- */}
            <Section
                id="h-estado"
                title="Estado"
                note="Si está desactivado, la página de inicio vuelve a mostrar las carpetas de Drive."
            >
                <Row
                    label="Storefront personalizado"
                    hint="Reemplaza las carpetas crudas por estos bloques"
                >
                    <Switch
                        checked={config.enabled}
                        onChange={(next) => startTransition(() => setConfig({ ...config, enabled: next }))}
                        label="Activar Storefront Personalizado"
                    />
                </Row>
            </Section>

            {config.enabled && (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                    {/* ---------- Columnas 1-3: lista y editor ---------- */}
                    <div className="flex flex-col lg:col-span-3">
                        {/* ---------- 2. Lista de bloques ---------- */}
                        <Section
                            id="h-bloques"
                            title="Bloques en orden"
                            note="De arriba hacia abajo, tal como los ve el visitante. Elegí uno para editarlo."
                        >
                            {config.blocks.length === 0 ? (
                                <p className="py-6 text-[12.5px] text-shell-muted">
                                    No has añadido ningún bloque todavía. Agregá un Héroe Banner o un
                                    Carrusel al final de la lista.
                                </p>
                            ) : (
                                <ul className="list-none p-0">
                                    {config.blocks.map((block, index) => {
                                        const isSelected = block.id === selectedBlockId;
                                        return (
                                            <li
                                                key={block.id}
                                                className={`grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-shell-line py-2 last:border-b-0 ${
                                                    isSelected ? 'bg-shell-raised' : ''
                                                }`}
                                            >
                                                <span className="text-right text-[11.5px] tabular-nums text-shell-muted">
                                                    {index + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-current={isSelected ? 'true' : undefined}
                                                    onClick={() => setSelectedBlockId(block.id)}
                                                    className="min-w-0 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                                                >
                                                    <span className="flex items-center gap-2 text-[13px] text-shell-ink">
                                                        {BLOCK_LABELS[block.type]}
                                                        {isSelected && <span className={tagCls}>Editando</span>}
                                                    </span>
                                                    <span className="block truncate text-[11.5px] text-shell-muted">
                                                        {block.title || 'Sin título'}
                                                    </span>
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveBlock(index, 'up')}
                                                        disabled={index === 0}
                                                        aria-label={`Subir ${BLOCK_LABELS[block.type]}${block.title ? ` "${block.title}"` : ''}`}
                                                        title="Subir (Mover Arriba)"
                                                        className={btnQuiet}
                                                    >
                                                        <FiArrowUp size={15} aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveBlock(index, 'down')}
                                                        disabled={index === config.blocks.length - 1}
                                                        aria-label={`Bajar ${BLOCK_LABELS[block.type]}${block.title ? ` "${block.title}"` : ''}`}
                                                        title="Bajar (Mover Abajo)"
                                                        className={btnQuiet}
                                                    >
                                                        <FiArrowDown size={15} aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBlock(block.id)}
                                                        aria-label={`Eliminar ${BLOCK_LABELS[block.type]}${block.title ? ` "${block.title}"` : ''}`}
                                                        title="Eliminar Bloque"
                                                        className={btnQuiet}
                                                    >
                                                        <FiTrash2 size={15} aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {config.blocks.length > 0 && (
                                <div className="space-y-1 border-t border-shell-line pt-2">
                                    {config.blocks.map((block, index) => (
                                        <div
                                            key={`insert-${block.id}`}
                                            className="flex flex-wrap items-center gap-1.5"
                                        >
                                            <span className="text-[11px] text-shell-muted">
                                                Insertar después del {index + 1}:
                                            </span>
                                            {BLOCK_TYPES.map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => handleAddBlock(type, index + 1)}
                                                    aria-label={`Insertar ${BLOCK_LABELS[type]} después del bloque ${index + 1}`}
                                                    className={chip}
                                                >
                                                    + {BLOCK_LABELS[type]}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-shell-line pt-3">
                                <span className="mr-1 text-[12.5px] text-shell-ink-soft">Añadir bloque al final</span>
                                {BLOCK_TYPES.map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => handleAddBlock(type)}
                                        className={btn}
                                    >
                                        <FiPlus size={13} aria-hidden="true" /> {BLOCK_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                        </Section>

                        {/* ---------- 3. Editor del bloque elegido ---------- */}
                        <Section
                            id="h-editor"
                            title="Editor del bloque"
                            note="Los ajustes de acá se aplican sólo al bloque elegido en la lista."
                        >
                            {!selectedBlock ? (
                                <p className="py-4 text-[12.5px] text-shell-muted">
                                    Elegí un bloque de la lista para editarlo.
                                </p>
                            ) : (
                                <>
                                    <div className="flex flex-wrap items-center gap-2 border-b border-shell-line py-2">
                                        <span className={tagCls}>{BLOCK_LABELS[selectedBlock.type]}</span>
                                        <span className="text-[12px] text-shell-muted tabular-nums">
                                            bloque {selectedIndex + 1} de {config.blocks.length}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBlockId(null)}
                                            className={`${btnQuiet} ml-auto`}
                                        >
                                            Cerrar editor
                                        </button>
                                    </div>

                                    <Row label="Título del bloque" hint="Opcional · se muestra arriba del bloque">
                                        <input
                                            className={fieldCls}
                                            value={selectedBlock.title || ''}
                                            placeholder="Ej: Nueva Colección Verano"
                                            aria-label="Título del bloque"
                                            onChange={e => updateBlock(selectedIndex, { title: e.target.value })}
                                        />
                                    </Row>

                                    <Row label="Espaciado vertical" hint="Aire entre este bloque y el anterior">
                                        <select
                                            className={selectCls}
                                            value={selectedBlock.spacing || 'medium'}
                                            aria-label="Espaciado vertical"
                                            onChange={e => updateBlock(selectedIndex, { spacing: e.target.value as Spacing })}
                                        >
                                            <option value="none">Sin Espaciado</option>
                                            <option value="small">Pequeño</option>
                                            <option value="medium">Normal (Default)</option>
                                            <option value="large">Grande</option>
                                        </select>
                                    </Row>

                                    {/* Single Image Blocks (Hero) */}
                                    {selectedBlock.type === 'hero_banner' && (
                                        <>
                                            <Row label="Imagen" hint="Portada del bloque">
                                                {selectedBlock.imageUrl ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCoverSelector({ blockId: selectedBlock.id })}
                                                        aria-label="Cambiar imagen del bloque"
                                                        className="cursor-pointer overflow-hidden rounded border border-shell-line-strong bg-shell-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                                                    >
                                                        <span className="relative block h-16 w-16">
                                                            <Image src={selectedBlock.imageUrl} alt="preview" fill className="object-cover" />
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCoverSelector({ blockId: selectedBlock.id })}
                                                        className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-shell-line-strong bg-shell-surface text-[11.5px] text-shell-accent hover:border-shell-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                                                    >
                                                        Elegir
                                                    </button>
                                                )}
                                            </Row>

                                            <Row label="Ruta de Destino (Link)" hint="Adónde va el visitante al tocarlo">
                                                <input
                                                    className={fieldCls}
                                                    value={selectedBlock.linkHref || ''}
                                                    placeholder="Ej: /moda-hombre"
                                                    list="album-urls"
                                                    aria-label="Ruta de destino del bloque"
                                                    onChange={e => updateBlock(selectedIndex, { linkHref: e.target.value })}
                                                />
                                            </Row>

                                            <Row label="Forma (Aspect Ratio)">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.aspectRatio || 'auto'}
                                                    aria-label="Forma del bloque"
                                                    onChange={e => updateBlock(selectedIndex, { aspectRatio: e.target.value as AspectRatio })}
                                                >
                                                    <option value="auto">Paisaje Ancho (16:9)</option>
                                                    <option value="portrait">Vertical Stories (4:5)</option>
                                                    <option value="square">Cuadrado (1:1)</option>
                                                    <option value="full">Pantalla Completa (Full Bleed)</option>
                                                    <option value="intrinsic">Adaptable a la Imagen (Natural)</option>
                                                </select>
                                            </Row>
                                        </>
                                    )}

                                    {/* Rich Text Block Settings */}
                                    {selectedBlock.type === 'rich_text' && (
                                        <>
                                            <Row label="Contenido del Texto">
                                                <textarea
                                                    className={`${fieldCls} h-24 resize-y`}
                                                    value={selectedBlock.textContent || ''}
                                                    placeholder="Escribe tu título o texto libre aquí..."
                                                    aria-label="Contenido del texto"
                                                    onChange={e => updateBlock(selectedIndex, { textContent: e.target.value })}
                                                />
                                            </Row>
                                            <Row label="Tamaño de Letra">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.textSize || 'medium'}
                                                    aria-label="Tamaño de letra"
                                                    onChange={e => updateBlock(selectedIndex, { textSize: e.target.value as TextSize })}
                                                >
                                                    <option value="small">Pequeño (Etiqueta)</option>
                                                    <option value="medium">Normal (Párrafo)</option>
                                                    <option value="large">Grande (Subtítulo)</option>
                                                    <option value="xlarge">Extra Grande</option>
                                                    <option value="title">Gigante (Título Principal)</option>
                                                </select>
                                            </Row>
                                            <Row label="Alineación">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.textAlignment || 'center'}
                                                    aria-label="Alineación del texto"
                                                    onChange={e => updateBlock(selectedIndex, { textAlignment: e.target.value as TextAlignment })}
                                                >
                                                    <option value="left">Izquierda</option>
                                                    <option value="center">Centro</option>
                                                    <option value="right">Derecha</option>
                                                </select>
                                            </Row>
                                            <Row label="Fuente (Tipografía)">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.textFont || 'sans'}
                                                    aria-label="Fuente del texto"
                                                    onChange={e => updateBlock(selectedIndex, { textFont: e.target.value as TextFont })}
                                                >
                                                    <option value="sans">Moderna (Sans-serif)</option>
                                                    <option value="serif">Elegante (Serif)</option>
                                                    <option value="mono">Máquina de Escribir (Mono)</option>
                                                </select>
                                            </Row>
                                            <Row label="Grosor (Peso)">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.textWeight || 'normal'}
                                                    aria-label="Grosor del texto"
                                                    onChange={e => updateBlock(selectedIndex, { textWeight: e.target.value as TextWeight })}
                                                >
                                                    <option value="light">Fino (Light)</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="bold">Grueso (Negrita)</option>
                                                </select>
                                            </Row>
                                        </>
                                    )}

                                    {/* Classic Grid Settings */}
                                    {selectedBlock.type === 'classic_grid' && (
                                        <>
                                            <Row label="Columnas en Computadora">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.gridColumnsDesktop || 5}
                                                    aria-label="Columnas en computadora"
                                                    onChange={e => updateBlock(selectedIndex, { gridColumnsDesktop: parseInt(e.target.value) })}
                                                >
                                                    <option value="2">2 Columnas</option>
                                                    <option value="3">3 Columnas</option>
                                                    <option value="4">4 Columnas</option>
                                                    <option value="5">5 Columnas (Default)</option>
                                                    <option value="6">6 Columnas</option>
                                                </select>
                                            </Row>
                                            <Row label="Columnas en Celular">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.gridColumnsMobile || 2}
                                                    aria-label="Columnas en celular"
                                                    onChange={e => updateBlock(selectedIndex, { gridColumnsMobile: parseInt(e.target.value) })}
                                                >
                                                    <option value="1">1 Columna (Lista)</option>
                                                    <option value="2">2 Columnas (Default)</option>
                                                    <option value="3">3 Columnas</option>
                                                </select>
                                            </Row>
                                        </>
                                    )}

                                    {/* Multi Item Blocks (Carousel / Promo Grid / Classic Grid) */}
                                    {(selectedBlock.type === 'category_carousel' || selectedBlock.type === 'promo_grid' || selectedBlock.type === 'classic_grid') && (
                                        <>
                                            <div className="border-b border-shell-line py-3">
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-[13px] text-shell-ink-soft">
                                                        Elementos del {selectedBlock.type === 'category_carousel' ? 'Carrusel' : 'Grid'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newItems = [...(selectedBlock.items || []), { imageUrl: '', linkHref: '', title: '' }];
                                                            updateBlock(selectedIndex, { items: newItems });
                                                        }}
                                                        className={btn}
                                                    >
                                                        <FiPlus size={13} aria-hidden="true" /> Añadir Elemento
                                                    </button>
                                                </div>

                                                <ul className="list-none space-y-1.5 p-0">
                                                    {selectedBlock.items?.map((item, itemIdx) => (
                                                        <li
                                                            key={itemIdx}
                                                            className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-2 rounded border border-shell-line bg-shell-surface p-2"
                                                        >
                                                            {item.imageUrl ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowCoverSelector({ blockId: selectedBlock.id, itemIdx })}
                                                                    aria-label={`Cambiar imagen del elemento ${itemIdx + 1}`}
                                                                    className="h-12 w-12 cursor-pointer overflow-hidden rounded border border-shell-line-strong bg-shell-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                                                                >
                                                                    <span className="relative block h-12 w-12">
                                                                        <Image src={item.imageUrl} alt="item" fill className="object-cover" />
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowCoverSelector({ blockId: selectedBlock.id, itemIdx })}
                                                                    aria-label={`Elegir imagen del elemento ${itemIdx + 1}`}
                                                                    className="flex h-12 w-12 cursor-pointer items-center justify-center rounded border border-dashed border-shell-line-strong text-[13px] text-shell-accent hover:border-shell-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                                                                >
                                                                    +
                                                                </button>
                                                            )}
                                                            <div className="flex min-w-0 flex-col gap-1">
                                                                <input
                                                                    className={fieldCls}
                                                                    value={item.title || ''}
                                                                    placeholder="Título (opcional)"
                                                                    aria-label={`Título del elemento ${itemIdx + 1}`}
                                                                    onChange={e => {
                                                                        const newItems = [...(selectedBlock.items || [])];
                                                                        newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                                                                        updateBlock(selectedIndex, { items: newItems });
                                                                    }}
                                                                />
                                                                <input
                                                                    className={fieldCls}
                                                                    value={item.linkHref || ''}
                                                                    placeholder="URL destino"
                                                                    list="album-urls"
                                                                    aria-label={`URL destino del elemento ${itemIdx + 1}`}
                                                                    onChange={e => {
                                                                        const newItems = [...(selectedBlock.items || [])];
                                                                        newItems[itemIdx] = { ...newItems[itemIdx], linkHref: e.target.value };
                                                                        updateBlock(selectedIndex, { items: newItems });
                                                                    }}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newItems = [...(selectedBlock.items || [])];
                                                                    newItems.splice(itemIdx, 1);
                                                                    updateBlock(selectedIndex, { items: newItems });
                                                                }}
                                                                aria-label={`Quitar elemento ${itemIdx + 1}`}
                                                                className={btnQuiet}
                                                            >
                                                                <FiTrash2 size={14} aria-hidden="true" />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>

                                                {selectedBlock.items?.length === 0 && (
                                                    <p className="mt-1 text-[11.5px] text-shell-muted">
                                                        Sin elementos todavía. Añadí el primero con el botón de arriba.
                                                    </p>
                                                )}
                                            </div>

                                            <Row label="Forma de las Fotos (Aspect Ratio)">
                                                <select
                                                    className={selectCls}
                                                    value={selectedBlock.aspectRatio || 'auto'}
                                                    aria-label="Forma de las fotos"
                                                    onChange={e => updateBlock(selectedIndex, { aspectRatio: e.target.value as AspectRatio })}
                                                >
                                                    {selectedBlock.type === 'category_carousel' && (
                                                        <option value="intrinsic">Adaptable a la Imagen (Natural)</option>
                                                    )}
                                                    <option value="auto">Libre (Original)</option>
                                                    <option value="portrait">Vertical Stories (4:5)</option>
                                                    <option value="square">Cuadrado (1:1)</option>
                                                </select>
                                            </Row>
                                        </>
                                    )}
                                </>
                            )}
                        </Section>
                    </div>

                    {/* ---------- Columnas 4-5: vista previa y publicación ---------- */}
                    <div className="lg:col-span-2">
                        <div className="lg:sticky lg:top-4">
                            <Section
                                id="h-preview"
                                title="Vista previa en vivo"
                                note="Móvil virtual. Tocá cualquier bloque de la lista para verlo acá."
                            >
                                <div className="rounded-md border border-shell-line-strong bg-shell-raised">
                                    <div className="flex items-center justify-between gap-2 border-b border-shell-line px-3 py-2">
                                        <h3 className="flex items-center gap-2 text-[12px] font-semibold text-shell-ink">
                                            <FiEye aria-hidden="true" /> Vista Previa En Vivo
                                        </h3>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-shell-muted">
                                            Móvil Virtual
                                        </span>
                                    </div>

                                    <div className="custom-scrollbar max-h-[800px] min-h-[500px] w-full overflow-y-auto bg-white">
                                        {config.blocks.length === 0 ? (
                                            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 px-4 text-shell-muted">
                                                <p className="text-[12.5px] text-center">
                                                    Agregá un bloque para verlo acá.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="pointer-events-none w-full bg-white">
                                                <Suspense fallback={<div className="p-8 text-center text-[12px] text-shell-muted">Sincronizando vista en vivo...</div>}>
                                                    <StorefrontView storefront={config} appConfig={{ gridColumns: 5, mobileGridColumns: 2 } as AppConfig} isPreview={true} />
                                                </Suspense>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 border-t border-shell-line pt-3">
                                    <h4 className="mb-1 text-[12px] font-bold uppercase tracking-[0.08em] text-shell-muted">
                                        Mapeador de Rutas Rápidas
                                    </h4>
                                    <div className="max-h-40 overflow-y-auto rounded border border-shell-line bg-shell-surface p-1 text-[11.5px]">
                                        {allAlbums.slice(0, 30).map(album => (
                                            <button
                                                key={album.id}
                                                type="button"
                                                className="block w-full cursor-copy truncate rounded px-1.5 py-0.5 text-left text-shell-ink-soft hover:bg-shell-raised hover:text-shell-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                                                title="Copiar ruta al portapapeles"
                                                aria-label={`Copiar la ruta /${slugify(album.name)}`}
                                                onClick={() => navigator.clipboard.writeText(`/${slugify(album.name)}`)}
                                            >
                                                /{slugify(album.name)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 border-t border-shell-line pt-3">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className={btnPrimary}
                                    >
                                        {saving ? 'Guardando...' : 'GUARDAR Y PUBLICAR'}
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (confirm('¿Estás seguro de que quieres destruir todo este diseño? La página principal volverá a su estado original.')) {
                                                const resetConfig = { ...config, enabled: false, blocks: [] };
                                                setConfig(resetConfig);
                                                fetch('/api/storefront', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(resetConfig)
                                                }).then(() => alert('Storefront desactivado y limpiado.')).catch(() => alert('Error reseteando.'));
                                            }
                                        }}
                                        className={`${btnQuiet} mt-2 w-full justify-center`}
                                    >
                                        Desactivar y Limpiar Todo
                                    </button>
                                </div>
                            </Section>
                        </div>
                    </div>
                </div>
            )}

            {showCoverSelector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-shell-bg/80 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="h-portadas"
                        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-shell-line-strong bg-shell-surface shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-shell-line px-4 py-3">
                            <div>
                                <h3 id="h-portadas" className="text-[15px] font-semibold text-shell-ink">
                                    Seleccionar Portada
                                </h3>
                                <p className="mt-0.5 text-[11.5px] text-shell-muted">
                                    Sube fotos verticales a la carpeta PORTADAS en tu Drive para verlas aquí.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCoverSelector(null)}
                                className={btn}
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4">
                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                                {availableCovers.map(cover => (
                                    <button
                                        key={cover}
                                        type="button"
                                        aria-label={`Usar la portada ${cover.split('/').pop()}`}
                                        className="group relative cursor-pointer overflow-hidden rounded border border-shell-line bg-shell-raised text-left hover:border-shell-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-accent/60"
                                        onClick={() => handleSelectCover(cover)}
                                    >
                                        <span className="relative block aspect-[4/5] w-full bg-shell-raised">
                                            <Image src={cover} alt="cover option" fill className="object-cover transition-transform group-hover:scale-105" />
                                        </span>
                                        <span className="absolute inset-x-0 bottom-0 bg-shell-bg/80 p-1 text-center">
                                            <span className="block truncate text-[10px] text-shell-ink" title={cover.split('/').pop()}>{cover.split('/').pop()}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {availableCovers.length === 0 && (
                                <p className="py-10 text-center text-[12.5px] text-shell-muted">
                                    No hay imágenes disponibles. Añade imágenes en el folder PORTADAS y sincroniza.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
