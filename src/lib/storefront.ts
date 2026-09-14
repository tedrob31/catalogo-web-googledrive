// Definiciones de tipos para el constructor visual de Storefront (Página de Inicio)
// En la arquitectura Multi-Tenant, toda la persistencia se realiza en Supabase (tenant_configs.settings.storefront)

export type BlockType = 'hero_banner' | 'category_carousel' | 'promo_grid' | 'classic_grid' | 'rich_text';

export interface StorefrontBlock {
    id: string;
    type: BlockType;
    title?: string; // Título opcional sobre el bloque
    
    // Para bloques de imagen única (Hero)
    imageUrl?: string;
    linkHref?: string;

    // Para bloques multi-item (Carrusel, Promo Grid)
    items?: Array<{
        imageUrl: string;
        linkHref: string;
        title?: string;
    }>;
    
    // Para bloques de texto enriquecido
    textContent?: string;
    textAlignment?: 'left' | 'center' | 'right';
    textSize?: 'small' | 'medium' | 'large' | 'xlarge' | 'title';
    textFont?: 'sans' | 'serif' | 'mono';
    textWeight?: 'normal' | 'bold' | 'light';
    
    // Configuraciones de estilo del bloque
    aspectRatio?: 'auto' | 'square' | 'portrait' | 'video' | 'full' | 'intrinsic';
    spacing?: 'none' | 'small' | 'medium' | 'large';
    gridColumnsDesktop?: number;
    gridColumnsMobile?: number;
}

export interface StorefrontConfig {
    enabled: boolean;
    blocks: StorefrontBlock[];
}

export const DEFAULT_STOREFRONT: StorefrontConfig = {
    enabled: false,
    blocks: [],
};
