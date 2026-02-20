import CatalogView from "@/components/CatalogView";
import { loadCache } from "@/lib/cache";
import { findAlbumBySlugPath, findPathToAlbum } from "@/lib/types";
import { getConfig } from "@/lib/config";
import { Metadata, ResolvingMetadata } from "next";

import { slugify } from "@/lib/utils";
import { Album } from "@/lib/types";

// Force static rendering is removed to allow ISR (Incremental Static Regeneration)
// so revalidatePath() in /api/sync will work properly.

// Generate all possible paths from the cache
export async function generateStaticParams() {
  const cache = await loadCache();
  if (!cache?.root) return [];

  const paths: { slug: string[] }[] = [];

  // 1. Root path (empty slug)
  paths.push({ slug: [] });

  // 2. Recursive function to build paths
  const traverse = (album: Album, currentSlug: string[]) => {
    // Add current album path
    if (currentSlug.length > 0) {
      paths.push({ slug: currentSlug });
    }

    // Traverse children
    album.subAlbums.forEach(sub => {
      traverse(sub, [...currentSlug, slugify(sub.name)]);
    });
  };

  // Start traversal from root's children (Root itself is empty slug)
  cache.root.subAlbums.forEach(sub => {
    traverse(sub, [slugify(sub.name)]);
  });

  return paths;
}

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const p = await params;
  const slugs = p.slug || [];

  const cache = await loadCache();
  const config = await getConfig();

  // 1. Get Base Settings
  let title = config.siteTitle || 'Photo Catalog';
  let description = config.siteDescription || ''; // Empty by default as requested, or custom
  let imageUrl = config.ogImage || '/og-default.jpg';

  // 2. Resolve Dynamic Content
  if (cache?.root) {
    const path = findAlbumBySlugPath(cache.root, slugs);

    if (path) {
      const album = path[path.length - 1];

      // Title Logic
      if (album.id !== cache.root.id) {
        title = `${album.name} | ${config.siteTitle}`;
      }

      // Description Logic - ONLY if siteDescription is not set globally, or if we want to mix?
      // User asked: "remove View X photos text".
      // So we generally stick to config.siteDescription.
      // If it is empty, we leave it empty or very minimal.

      // Image Logic
      // Image Logic
      if (!config.forceGlobalOgImage) {
        const isRoot = album.id === cache.root.id;

        // If we are at Root and have a Global OG Image, keep it!
        // Only overwrite if we are in a sub-album OR if no global image exists
        if (!isRoot || !config.ogImage) {
          if (config.folderCovers?.[album.id]) {
            imageUrl = config.folderCovers[album.id];
          } else if (album.photos.length > 0) {
            // Use first photo as fallback
            // Check if we have a local link in the photo object (from sync)
            const p = album.photos[0];
            if (p.fullLink && !p.fullLink.startsWith('http')) {
              imageUrl = p.fullLink; // Use local /images/ID.webp
            } else {
              imageUrl = `/api/image?id=${p.id}`; // Fallback to API
            }
          }
        }
      }
    } else {
      title = `Not Found | ${config.siteTitle}`;
    }
  }

  // Sanitize localhost from URLs if present in config
  if (imageUrl?.startsWith('http://localhost:3000')) {
    imageUrl = imageUrl.replace('http://localhost:3000', '');
  }

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const data = await loadCache();
  const config = await getConfig();

  const slugs = params.slug || [];

  let initialPath = data?.root ? [data.root] : [];

  if (data?.root && slugs.length > 0) {
    const foundPath = findAlbumBySlugPath(data.root, slugs);
    if (foundPath) {
      initialPath = foundPath;
    }
  }

  return (
    <CatalogView
      data={data}
      config={config}
      initialPath={initialPath}
    />
  );
}
