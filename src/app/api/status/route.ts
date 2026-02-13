
import { NextResponse } from 'next/server';
import { getSystemStatus } from '@/lib/status';

export async function GET() {
    try {
        const status = await getSystemStatus();
        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
