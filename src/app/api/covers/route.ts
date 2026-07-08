import { NextResponse } from 'next/server';
import { listFolderContents } from '@/lib/drive';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
    const config = await getConfig();

    if (!config.coversFolderId) {
        return NextResponse.json({ covers: [] });
    }

    try {
        const driveFiles = await listFolderContents(config.coversFolderId);
        
        const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.r4tlabs.com';
        const DOMAIN_PREFIX = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'default';
        const syncMode = process.env.SYNC_MODE || 'LOCAL';

        const covers = driveFiles
            .filter(file => file.mimeType.startsWith('image/'))
            .map(file => {
                const vParam = file.modifiedTime ? `?v=${new Date(file.modifiedTime).getTime()}` : '';
                const remoteFilename = `${DOMAIN_PREFIX}/${file.id}.webp`;
                
                if (syncMode === 'LOCAL') {
                    return `/images/${remoteFilename}${vParam}`;
                } else {
                    return `${CDN_URL}/${remoteFilename}${vParam}`;
                }
            });

        return NextResponse.json({ covers });
    } catch (error) {
        console.error('Error fetching covers:', error);
        return NextResponse.json({ covers: [] });
    }
}
