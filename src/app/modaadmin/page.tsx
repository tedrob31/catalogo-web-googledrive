'use client';

import { useState, useEffect } from 'react';
import { AppConfig } from '@/lib/config';
import { CacheStructure, Album } from '@/lib/types';
import Image from 'next/image';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AdminDashboard() {
    const [authorized, setAuthorized] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [config, setConfig] = useState<AppConfig>({
        rootFolderId: '',
        siteTitle: '',
        primaryColor: '',
        secondaryColor: '',
        gridColumns: 5,
        folderCovers: {}
    });

    const [cache, setCache] = useState<CacheStructure | null>(null);
    const [syncStatus, setSyncStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchConfig();
        fetchCache();
    }, [authorized]);

    const [availableCovers, setAvailableCovers] = useState<string[]>([]);
    const [showCoverSelector, setShowCoverSelector] = useState<string | null>(null); // Folder ID to select for

    useEffect(() => {
        fetchConfig();
        fetchCache();
        fetchCovers();
    }, [authorized]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
            setAuthorized(true);
        } else {
            alert('Invalid credentials');
        }
    };

    const fetchConfig = async () => {
        if (!authorized) return;
        const res = await fetch('/api/config');
        if (res.ok) {
            setConfig(await res.json());
        }
    };

    const fetchCovers = async () => {
        if (!authorized) return;
        const res = await fetch('/api/covers');
        if (res.ok) {
            const data = await res.json();
            setAvailableCovers(data.covers);
        }
    };

    const fetchCache = async () => {
        if (!authorized) return;
        const res = await fetch('/api/sync', { method: 'GET' });
        if (res.ok) {
            setCache(await res.json());
        }
    };

    const saveConfig = async (newConfig: AppConfig) => {
        setIsLoading(true);
        await fetch('/api/config', {
            method: 'POST',
            body: JSON.stringify(newConfig),
        });
        setIsLoading(false);
        setConfig(newConfig);
    };

    const handleSaveConfig = async () => {
        await saveConfig(config);
        alert('Config saved!');
    };

    const handleSync = async () => {
        if (confirm('This will rescan the Drive. Continue?')) {
            setSyncStatus('Syncing... this may take a while.');
            const res = await fetch('/api/sync', { method: 'POST' });
            if (res.ok) {
                setSyncStatus('Sync complete!');
                fetchCache(); // Refresh structure
            } else {
                setSyncStatus('Sync failed.');
            }
        }
    };

    const handleUploadCover = async (folderId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', folderId);

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            // Update config with new cover AND SAVE IT
            const newCovers = { ...config.folderCovers, [folderId]: data.path };
            const newConfig = { ...config, folderCovers: newCovers };

            await saveConfig(newConfig);
            fetchCovers(); // Refresh list
            alert('Cover uploaded and saved!');
        } else {
            alert('Upload failed');
        }
    };

    const handleSelectCover = async (folderId: string, coverPath: string) => {
        let newConfig = { ...config };

        if (folderId === '__BG__') {
            newConfig.backgroundImage = coverPath;
        } else if (folderId === '__ICON__') {
            newConfig.seasonalCustomIcon = coverPath;
        } else if (folderId === '__OG__') {
            newConfig.ogImage = coverPath;
        } else if (folderId === '__FAVICON__') {
            newConfig.favicon = coverPath;
        } else {
            // Normal album cover
            const newCovers = { ...config.folderCovers, [folderId]: coverPath };
            newConfig.folderCovers = newCovers;
        }

        await saveConfig(newConfig);
        setShowCoverSelector(null);
    }

    // Helper to flatten albums for the dropdown/list
    const getAllAlbums = (album: Album): Album[] => {
        let list = [album];
        album.subAlbums.forEach(sub => {
            list = list.concat(getAllAlbums(sub));
        });
        return list;
    };

    if (!authorized) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <form onSubmit={handleLogin} className="p-8 bg-white rounded shadow-md flex flex-col gap-4">
                    <h1 className="text-xl font-bold">Admin Login</h1>
                    <input className="border p-2" placeholder="User" value={username} onChange={e => setUsername(e.target.value)} />
                    <input className="border p-2" type="password" placeholder="Pass" value={password} onChange={e => setPassword(e.target.value)} />
                    <button className="bg-blue-600 text-white p-2 rounded" type="submit">Login</button>
                </form>
            </div>
        );
    }

    const allAlbums = cache?.root ? getAllAlbums(cache.root) : [];

    return (
        <div className="max-w-4xl mx-auto p-8 mb-20 relative">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            {/* Selector Modal */}
            {showCoverSelector && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Select Cover for Folder</h3>
                            <button onClick={() => setShowCoverSelector(null)} className="text-red-500">Close</button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {availableCovers.map(cover => (
                                <div
                                    key={cover}
                                    className="cursor-pointer border hover:border-blue-500 p-1 rounded"
                                    onClick={() => handleSelectCover(showCoverSelector, cover)}
                                >
                                    <div className="relative aspect-[4/5] w-full">
                                        <Image src={cover} alt="cover option" fill className="object-cover" />
                                    </div>
                                    <p className="text-xs truncate mt-1">{cover.split('/').pop()}</p>
                                </div>
                            ))}
                        </div>
                        {availableCovers.length === 0 && <p>No existing covers found.</p>}
                    </div>
                </div>
            )}

            <div className="grid gap-8">
                <section className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Root Folder ID (Drive)</label>
                            <input
                                className="w-full border p-2 rounded"
                                value={config.rootFolderId}
                                placeholder="Paste Folder ID or URL"
                                onChange={e => {
                                    let val = e.target.value;
                                    if (val.includes('/folders/')) {
                                        const parts = val.split('/folders/');
                                        if (parts[1]) {
                                            val = parts[1].split('?')[0];
                                        }
                                    }
                                    setConfig({ ...config, rootFolderId: val })
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Auto-Sync Interval (Minutes)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="w-32 border p-2 rounded"
                                    value={config.autoSyncInterval || 0}
                                    min="0"
                                    onChange={e => setConfig({ ...config, autoSyncInterval: parseInt(e.target.value) })}
                                />
                                <span className="text-sm text-gray-500">
                                    {(config.autoSyncInterval || 0) === 0 ? '(Disabled)' : 'Wait time before refreshing stale content'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Covers Folder ID (Drive)</label>
                            <input
                                className="w-full border p-2 rounded"
                                value={config.coversFolderId || ''}
                                placeholder="Paste ID of folder to save covers in"
                                onChange={e => {
                                    let val = e.target.value;
                                    if (val.includes('/folders/')) {
                                        const parts = val.split('/folders/');
                                        if (parts[1]) {
                                            val = parts[1].split('?')[0];
                                        }
                                    }
                                    setConfig({ ...config, coversFolderId: val })
                                }}
                            />
                            <p className="text-xs text-gray-400 mt-1">Create a folder in Drive called "PORTADAS" and paste its ID here.</p>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <h3 className="font-bold mb-2">Google Analytics 4</h3>
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-sm font-medium">Measurement ID (G-XXXXXXX)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={config.googleAnalyticsId || ''}
                                        placeholder="G-ABC123456"
                                        onChange={e => setConfig({ ...config, googleAnalyticsId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Property ID (Numeric)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={config.analyticsPropertyId || ''}
                                        placeholder="123456789"
                                        onChange={e => setConfig({ ...config, analyticsPropertyId: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-400">Required for viewing reports in this dashboard.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <h3 className="font-bold mb-2">Seasonal Effects</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Effect Type</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        value={config.seasonalEffect || 'none'}
                                        onChange={e => setConfig({ ...config, seasonalEffect: e.target.value as any })}
                                    >
                                        <option value="none">None</option>
                                        <option value="snow">Snow</option>
                                        <option value="hearts">Hearts</option>
                                        <option value="custom">Custom Icon</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Duration (Seconds)</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={config.seasonalDuration || 0}
                                        min="0"
                                        placeholder="0 (Infinite)"
                                        onChange={e => setConfig({ ...config, seasonalDuration: parseInt(e.target.value) })}
                                    />
                                    <p className="text-xs text-gray-400">0 = Infinite</p>
                                </div>
                            </div>

                            {config.seasonalEffect === 'custom' && (
                                <div className="mt-2 p-2 border border-blue-100 bg-blue-50 rounded">
                                    <label className="block text-sm font-medium mb-1">Custom Icon Upload</label>
                                    <div className="flex items-center gap-4">
                                        {config.seasonalCustomIcon ? (
                                            <div className="relative w-10 h-10">
                                                <Image src={config.seasonalCustomIcon} alt="Custom Icon" fill className="object-contain" />
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-500">No icon</span>
                                        )}
                                        <button
                                            onClick={() => setShowCoverSelector('__ICON__')}
                                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                        >
                                            Select from Library
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Select a small transparent PNG/SVG from your Covers folder.</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <h3 className="font-bold mb-2">Aesthetics</h3>

                            <div className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded border">
                                    <label className="block text-sm font-medium mb-2">Background Image</label>
                                    <div className="flex items-center gap-4">
                                        {config.backgroundImage ? (
                                            <div className="relative w-16 h-16 border bg-white">
                                                <Image src={config.backgroundImage} alt="Background" fill className="object-cover" />
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Default (White/Dark)</span>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => setShowCoverSelector('__BG__')}
                                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                            >
                                                Select from Library
                                            </button>
                                            {config.backgroundImage && (
                                                <button
                                                    onClick={() => setConfig({ ...config, backgroundImage: undefined })}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Remove Background
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Text Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="h-8 w-12 border p-0"
                                                value={config.textColor || '#000000'}
                                                onChange={e => setConfig({ ...config, textColor: e.target.value })}
                                            />
                                            <span className="text-xs text-gray-500">Pick global text color</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium">Click Effect</label>
                                        <select
                                            className="w-full border p-2 rounded"
                                            value={config.clickEffect || 'none'}
                                            onChange={e => setConfig({ ...config, clickEffect: e.target.value as any })}
                                        >
                                            <option value="none">None</option>
                                            <option value="stars">Stars / Sparkles</option>
                                            <option value="hearts">Hearts</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Card Border Width (px)</label>
                                        <input
                                            type="number"
                                            className="w-full border p-2 rounded"
                                            value={config.cardBorderWidth || 1}
                                            min="0"
                                            onChange={e => setConfig({ ...config, cardBorderWidth: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Card Border Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                className="h-8 w-12 border p-0"
                                                value={config.cardBorderColor || '#e5e7eb'}
                                                onChange={e => setConfig({ ...config, cardBorderColor: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <h3 className="font-bold mb-2">SEO & Social Sharing</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium">Site Title (Browser Tab)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={config.siteTitle}
                                        onChange={e => setConfig({ ...config, siteTitle: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Site Description (Search Results)</label>
                                    <textarea
                                        className="w-full border p-2 rounded"
                                        rows={2}
                                        value={config.siteDescription || ''}
                                        placeholder="View our professional photo collection..."
                                        onChange={e => setConfig({ ...config, siteDescription: e.target.value })}
                                    />
                                </div>
                                <div className="p-3 bg-gray-50 rounded border">
                                    <label className="block text-sm font-medium mb-2">Global Preview Image (OG Image)</label>
                                    <div className="flex items-center gap-4">
                                        {config.ogImage ? (
                                            <div className="relative w-24 h-16 border bg-white">
                                                <Image src={config.ogImage} alt="OG Preview" fill className="object-cover" />
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Default (Empty)</span>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => setShowCoverSelector('__OG__')}
                                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                            >
                                                Select Image
                                            </button>
                                            {config.ogImage && (
                                                <button
                                                    onClick={() => setConfig({ ...config, ogImage: undefined })}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="forceGlobal"
                                            checked={config.forceGlobalOgImage || false}
                                            onChange={e => setConfig({ ...config, forceGlobalOgImage: e.target.checked })}
                                        />
                                        <label htmlFor="forceGlobal" className="text-sm text-gray-700">
                                            Force this image on ALL pages (Prevents distinct album covers)
                                        </label>
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded border">
                                    <label className="block text-sm font-medium mb-2">Favicon (Browser Tab Icon)</label>
                                    <div className="flex items-center gap-4">
                                        {config.favicon ? (
                                            <div className="relative w-10 h-10 border bg-white p-1">
                                                <Image src={config.favicon} alt="Favicon" fill className="object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 border bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                                                Default
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => setShowCoverSelector('__FAVICON__')}
                                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                            >
                                                Select Icon
                                            </button>
                                            {config.favicon && (
                                                <button
                                                    onClick={() => setConfig({ ...config, favicon: undefined })}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Reset to Default
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Recommended: Square image (PNG/ICO), transparent background.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <h3 className="font-bold mb-2">Display Settings</h3>
                            <div>
                                <label className="block text-sm font-medium">Grid Columns (Desktop)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded"
                                    value={config.gridColumns}
                                    onChange={e => setConfig({ ...config, gridColumns: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Grid Columns (Mobile)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded"
                                    value={config.mobileGridColumns || 2}
                                    onChange={e => setConfig({ ...config, mobileGridColumns: parseInt(e.target.value) })}
                                />
                            </div>
                            <button
                                onClick={handleSaveConfig}
                                disabled={isLoading}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Config'}
                            </button>
                        </div>
                    </div>
                </section>

                <section className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-semibold mb-4">Actions</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSync}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Sync Catalog
                        </button>
                        <span className="text-gray-600">{syncStatus}</span>
                    </div>
                </section>

                <section className="bg-white p-6 rounded shadow">
                    <h2 className="text-xl font-semibold mb-4">Folder Covers</h2>
                    {/* ... existing cover implementation ... */}
                    {allAlbums.length === 0 ? (
                        <p className="text-yellow-600">No albums found. Run Sync first.</p>
                    ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto border p-4 rounded">
                            {allAlbums.map(album => (
                                <div key={album.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    {/* ... truncated for brevity ... */}
                                    <div>
                                        <p className="font-medium">{album.name}</p>
                                        <p className="text-xs text-gray-400">{album.id} ({album.photos.length} photos)</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {(config.folderCovers && config.folderCovers[album.id]) ? (
                                            <div className="relative w-12 h-12 rounded overflow-hidden group">
                                                <Image
                                                    src={config.folderCovers[album.id]}
                                                    alt="Cover"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">Default</span>
                                        )}

                                        <button
                                            onClick={() => setShowCoverSelector(album.id)}
                                            className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                                        >
                                            Select Existing
                                        </button>

                                        <label className="cursor-pointer text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                                            Upload New
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        handleUploadCover(album.id, e.target.files[0]);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {config.analyticsPropertyId && (
                    <section className="mt-8">
                        <h2 className="text-xl font-semibold mb-4">Analytics Dashboard</h2>
                        <AnalyticsDashboard />
                    </section>
                )}
            </div>
        </div>
    );
}
