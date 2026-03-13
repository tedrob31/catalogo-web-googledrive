'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontBlock } from '@/lib/storefront';

interface CategoryCarouselProps {
    block: StorefrontBlock;
}

export default function CategoryCarousel({ block }: CategoryCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!block.items || block.items.length === 0) return null;

    let aspectClass = 'aspect-square';
    if (block.aspectRatio === 'portrait') aspectClass = 'aspect-[4/5]';
    if (block.aspectRatio === 'auto') aspectClass = 'aspect-[4/5]'; // Default for carousel

    let spacingClass = 'my-12'; // Default medium
    if (block.spacing === 'none') spacingClass = 'my-0';
    if (block.spacing === 'small') spacingClass = 'my-6';
    if (block.spacing === 'large') spacingClass = 'my-20';

    // Autoplay logic
    useEffect(() => {
        if (!block.autoplay || !scrollContainerRef.current) return;
        
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
                <h3 className="text-2xl md:text-3xl font-bold mb-6 px-4">{block.title}</h3>
            )}
            
            <div className="relative">
                {/* Horizontal scrollable container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-4 md:gap-6 px-4 pb-6 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {block.items.map((item, idx) => (
                        <Link 
                            key={idx} 
                            href={item.linkHref || '#'} 
                            prefetch={false}
                            className="flex-none w-48 md:w-64 snap-start group"
                        >
                            <div className={`relative w-full ${aspectClass} overflow-hidden rounded-xl bg-gray-100 mb-3 shadow-sm border border-black/5`}>
                                <Image
                                    src={item.imageUrl}
                                    alt={item.title || `Category ${idx}`}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                            {item.title && (
                                <h4 className="font-semibold text-lg text-center group-hover:text-blue-600 transition-colors">
                                    {item.title}
                                </h4>
                            )}
                        </Link>
                    ))}
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
