import Image from 'next/image';
import Link from 'next/link';
import { StorefrontBlock } from '@/lib/storefront';

interface PromoGridProps {
    block: StorefrontBlock;
    isPreview?: boolean;
}

export default function PromoGrid({ block, isPreview }: PromoGridProps) {
    // Promo Grid expects exactly 3 items to look good (1 main, 2 stacked)
    if (!block.items || block.items.length < 3) {
        return (
            <div className="w-full my-8 p-4 text-center border-2 border-dashed rounded text-gray-400">
                El Promo Grid requiere al menos 3 elementos para mostrar el estilo mosaico.
            </div>
        );
    }

    let spacingClass = 'my-6';
    if (block.spacing === 'none') spacingClass = 'my-0';
    if (block.spacing === 'small') spacingClass = 'my-2';
    if (block.spacing === 'large') spacingClass = 'my-12';

    const [mainItem, sub1, sub2] = block.items;

    return (
        <div className={`w-full px-2 md:px-4 ${spacingClass}`}>
            {block.title && (
                <h3 className="text-xl md:text-2xl font-bold mb-4">{block.title}</h3>
            )}
            
            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                
                {/* Main Large Item (Left) */}
                {(() => {
                    const Wrapper = mainItem.linkHref && !isPreview ? Link : 'div';
                    const props = mainItem.linkHref && !isPreview ? { href: mainItem.linkHref, prefetch: false } : {};
                    
                    return (
                        <Wrapper {...props as any} className="group relative block aspect-square md:aspect-auto md:h-[600px] overflow-hidden rounded-none bg-gray-100">
                            <Image
                                src={mainItem.imageUrl}
                                alt={mainItem.title || 'Promo hero'}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                            {mainItem.title && (
                                <div className="absolute bottom-6 left-6 right-6">
                                    <h4 className="text-white text-3xl font-bold tracking-tight">{mainItem.title}</h4>
                                    <span className="inline-block mt-2 text-white/80 uppercase text-sm font-semibold tracking-wider group-hover:text-white transition-colors">
                                        Ver Colección →
                                    </span>
                                </div>
                            )}
                        </Wrapper>
                    );
                })()}

                {/* Stacked Sub Items (Right/Bottom) */}
                <div className="grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-2 md:gap-3 h-auto md:h-[600px]">
                    {(() => {
                        const Wrapper1 = sub1.linkHref && !isPreview ? Link : 'div';
                        const props1 = sub1.linkHref && !isPreview ? { href: sub1.linkHref, prefetch: false } : {};
                        return (
                            <Wrapper1 {...props1 as any} className="group relative block w-full aspect-square md:aspect-auto md:h-full overflow-hidden rounded-none bg-gray-100">
                                <Image src={sub1.imageUrl} alt={sub1.title || 'Promo sub 1'} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                {sub1.title && (
                                    <div className="absolute bottom-6 left-4 md:left-6 right-4 md:right-6 md:translate-y-4 opacity-100 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300">
                                        <h4 className="text-white text-lg md:text-xl font-bold">{sub1.title}</h4>
                                    </div>
                                )}
                            </Wrapper1>
                        );
                    })()}

                    {(() => {
                        const Wrapper2 = sub2.linkHref && !isPreview ? Link : 'div';
                        const props2 = sub2.linkHref && !isPreview ? { href: sub2.linkHref, prefetch: false } : {};
                        return (
                            <Wrapper2 {...props2 as any} className="group relative block w-full aspect-square md:aspect-auto md:h-full overflow-hidden rounded-none bg-gray-100">
                                <Image src={sub2.imageUrl} alt={sub2.title || 'Promo sub 2'} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                {sub2.title && (
                                    <div className="absolute bottom-6 left-4 md:left-6 right-4 md:right-6 md:translate-y-4 opacity-100 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300">
                                        <h4 className="text-white text-lg md:text-xl font-bold">{sub2.title}</h4>
                                    </div>
                                )}
                            </Wrapper2>
                        );
                    })()}
                </div>

            </div>
        </div>
    );
}
