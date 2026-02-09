import fs from 'fs/promises';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'cache', 'config.json');

export interface AppConfig {
    rootFolderId: string;
    siteTitle: string;
    primaryColor: string;
    secondaryColor: string;
    gridColumns: number; // For desktop
    mobileGridColumns?: number; // For mobile
    coversFolderId?: string; // Google Drive Folder ID for covers
    folderCovers?: Record<string, string>; // Map folder ID to cover image URL (or Drive ID)
    googleAnalyticsId?: string; // Measurement ID (G-XXXXX)
    analyticsPropertyId?: string; // Numeric Property ID for API
    autoSyncInterval?: number; // Minutes. 0 = disabled.
    seasonalEffect?: 'none' | 'snow' | 'hearts' | 'custom';
    seasonalCustomIcon?: string; // Proxy URL to image
    seasonalDuration?: number; // Seconds. 0 = infinite.
    // Aesthetics
    backgroundImage?: string;
    textColor?: string;
    cardBorderWidth?: number;
    cardBorderColor?: string;
    clickEffect?: 'none' | 'stars' | 'hearts';
    // SEO & Social
    ogImage?: string; // Path or URL to global Preview Image
    forceGlobalOgImage?: boolean; // If true, always use global image instead of album cover
    siteDescription?: string; // Custom description for search engines
}

const DEFAULT_CONFIG: AppConfig = {
    rootFolderId: '', // User must set this
    siteTitle: 'Mi Catálogo de Fotos',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    gridColumns: 5,
};

export async function getConfig(): Promise<AppConfig> {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
        return DEFAULT_CONFIG;
    }
}

export async function saveConfig(config: AppConfig) {
    const dir = path.dirname(CONFIG_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
