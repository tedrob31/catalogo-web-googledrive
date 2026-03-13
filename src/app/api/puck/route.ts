import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Define the absolute path for the Puck data
const PUCK_FILE = path.join(process.cwd(), 'cache', 'puck-storefront.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(PUCK_FILE, 'utf8');
        return NextResponse.json(JSON.parse(fileContents));
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading puck-storefront.json:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
        // Return null/empty payload if it doesn't exist yet
        return NextResponse.json(null);
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        
        // Ensure cache dir exists
        await fs.mkdir(path.dirname(PUCK_FILE), { recursive: true });
        
        // Save payload to file
        await fs.writeFile(PUCK_FILE, JSON.stringify(data, null, 2));
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save puck configuration:', error);
        return NextResponse.json(
            { error: 'Failed to save configuration' },
            { status: 500 }
        );
    }
}
