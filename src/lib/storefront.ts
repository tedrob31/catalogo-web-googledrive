import { promises as fs } from 'fs';
import path from 'path';

// Define the absolute path for the storefront data
const STOREFRONT_FILE = path.join(process.cwd(), 'cache', 'storefront.json');

export type BlockType = 'hero_banner' | 'category_carousel' | 'promo_grid' | 'classic_grid' | 'rich_text';

export interface StorefrontBlock {
    id: string;
    type: BlockType;
    title?: string; // Optional title above the block
    
    // For single-image blocks (Hero)
    imageUrl?: string;
    linkHref?: string;

    // For multi-item blocks (Carousel, Promo Grid)
    items?: Array<{
        imageUrl: string;
        linkHref: string;
        title?: string;
    }>;
    
    // For rich text blocks
    textContent?: string;
    textAlignment?: 'left' | 'center' | 'right';
    textSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'title';
    textFont?: 'sans' | 'serif' | 'mono';
    textWeight?: 'normal' | 'bold' | 'light';
    
    // Block-specific settings
    aspectRatio?: 'auto' | 'square' | 'portrait' | 'video' | 'full' | 'intrinsic'; // Added 'intrinsic' para banners libres
    spacing?: 'none' | 'small' | 'medium' | 'large'; // Spacing top/bottom
    gridColumnsDesktop?: number; // For Classic Grid
    gridColumnsMobile?: number; // For Classic Grid
}

export interface StorefrontConfig {
    enabled: boolean;
    blocks: StorefrontBlock[];
}

const DEFAULT_STOREFRONT: StorefrontConfig = {
    enabled: false,
    blocks: [],
};

export async function getStorefront(): Promise<StorefrontConfig> {
    try {
        const fileContents = await fs.readFile(STOREFRONT_FILE, 'utf8');
        return { ...DEFAULT_STOREFRONT, ...JSON.parse(fileContents) };
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading storefront.json:', error);
        }
        return DEFAULT_STOREFRONT;
    }
}

export async function saveStorefront(config: StorefrontConfig): Promise<void> {
    try {
        // Ensure cache dir exists
        await fs.mkdir(path.dirname(STOREFRONT_FILE), { recursive: true });
        await fs.writeFile(STOREFRONT_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving storefront.json:', error);
        throw error;
    }
}
