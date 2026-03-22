import { StorefrontConfig } from '@/lib/storefront';
import HeroBanner from './HeroBanner';
import CategoryCarousel from './CategoryCarousel';
import ClassicGrid from './ClassicGrid';
import PromoGrid from './PromoGrid';
import RichTextBlock from './RichTextBlock';
import { AppConfig } from '@/lib/config';

interface StorefrontViewProps {
    storefront: StorefrontConfig;
    appConfig: AppConfig;
    isPreview?: boolean;
}

export default function StorefrontView({ storefront, appConfig, isPreview = false }: StorefrontViewProps) {
    if (!storefront.enabled || !storefront.blocks || storefront.blocks.length === 0) {
        return null;
    }

    // Example logic for desktop/mobile grid cols, same as AlbumCard view
    const desktopCols = appConfig.gridColumns || 5;
    const mobileCols = appConfig.mobileGridColumns || 2;
    const gridColsCls = `grid-cols-${mobileCols} md:grid-cols-${desktopCols}`;

    return (
        <div suppressHydrationWarning className="w-full max-w-[1400px] mx-auto min-h-screen pb-20">
            {storefront.blocks.map((block, idx) => {
                switch (block.type) {
                    case 'hero_banner':
                        return <HeroBanner key={block.id} block={block} isPreview={isPreview} />;
                    case 'category_carousel':
                        return <CategoryCarousel key={block.id} block={block} isPreview={isPreview} />;
                    case 'classic_grid':
                        return <ClassicGrid key={block.id} block={block} gridColsCls={gridColsCls} isPreview={isPreview} />;
                    case 'promo_grid':
                         return <PromoGrid key={block.id} block={block} isPreview={isPreview} />;
                    case 'rich_text':
                         return <RichTextBlock key={block.id} block={block} />;
                    default:
                        return null;
                }
            })}
        </div>
    );
}
