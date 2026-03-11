'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { StorefrontConfig, StorefrontBlock, BlockType } from '@/lib/storefront';
import { Album } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { FiArrowUp, FiArrowDown, FiTrash2, FiPlus } from 'react-icons/fi';

interface StorefrontBuilderProps {
    availableCovers: string[];
    allAlbums: Album[];
}

export default function StorefrontBuilder({ availableCovers, allAlbums }: StorefrontBuilderProps) {
    const [config, setConfig] = useState<StorefrontConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showCoverSelector, setShowCoverSelector] = useState<{ blockId: string, itemIdx?: number } | null>(null);

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

    const handleAddBlock = (type: BlockType) => {
        if (!config) return;
        const newBlock: StorefrontBlock = {
            id: `blk_${Date.now()}`,
            type,
            title: '',
            aspectRatio: 'auto',
            items: type === 'category_carousel' || type === 'promo_grid' ? [] : undefined
        };
        setConfig({ ...config, blocks: [...config.blocks, newBlock] });
    };

    const handleRemoveBlock = (id: string) => {
        if (!config) return;
        setConfig({ ...config, blocks: config.blocks.filter(b => b.id !== id) });
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if (!config) return;
        const newBlocks = [...config.blocks];
        if (direction === 'up' && index > 0) {
            [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
        } else if (direction === 'down' && index < newBlocks.length - 1) {
            [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        }
        setConfig({ ...config, blocks: newBlocks });
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

    if (loading) return <div>Cargando Creador...</div>;
    if (!config) return <div>Error cargando datos.</div>;

    return (
        <div className="bg-white p-6 rounded shadow">
            <div className="flex justify-between items-center bg-gray-50 p-4 border rounded mb-6">
                <div>
                    <h2 className="text-xl font-bold">Activar Storefront Personalizado</h2>
                    <p className="text-sm text-gray-500">
                        Si está activado, la página de inicio usará este diseño de bloques en lugar de mostrar las carpetas crudas de Google Drive.
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={config.enabled}
                        onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {config.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Panel: Builder Controls */}
                    <div className="md:col-span-2 space-y-6 flex flex-col">
                        <h3 className="text-lg font-semibold border-b pb-2">Bloques de la Tienda</h3>
                        
                        {config.blocks.length === 0 ? (
                            <p className="text-gray-500 italic text-center py-8">No has añadido ningún bloque. Comienza añadiendo un Héroe Banner o un Carrusel abajo.</p>
                        ) : (
                            <div className="space-y-4">
                                {config.blocks.map((block, index) => (
                                    <div key={block.id} className="border p-4 rounded bg-white shadow-sm hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded tracking-widest uppercase">
                                                    {block.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-black disabled:opacity-30"><FiArrowUp /></button>
                                                <button onClick={() => moveBlock(index, 'down')} disabled={index === config.blocks.length - 1} className="p-1 text-gray-400 hover:text-black disabled:opacity-30"><FiArrowDown /></button>
                                                <button onClick={() => handleRemoveBlock(block.id)} className="p-1 text-red-400 hover:text-red-700"><FiTrash2 /></button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500">Título Opcional (se muestra arriba del bloque)</label>
                                                <input 
                                                    className="w-full border p-2 rounded text-sm" 
                                                    value={block.title || ''} 
                                                    placeholder="Ej: Nueva Colección Verano"
                                                    onChange={e => updateBlock(index, { title: e.target.value })} 
                                                />
                                            </div>

                                            {/* Single Image Blocks (Hero / Classic Grid injected) */}
                                            {block.type === 'hero_banner' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500">Imagen</label>
                                                        <div className="flex gap-2 mt-1">
                                                            {block.imageUrl ? (
                                                                <div className="relative w-16 h-16 bg-gray-100 border rounded cursor-pointer" onClick={() => setShowCoverSelector({ blockId: block.id })}>
                                                                    <Image src={block.imageUrl} alt="preview" fill className="object-cover rounded" />
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setShowCoverSelector({ blockId: block.id })} className="w-16 h-16 border rounded border-dashed flex items-center justify-center text-xs text-blue-600 hover:bg-blue-50">Elegir</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500">Ruta de Destino (Link)</label>
                                                        <input 
                                                            className="w-full border p-2 rounded text-sm mt-1" 
                                                            value={block.linkHref || ''} 
                                                            placeholder="Ej: /moda-hombre"
                                                            onChange={e => updateBlock(index, { linkHref: e.target.value })} 
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium text-gray-500">Forma (Aspect Ratio)</label>
                                                        <select 
                                                            className="w-full border p-2 rounded text-sm mt-1"
                                                            value={block.aspectRatio || 'auto'}
                                                            onChange={e => updateBlock(index, { aspectRatio: e.target.value as any })}
                                                        >
                                                            <option value="auto">Paisaje Ancho (16:9)</option>
                                                            <option value="portrait">Vertical Stories (4:5)</option>
                                                            <option value="square">Cuadrado (1:1)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Multi Item Blocks (Carousel / Promo Grid) */}
                                            {(block.type === 'category_carousel' || block.type === 'promo_grid') && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-xs font-medium text-gray-500">Elementos del {block.type === 'category_carousel' ? 'Carrusel' : 'Grid'}</label>
                                                        <button 
                                                            onClick={() => {
                                                                const newItems = [...(block.items || []), { imageUrl: '', linkHref: '', title: '' }];
                                                                updateBlock(index, { items: newItems });
                                                            }}
                                                            className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 flex items-center gap-1"
                                                        >
                                                            <FiPlus /> Añadir Elemento
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2 border-l-2 pl-3 ml-2 border-gray-200">
                                                        {block.items?.map((item, itemIdx) => (
                                                            <div key={itemIdx} className="flex gap-2 items-start bg-gray-50 p-2 rounded">
                                                                {item.imageUrl ? (
                                                                    <div className="relative w-12 h-12 bg-gray-200 border rounded cursor-pointer flex-shrink-0" onClick={() => setShowCoverSelector({ blockId: block.id, itemIdx })}>
                                                                        <Image src={item.imageUrl} alt="item" fill className="object-cover rounded" />
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => setShowCoverSelector({ blockId: block.id, itemIdx })} className="w-12 h-12 flex-shrink-0 border rounded border-dashed flex items-center justify-center text-xs text-blue-600 hover:bg-blue-100">+</button>
                                                                )}
                                                                <div className="flex-grow space-y-1">
                                                                    <input 
                                                                        className="w-full border p-1 rounded text-xs" 
                                                                        value={item.title || ''} 
                                                                        placeholder="Título (opcional)"
                                                                        onChange={e => {
                                                                            const newItems = [...(block.items || [])];
                                                                            newItems[itemIdx] = { ...newItems[itemIdx], title: e.target.value };
                                                                            updateBlock(index, { items: newItems });
                                                                        }} 
                                                                    />
                                                                    <input 
                                                                        className="w-full border p-1 rounded text-xs" 
                                                                        value={item.linkHref || ''} 
                                                                        placeholder="URL destino"
                                                                        onChange={e => {
                                                                            const newItems = [...(block.items || [])];
                                                                            newItems[itemIdx] = { ...newItems[itemIdx], linkHref: e.target.value };
                                                                            updateBlock(index, { items: newItems });
                                                                        }} 
                                                                    />
                                                                </div>
                                                                <button 
                                                                    onClick={() => {
                                                                        const newItems = [...(block.items || [])];
                                                                        newItems.splice(itemIdx, 1);
                                                                        updateBlock(index, { items: newItems });
                                                                    }}
                                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                                >
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    <div className="mt-3">
                                                        <label className="block text-xs font-medium text-gray-500">Forma de las Fotos (Aspect Ratio)</label>
                                                        <select 
                                                            className="w-full border p-2 rounded text-sm mt-1"
                                                            value={block.aspectRatio || 'auto'}
                                                            onChange={e => updateBlock(index, { aspectRatio: e.target.value as any })}
                                                        >
                                                            <option value="auto">Libre (Original)</option>
                                                            <option value="portrait">Vertical Stories (4:5)</option>
                                                            <option value="square">Cuadrado (1:1)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                            <button onClick={() => handleAddBlock('hero_banner')} className="bg-gray-100 text-gray-800 text-sm px-3 py-2 rounded hover:bg-gray-200 font-medium">+ Añadir Héroe Banner</button>
                            <button onClick={() => handleAddBlock('category_carousel')} className="bg-gray-100 text-gray-800 text-sm px-3 py-2 rounded hover:bg-gray-200 font-medium">+ Añadir Carrusel</button>
                            {/* <button onClick={() => handleAddBlock('promo_grid')} className="bg-gray-100 text-gray-800 text-sm px-3 py-2 rounded hover:bg-gray-200 font-medium">+ Añadir Promo Grid</button> */}
                            <button onClick={() => handleAddBlock('classic_grid')} className="bg-gray-100 text-gray-800 text-sm px-3 py-2 rounded hover:bg-gray-200 font-medium">+ Añadir Grid Tradicional</button>
                        </div>

                    </div>

                    {/* Right Panel: Data Dump / Live Preview stub */}
                    <div className="md:col-span-1 border-l pl-8">
                        <div className="sticky top-8">
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Mapeador a Rutas Reales</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Usa estos links de abajo como inspiración para pegarlos en el campo de "URL destino" (linkHref) de tus bloques.
                            </p>
                            <div className="max-h-96 overflow-y-auto space-y-1 bg-gray-50 p-2 rounded border text-xs font-mono">
                                {allAlbums.slice(0, 30).map(album => (
                                    <div key={album.id} className="truncate p-1 hover:bg-gray-200 cursor-copy" title="Copy to clipboard" onClick={() => navigator.clipboard.writeText(`/${slugify(album.name)}`)}>
                                        /{slugify(album.name)}
                                    </div>
                                ))}
                                {allAlbums.length > 30 && <div className="text-center text-gray-400 p-2">... {allAlbums.length - 30} más</div>}
                            </div>
                            
                            <div className="mt-8">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full bg-black text-white px-4 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-bold text-lg shadow-xl"
                                >
                                    {saving ? 'Guardando...' : 'GUARDAR Y PUBLICAR TIENDA'}
                                </button>
                                <p className="text-xs text-center text-gray-500 mt-2">Los cambios purgarán el la caché de Cloudflare automáticamente.</p>

                                <button
                                    onClick={() => {
                                        if (confirm('¿Estás seguro de que quieres destruir todo este diseño? La página principal volverá a su estado aburrido original de inmediato (Storefront desactivado).')) {
                                            const resetConfig = { ...config, enabled: false, blocks: [] };
                                            setConfig(resetConfig);
                                            fetch('/api/storefront', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(resetConfig)
                                            }).then(() => alert('Storefront desactivado y limpiado.')).catch(() => alert('Error reseteando.'));
                                        }
                                    }}
                                    className="w-full mt-4 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 font-semibold"
                                >
                                    Botón de Pánico (Reset)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCoverSelector && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                            <div>
                                <h3 className="text-xl font-bold">Seleccionar Portada</h3>
                                <p className="text-xs text-gray-500">Sube fotos verticales a la carpeta PORTADAS en tu Drive para verlas aquí.</p>
                            </div>
                            <button onClick={() => setShowCoverSelector(null)} className="text-gray-500 hover:text-black">Cerrar ✕</button>
                        </div>
                        <div className="overflow-y-auto flex-grow pr-2">
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                {availableCovers.map(cover => (
                                    <div
                                        key={cover}
                                        className="cursor-pointer border-2 border-transparent hover:border-blue-500 rounded overflow-hidden group relative"
                                        onClick={() => handleSelectCover(cover)}
                                    >
                                        <div className="relative aspect-[4/5] w-full bg-gray-100">
                                            <Image src={cover} alt="cover option" fill className="object-cover transition-transform group-hover:scale-105" />
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-center">
                                            <p className="text-[10px] truncate text-white" title={cover.split('/').pop()}>{cover.split('/').pop()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {availableCovers.length === 0 && <p className="text-center py-10 text-gray-400">No hay imágenes disponibles. Añade imágenes en el folder PORTADAS y sincroniza.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
