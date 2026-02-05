import { NextResponse } from 'next/server';
import { syncDrive, loadCache } from '@/lib/cache';
import { getConfig } from '@/lib/config';

export async function POST() {
    try {
        const config = await getConfig();
        if (!config.rootFolderId) {
            return NextResponse.json({ error: 'Root Folder ID not configured' }, { status: 400 });
        }

        // Trigger sync
        // Note: this might take a long time. For a production app, use background jobs.
        // For this scope, we await it or just fire and forget (but user wants confirmation).
        // We'll await it for now, assuming the catalog isn't massive, or Vercel functions might time out.
        // Given the requirements "Writing Atomic", "Diffing", it implies we want robustness.

        // We'll return a stream or just wait. Let's wait for simplicity first.
        await syncDrive(config.rootFolderId);

        return NextResponse.json({ success: true, message: 'Sync complete' });
    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    const cache = await loadCache();
    return NextResponse.json(cache || {});
}
