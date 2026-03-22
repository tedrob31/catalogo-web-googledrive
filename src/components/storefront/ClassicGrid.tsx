import Image from 'next/image';
import Link from 'next/link';
import { StorefrontBlock } from '@/lib/storefront';

interface ClassicGridProps {
    block: StorefrontBlock;
    gridColsCls: string; // Passed down from config
}

export default function ClassicGrid({ block, gridColsCls }: ClassicGridProps) {
    if (!block.items || block.items.length === 0) return null;

    let aspectClass = '';
    if (block.aspectRatio === 'square') aspectClass = 'aspect-square';
    if (block.aspectRatio === 'portrait') aspectClass = 'aspect-[4/5]';
    // If auto/undefined, it will fallback to original img proportions without enforced class

    let spacingClass = 'my-6';
    if (block.spacing === 'none') spacingClass = 'my-0';
    if (block.spacing === 'small') spacingClass = 'my-2';
    if (block.spacing === 'large') spacingClass = 'my-12';

    const finalGridColsCls = `grid-cols-${block.gridColumnsMobile || 2} md:grid-cols-${block.gridColumnsDesktop || 5}`;

    return (
        <div className={`w-full px-2 md:px-4 ${spacingClass}`}>
            {block.title && (
                <h3 className="text-xl md:text-2xl font-bold mb-4">{block.title}</h3>
            )}
            
            <div className={`grid gap-2 md:gap-3 ${finalGridColsCls}`}>
                {block.items.map((item, idx) => (
                    <Link key={idx} href={item.linkHref || '#'} prefetch={false} className="group block">
                        <div className={`w-full overflow-hidden rounded-none bg-gray-50 border border-gray-100 ${aspectClass}`}>
                            {item.imageUrl ? (
                                <Image
                                    src={item.imageUrl}
                                    alt={item.title || `Grid item ${idx}`}
                                    width={500}
                                    height={600}
                                    className={`w-full h-full ${aspectClass ? 'object-cover' : 'object-contain'} transition-transform duration-500 group-hover:scale-105`}
                                />
                            ) : (
                                <div className={`flex items-center justify-center bg-gray-200 text-gray-500 text-xs w-full ${aspectClass ? 'h-full' : 'h-40'}`}>Sin Imagen</div>
                            )}
                        </div>
                        {item.title && (
                            <h4 className="mt-2 text-sm md:text-base font-medium text-center group-hover:underline">
                                {item.title}
                            </h4>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
