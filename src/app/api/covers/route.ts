import { NextResponse } from 'next/server';
import { listFolderContents } from '@/lib/drive';
import { getConfig } from '@/lib/config';

export async function GET() {
    const config = await getConfig();

    if (!config.coversFolderId) {
        return NextResponse.json({ covers: [] });
    }

    try {
        const files = await listFolderContents(config.coversFolderId);

        // Filter for images and map to Proxy URL
        const covers = files
            .filter(file => file.mimeType.startsWith('image/'))
            .map(file => `/api/image?id=${file.id}`);

        return NextResponse.json({ covers });
    } catch (error) {
        console.error('Error fetching covers:', error);
        return NextResponse.json({ covers: [] });
    }
}
