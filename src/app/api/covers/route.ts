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
        
        const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || '';
        const DOMAIN_PREFIX = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'default';

        // Ahora todo usa la CDN. 
        // Si no está procesada aún, el CDN dará 404, pero se procesará en el siguiente sync.
        // Dado que este es el panel de admin y asume que se corrió un sync tras añadir el cover.
        const covers = driveFiles
            .filter(file => file.mimeType.startsWith('image/'))
            .map(file => {
                const vParam = file.modifiedTime ? `?v=${new Date(file.modifiedTime).getTime()}` : '';
                return `${CDN_URL}/${DOMAIN_PREFIX}/${file.id}.webp${vParam}`;
            });

        return NextResponse.json({ covers });
    } catch (error) {
        console.error('Error fetching covers:', error);
        return NextResponse.json({ covers: [] });
    }
}
