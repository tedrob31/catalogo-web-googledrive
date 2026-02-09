import { NextRequest, NextResponse } from 'next/server';
import { getDriveService } from '@/lib/drive';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('id');

    if (!fileId) {
        return new NextResponse('Missing file ID', { status: 400 });
    }

    try {
        const drive = await getDriveService();

        // Check if we can get metadata first to get MIME type (optional, but good for headers)
        // Actually, getting stream directly is faster.

        // Fetch as arraybuffer for better compatibility with Next.js Response
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );

        const buffer = response.data; // This is ArrayBuffer or Buffer

        const headers = new Headers();
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        const contentType = response.headers['content-type'] || 'image/jpeg';
        headers.set('Content-Type', contentType);

        // Debug log (can be removed later)
        // console.log(`[API Image] Serving ${fileId} as ${contentType}, size: ${(buffer as any).length}`);

        return new NextResponse(buffer as any, { headers });

    } catch (error: any) {
        console.error('Proxy Error:', error.message);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
