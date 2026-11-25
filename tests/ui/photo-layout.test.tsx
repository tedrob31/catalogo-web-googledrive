import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  isWidePhotoDimensions,
  resolveEffectiveGridColumns,
  resolvePhotoCardLayout,
  sortPhotosByOrder,
} from '@/lib/photo-layout';
import { DEFAULT_CONFIG } from '@/lib/config';
import PhotoCard from '@/components/PhotoCard';

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const cleanProps = { ...props };
    delete cleanProps.fill;
    delete cleanProps.priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...cleanProps} alt={props.alt || ''} />;
  },
}));

afterEach(() => {
  cleanup();
});

describe('resolvePhotoCardLayout (Mixto Inteligente)', () => {
  it('defaults to 4 / 5 without span when dimensions are missing', () => {
    expect(resolvePhotoCardLayout({ width: undefined, height: undefined })).toEqual({
      aspectRatio: '4 / 5',
      isWide: false,
      spanClassName: '',
      sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
      hasKnownDimensions: false,
    });
  });

  it('spans 2 columns for wide landscape photos (16:9 and 4:3) when grid has 2+ columns', () => {
    const flyer = resolvePhotoCardLayout({ width: 1280, height: 720, desktopCols: 5, mobileCols: 2 });
    expect(flyer.isWide).toBe(true);
    expect(flyer.spanClassName).toBe('col-span-2');
    expect(flyer.aspectRatio).toBe('1280 / 720');

    const fourThree = resolvePhotoCardLayout({ width: 1200, height: 900, desktopCols: 5, mobileCols: 2 });
    expect(fourThree.isWide).toBe(true);
    expect(fourThree.spanClassName).toBe('col-span-2');
  });

  it('respects 1-column mobile configuration without creating a ghost second column', () => {
    const flyer = resolvePhotoCardLayout({ width: 1280, height: 720, desktopCols: 5, mobileCols: 1 });
    expect(flyer.isWide).toBe(true);
    expect(flyer.spanClassName).toBe('md:col-span-2');
  });

  it('keeps square and portrait photos as single column with natural ratio clamped safely', () => {
    const square = resolvePhotoCardLayout({ width: 1080, height: 1080 });
    expect(square.isWide).toBe(false);
    expect(square.spanClassName).toBe('');
    expect(square.aspectRatio).toBe('1080 / 1080');

    const portrait = resolvePhotoCardLayout({ width: 960, height: 1280 });
    expect(portrait.isWide).toBe(false);
    expect(portrait.spanClassName).toBe('');
    expect(portrait.aspectRatio).toBe('960 / 1280');

    const ultraWide = resolvePhotoCardLayout({ width: 3000, height: 900 });
    expect(ultraWide.aspectRatio).toBe('2');

    const ultraTall = resolvePhotoCardLayout({ width: 600, height: 1600 });
    expect(ultraTall.aspectRatio).toBe('0.6');
  });

  it('adjusts odd desktop columns to even only when wide cards exist', () => {
    expect(isWidePhotoDimensions(1280, 720)).toBe(true);
    expect(isWidePhotoDimensions(960, 1280)).toBe(false);
    expect(resolveEffectiveGridColumns(5, true)).toBe(4);
    expect(resolveEffectiveGridColumns(3, true)).toBe(4);
    expect(resolveEffectiveGridColumns(4, true)).toBe(4);
    expect(resolveEffectiveGridColumns(6, true)).toBe(6);
    expect(resolveEffectiveGridColumns(5, false)).toBe(5);
  });
});

describe('PhotoCard adaptive aspect ratio', () => {
  it('renders wide landscape photo with col-span-2 and preserves Cloudflare URL', () => {
    const { container } = render(
      <PhotoCard
        photo={{
          id: 'p-flyer',
          name: 'Parlante XQ79',
          thumbnailLink: 'https://cdn.c4talogo.com/cdn-cgi/image/width=800,fit=scale-down/flyer.jpg',
          fullLink: 'https://cdn.c4talogo.com/cdn-cgi/image/width=1600,fit=scale-down/flyer.jpg',
          width: 1280,
          height: 720,
        }}
        desktopCols={4}
        mobileCols={2}
        onClick={() => {}}
      />
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('col-span-2');
    expect(card.style.aspectRatio).toBe('1280 / 720');
    expect((screen.getByAltText('Parlante XQ79') as HTMLImageElement).getAttribute('src')).toBe(
      'https://cdn.c4talogo.com/cdn-cgi/image/width=800,fit=scale-down/flyer.jpg'
    );
  });

  it('adapts automatically onLoad and notifies parent when DB dimensions are absent', () => {
    const onWideDetected = vi.fn();
    const { container } = render(
      <PhotoCard
        photo={{
          id: 'p-legacy-flyer',
          name: 'Promo Legacy',
          thumbnailLink: 'https://cdn.c4talogo.com/cdn-cgi/image/width=800,fit=scale-down/legacy.jpg',
        }}
        onWideDetected={onWideDetected}
        onClick={() => {}}
      />
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.style.aspectRatio).toBe('4 / 5');

    const img = screen.getByAltText('Promo Legacy') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 1600, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 900, configurable: true });
    fireEvent.load(img);

    expect(card.className).toContain('col-span-2');
    expect(card.style.aspectRatio).toBe('1600 / 900');
    expect(onWideDetected).toHaveBeenCalledWith('p-legacy-flyer');
  });

  it('hides photo filename overlay when config.hidePhotoNames is true and shows it when false', () => {
    const photo = {
      id: 'p-named',
      name: 'CJR223.jpg',
      thumbnailLink: 'https://cdn.c4talogo.com/cdn-cgi/image/width=800,fit=scale-down/p.jpg',
      width: 960,
      height: 1280,
    };

    const { rerender } = render(
      <PhotoCard photo={photo} config={{ ...DEFAULT_CONFIG, hidePhotoNames: false }} onClick={() => {}} />
    );
    expect(screen.queryByText('CJR223.jpg')).not.toBeNull();

    rerender(
      <PhotoCard photo={photo} config={{ ...DEFAULT_CONFIG, hidePhotoNames: true }} onClick={() => {}} />
    );
    expect(screen.queryByText('CJR223.jpg')).toBeNull();
  });
});

describe('sortPhotosByOrder', () => {
  it('sorts photos naturally descending by default and ascending when configured', () => {
    const photos = [{ name: 'A2.jpg' }, { name: 'A10.jpg' }, { name: 'A1.jpg' }];
    expect(sortPhotosByOrder(photos, 'desc').map((p) => p.name)).toEqual(['A10.jpg', 'A2.jpg', 'A1.jpg']);
    expect(sortPhotosByOrder(photos, 'asc').map((p) => p.name)).toEqual(['A1.jpg', 'A2.jpg', 'A10.jpg']);
  });
});
