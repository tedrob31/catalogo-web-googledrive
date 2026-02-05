import { slugify } from './utils';

export interface PhotoItem {
    id: string;
    name: string;
    thumbnailLink?: string;
    fullLink?: string;
    width?: number;
    height?: number;
    createdTime?: string;
}

export interface Album {
    id: string;
    name: string;
    coverId?: string;
    photos: PhotoItem[];
    subAlbums: Album[];
}

export interface CacheStructure {
    root: Album;
    lastSynced: string;
}

export function findPathToAlbum(root: Album, targetId: string): Album[] | null {
    if (root.id === targetId) return [root];

    for (const sub of root.subAlbums) {
        const path = findPathToAlbum(sub, targetId);
        if (path) {
            return [root, ...path];
        }
    }
    return null;
}

export function findAlbumBySlugPath(root: Album, slugs: string[]): Album[] | null {
    if (slugs.length === 0) return [root];

    const currentSlug = slugs[0];
    const remainingSlugs = slugs.slice(1);

    // Debug log
    // console.log(`Searching for slug: "${currentSlug}" in album: "${root.name}"`);

    // Find a matching sub-album
    for (const sub of root.subAlbums) {
        const subSlug = slugify(sub.name);
        // console.log(`  Comparing with sub-album: "${sub.name}" -> slug: "${subSlug}"`);

        if (subSlug === currentSlug) {
            // Match found
            if (remainingSlugs.length === 0) {
                return [root, sub];
            } else {
                const deeperPath = findAlbumBySlugPath(sub, remainingSlugs);
                if (deeperPath) {
                    return [root, ...deeperPath];
                }
            }
        }
    }

    return null;
}
