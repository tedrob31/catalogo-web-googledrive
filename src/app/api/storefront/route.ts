import { NextResponse } from 'next/server';
import { getStorefront, saveStorefront } from '@/lib/storefront';
import { revalidatePath } from 'next/cache';

export async function GET() {
    const storefront = await getStorefront();
    return NextResponse.json(storefront);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Save the new config
        await saveStorefront(body);

        // Revalidate internal Next.js cache for the root page where storefront is shown
        revalidatePath('/', 'layout');

        // Note: For Phase 2 we simply purge the root of Cloudflare since storefront lives at `/`
        const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
        const cfToken = process.env.CLOUDFLARE_API_TOKEN;

        if (cfZoneId && cfToken) {
            const domain = process.env.NEXT_PUBLIC_DOMAIN_NAME || 'localhost';
            const protocol = domain.includes('localhost') ? 'http://' : 'https://';
            const base = `${protocol}${domain}`;
            
            fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cfToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ files: [`${base}/`] })
            }).catch(err => console.error('CF Purge Error from storefront:', err));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Storefront error:', error);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
