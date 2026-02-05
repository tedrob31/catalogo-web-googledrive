import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/drive';
import { getConfig } from '@/lib/config';

export async function POST(request: Request) {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    // We might still receive folderId but we ignore it for *where* to store, 
    // unless we want to organize subfolders. 
    // For now we store all covers in the central coversFolderId.

    if (!file) {
        return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    const config = await getConfig();
    if (!config.coversFolderId) {
        return NextResponse.json({ error: 'Covers Folder ID not configured in Admin' }, { status: 400 });
    }

    try {
        const driveFile = await uploadFile(config.coversFolderId, file);

        // Return the Proxy URL format
        return NextResponse.json({
            success: true,
            path: `/api/image?id=${driveFile.id}`
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload to Drive failed', details: error.message }, { status: 500 });
    }
}
