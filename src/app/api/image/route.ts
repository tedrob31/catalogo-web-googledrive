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

        const buffer = Buffer.from(response.data as ArrayBuffer);

        // Manual Image Optimization using Sharp
        // This bypasses Next.js Image Optimization which was failing with network issues
        const widthParam = searchParams.get('w');
        let finalBuffer = buffer;
        let contentType = response.headers['content-type'] || 'image/jpeg';

        if (widthParam) {
            try {
                const width = parseInt(widthParam);
                if (!isNaN(width) && width > 0 && width <= 2000) {
                    // Resize logic
                    const sharp = require('sharp');
                    finalBuffer = await sharp(buffer)
                        .resize({ width: width, withoutEnlargement: true })
                        .jpeg({ quality: 80, mozjpeg: true }) // Compress efficiently
                        .toBuffer();
                    contentType = 'image/jpeg'; // Always JPEG after conversion
                }
            } catch (resizeError) {
                console.error('Sharp Resize Error:', resizeError);
                // Fallback to original buffer if resize fails
            }
        }

        const headers = new Headers();
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Content-Type', contentType);

        return new NextResponse(finalBuffer, { headers });

    } catch (error: any) {
        console.error('Proxy Error:', error.message);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
