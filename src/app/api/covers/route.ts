import { NextResponse } from 'next/server';
import { listFolderContents } from '@/lib/drive';
import { getConfig } from '@/lib/config';

export async function GET() {
    const config = await getConfig();

    if (!config.coversFolderId) {
        return NextResponse.json({ covers: [] });
    }

    try {
        const driveFiles = await listFolderContents(config.coversFolderId);

        // optimize: Get list of local files to avoid checking each individually
        const fs = require('fs/promises');
        const path = require('path');
        const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

        let localFiles = new Set<string>();
        try {
            const files = await fs.readdir(IMAGES_DIR);
            files.forEach((f: string) => {
                if (f.endsWith('.webp')) {
                    localFiles.add(f.replace('.webp', ''));
                }
            });
        } catch (e) {
            // Directory might not exist yet, ignore
        }

        // Filter for images and map to Proxy URL or Local URL
        const covers = driveFiles
            .filter(file => file.mimeType.startsWith('image/'))
            .map(file => {
                if (localFiles.has(file.id)) {
                    return `/images/${file.id}.webp`;
                }
                return `/api/image?id=${file.id}`;
            });

        return NextResponse.json({ covers });
    } catch (error) {
        console.error('Error fetching covers:', error);
        return NextResponse.json({ covers: [] });
    }
}
