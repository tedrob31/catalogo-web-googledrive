import { promises as fs } from 'fs';
import path from 'path';

export type BlockType = 'hero_banner' | 'category_carousel' | 'promo_grid' | 'classic_grid';

export interface StorefrontBlock {
    id: string;
    type: BlockType;
    title?: string;
    imageUrl?: string;
    linkHref?: string;
    items?: Array<{
        imageUrl: string;
        linkHref: string;
        title?: string;
    }>;
    aspectRatio?: 'auto' | 'square' | 'portrait' | 'video' | 'full';
    spacing?: 'none' | 'small' | 'medium' | 'large';
    autoplay?: boolean;
    gridColumnsDesktop?: number;
    gridColumnsMobile?: number;
}

const PUCK_FILE = path.join(process.cwd(), 'cache', 'puck-storefront.json');

export async function getStorefront(): Promise<any> {
    try {
        const fileContents = await fs.readFile(PUCK_FILE, 'utf8');
        return JSON.parse(fileContents);
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading puck-storefront.json:', error);
        }
        return null;
    }
}
