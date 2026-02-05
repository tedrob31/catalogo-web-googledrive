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

        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        // Create a new response with the stream
        // We need to cast the stream to ReadableStream or compatible
        // @ts-ignore
        const stream = response.data;

        const headers = new Headers();
        headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache aggressively
        headers.set('Content-Type', response.headers['content-type'] || 'image/jpeg');

        return new NextResponse(stream as any, { headers });

    } catch (error: any) {
        console.error('Proxy Error:', error.message);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
