// Tipos de configuración para la interfaz de Catálogo
// En la arquitectura Multi-Tenant, todas las configuraciones residen en Supabase (tenant_configs y settings JSONB)

export interface AppConfig {
    rootFolderId?: string;
    siteTitle: string;
    primaryColor: string;
    secondaryColor: string;
    gridColumns: number; // Columnas en desktop
    mobileGridColumns?: number; // Columnas en móvil
    coversFolderId?: string;
    folderCovers?: Record<string, string>; // Mapa de folder ID a imagen de portada
    adminEmail?: string;
    googleAnalyticsId?: string;
    analyticsPropertyId?: string;
    autoSyncEnabled?: boolean;
    autoSyncInterval?: number;
    autoSyncStartHour?: number;
    autoSyncEndHour?: number;
    seasonalEffect?: 'none' | 'snow' | 'hearts' | 'custom';
    seasonalCustomIcon?: string;
    seasonalDuration?: number;
    // Estética
    backgroundImage?: string;
    textColor?: string;
    hideAlbumTitles?: boolean;
    cardBorderWidth?: number;
    cardBorderColor?: string;
    clickEffect?: 'none' | 'stars' | 'hearts';
    favicon?: string;
    ogImage?: string;
    forceGlobalOgImage?: boolean;
    siteDescription?: string;
    logoUrl?: string;
    whatsappNumber?: string;
    theme?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
    rootFolderId: '',
    siteTitle: 'Mi Catálogo de Fotos',
    primaryColor: '#111827',
    secondaryColor: '#ffffff',
    gridColumns: 5,
    mobileGridColumns: 2,
    autoSyncEnabled: true,
    hideAlbumTitles: false,
    theme: 'light',
};
