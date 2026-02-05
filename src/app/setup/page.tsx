'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupWizard() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [jsonContent, setJsonContent] = useState<string>('');
    const [folderId, setFolderId] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [error, setError] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'application/json') {
            processFile(droppedFile);
        } else {
            setError('Please drop a valid JSON file');
        }
    };

    const processFile = (file: File) => {
        setFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setJsonContent(e.target.result as string);
                setError('');
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!jsonContent) {
            setError('Please upload your credentials.json file');
            return;
        }
        if (!adminPass) {
            setError('Admin Password is required to verify identity');
            return;
        }

        setIsTesting(true);
        setError('');

        try {
            const res = await fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentials: jsonContent,
                    rootFolderId: folderId,
                    adminPass: adminPass
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Success! Redirecting to home...');
                router.push('/');
                router.refresh();
            } else {
                setError(data.error + (data.details ? ` (${data.details})` : ''));
            }
        } catch (err) {
            setError('Network error or server unreachable');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-zinc-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Setup Wizard
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Initialize your Photo Catalog
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                            ${file
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                : 'border-gray-300 dark:border-zinc-600 hover:border-blue-500 dark:hover:border-blue-500'}`}
                    >
                        <div className="space-y-2">
                            <div className="text-4xl">📄</div>
                            {file ? (
                                <div className="text-green-600 font-medium overflow-hidden text-ellipsis">
                                    {file.name}
                                </div>
                            ) : (
                                <>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">
                                        Drop credentials.json here
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Or click to select (drag preferred)
                                    </p>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                                        className="opacity-0 absolute inset-0 cursor-pointer w-full h-full" // Hacky overlay for click
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Inputs */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Root Folder ID (Optional)</label>
                        <input
                            type="text"
                            value={folderId}
                            onChange={(e) => setFolderId(e.target.value)}
                            placeholder="e.g. 1A2B3C..."
                            className="w-full p-2 rounded border dark:bg-zinc-700 dark:border-zinc-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">Found in the Google Drive URL of your folder</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Admin Password</label>
                        <input
                            type="password"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            placeholder="Check your docker-compose env"
                            className="w-full p-2 rounded border dark:bg-zinc-700 dark:border-zinc-600"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200">
                            🚨 {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isTesting}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-all
                            ${isTesting
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'}`}
                    >
                        {isTesting ? 'Verifying Connection...' : 'Save & Initialize 🚀'}
                    </button>
                </form>
            </div>
        </div>
    );
}
