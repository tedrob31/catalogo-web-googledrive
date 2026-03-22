'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontBlock } from '@/lib/storefront';

interface CategoryCarouselProps {
    block: StorefrontBlock;
    isPreview?: boolean;
}

export default function CategoryCarousel({ block, isPreview }: CategoryCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!block.items || block.items.length === 0) return null;

    let aspectClass = 'aspect-square';
    if (block.aspectRatio === 'portrait') aspectClass = 'aspect-[4/5]';
    if (block.aspectRatio === 'auto') aspectClass = 'aspect-[4/5]'; // Default for carousel

    let spacingClass = 'my-6'; // Default medium
    if (block.spacing === 'none') spacingClass = 'my-0';
    if (block.spacing === 'small') spacingClass = 'my-2';
    if (block.spacing === 'large') spacingClass = 'my-12';

    // Autoplay logic
    useEffect(() => {
        if (isPreview || !block.autoplay || !scrollContainerRef.current) return;
        
        let interval: NodeJS.Timeout;
        const autoScroll = () => {
            if (scrollContainerRef.current) {
                const maxScrollLeft = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
                // If reached end, scroll back to 0, otherwise increment
                if (scrollContainerRef.current.scrollLeft >= maxScrollLeft - 10) {
                    scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                }
            }
        };

        interval = setInterval(autoScroll, 3000);
        return () => clearInterval(interval);
    }, [block.autoplay]);

    return (
        <div className={`w-full ${spacingClass}`}>
            {block.title && (
                <h3 className="text-xl md:text-2xl font-bold mb-4 px-2">{block.title}</h3>
            )}
            
            <div className="relative">
                {/* Horizontal scrollable container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-2 md:gap-3 px-2 pb-4 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {block.items.map((item, idx) => {
                        const content = (
                            <>
                                <div className={`relative w-full ${aspectClass} overflow-hidden rounded-none bg-gray-100 mb-2 shadow-sm border border-black/5`}>
                                    {item.imageUrl ? (
                                        isPreview ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={item.imageUrl} alt={item.title || `Category ${idx}`} className="object-cover w-full h-full absolute inset-0 transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.title || `Category ${idx}`}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500 text-xs text-center p-2">Sin Imagen</div>
                                    )}
                                </div>
                                {item.title && (
                                    <h4 className="font-semibold text-lg text-center group-hover:text-blue-600 transition-colors">
                                        {item.title}
                                    </h4>
                                )}
                            </>
                        );

                        const wrapperCls = "flex-none w-48 md:w-64 snap-start group block";

                        return item.linkHref && !isPreview ? (
                            <Link key={idx} href={item.linkHref} prefetch={false} className={wrapperCls}>
                                {content}
                            </Link>
                        ) : (
                            <div key={idx} className={wrapperCls}>
                                {content}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Minimal CSS snippet to hide scrollbar for webkit (Chrome/Safari) */}
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
