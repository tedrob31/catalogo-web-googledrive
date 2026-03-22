import { StorefrontBlock } from '@/lib/storefront';

interface RichTextBlockProps {
    block: StorefrontBlock;
}

export default function RichTextBlock({ block }: RichTextBlockProps) {
    let spacingClass = 'py-6 px-4';
    if (block.spacing === 'none') spacingClass = 'py-1 px-4';
    if (block.spacing === 'small') spacingClass = 'py-3 px-4';
    if (block.spacing === 'large') spacingClass = 'py-12 px-4';

    const textAlignment = block.textAlignment || 'center';
    const alignClass = textAlignment === 'left' ? 'text-left' : textAlignment === 'right' ? 'text-right' : 'text-center';

    let sizeClass = 'text-base';
    if (block.textSize === 'small') sizeClass = 'text-sm text-gray-500 uppercase tracking-widest font-semibold';
    if (block.textSize === 'medium') sizeClass = 'text-lg md:text-xl';
    if (block.textSize === 'large') sizeClass = 'text-2xl md:text-3xl';
    if (block.textSize === 'xlarge') sizeClass = 'text-4xl md:text-5xl';
    if (block.textSize === 'title') sizeClass = 'text-5xl md:text-7xl font-extrabold tracking-tight';

    let weightClass = 'font-normal';
    if (block.textWeight === 'bold') weightClass = 'font-bold';
    if (block.textWeight === 'light') weightClass = 'font-light';

    let fontClass = 'font-sans';
    if (block.textFont === 'serif') fontClass = 'font-serif';
    if (block.textFont === 'mono') fontClass = 'font-mono';

    const content = block.textContent || 'Escribe tu texto libre aquí...';

    return (
        <div className={`w-full max-w-7xl mx-auto ${spacingClass}`}>
            {block.title && (
                <h3 className="text-sm font-semibold text-gray-400 mb-2">{block.title}</h3>
            )}
            <div className={`${alignClass} ${sizeClass} ${weightClass} ${fontClass} text-gray-900 dark:text-gray-100 leading-tight`}>
                {content.split('\n').map((line, i) => (
                    <span key={i}>
                        {line}
                        <br />
                    </span>
                ))}
            </div>
        </div>
    );
}
