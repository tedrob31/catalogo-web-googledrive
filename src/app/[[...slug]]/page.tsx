import CatalogView from "@/components/CatalogView";
import { loadCache } from "@/lib/cache";
import { findAlbumBySlugPath, findPathToAlbum } from "@/lib/types";
import { getConfig } from "@/lib/config";
import { Metadata, ResolvingMetadata } from "next";

export const dynamic = 'force-dynamic';

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

  let title = config.siteTitle || 'Photo Catalog';
  let description = 'View our photo collection.';
  let imageUrl = '/og-default.jpg';

  if (cache?.root) {
    // Resolve path
    const path = findAlbumBySlugPath(cache.root, slugs);

    if (path) {
      const album = path[path.length - 1];
      // Don't append site title if we are at root
      if (album.id !== cache.root.id) {
        title = `${album.name} | ${config.siteTitle}`;
        description = `View ${album.photos.length} photos in ${album.name}.`;
      }

      if (config.folderCovers?.[album.id]) {
        imageUrl = config.folderCovers[album.id];
      }
      else if (album.photos[0]) {
        imageUrl = `/api/image?id=${album.photos[0].id}`;
      }
    } else {
      title = `Not Found | ${config.siteTitle}`;
    }
  }

  return {
    title: title,
    description: description,
    openGraph: {
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
