import Image from 'next/image';
import Link from 'next/link';
import { StorefrontBlock } from '@/lib/storefront';

interface HeroBannerProps {
    block: StorefrontBlock;
}

export default function HeroBanner({ block }: HeroBannerProps) {
    if (!block.imageUrl) return null;

    let aspectClass = 'aspect-video';
    if (block.aspectRatio === 'square') aspectClass = 'aspect-square';
    if (block.aspectRatio === 'portrait') aspectClass = 'aspect-[4/5]';

    const Content = () => (
        <div className={`relative w-full ${aspectClass} overflow-hidden rounded-xl bg-gray-100 group`}>
            <Image 
                src={block.imageUrl!} 
                alt={block.title || 'Banner'} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
                priority={true}
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />
            {block.title && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <h2 className="text-white text-3xl md:text-5xl font-bold tracking-tight drop-shadow-lg text-center px-4">
                        {block.title}
                    </h2>
                </div>
            )}
        </div>
    );

    if (block.linkHref) {
        return <Link href={block.linkHref} className="block w-full"><Content /></Link>;
    }
    return <Content />;
}
