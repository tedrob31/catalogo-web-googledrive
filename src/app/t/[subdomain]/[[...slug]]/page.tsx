import { Metadata } from 'next';
import { loadTenantCatalog } from '@/lib/catalog-db';
import CatalogView from '@/components/CatalogView';

export const revalidate = 60; // ISR en Cloudflare Edge / Next.js

type Props = {
  params: Promise<{
    subdomain: string;
    slug?: string[];
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain, slug = [] } = await params;
  const payload = await loadTenantCatalog(subdomain, slug);

  if (!payload) {
    return {
      title: 'Tienda no encontrada | c4talogo.com',
    };
  }

  const { config, initialPath } = payload;
    const currentAlbum = initialPath[initialPath.length - 1];
    const pageTitle =
      currentAlbum && currentAlbum.id !== payload.data.root.id
        ? `${currentAlbum.name} | ${config.siteTitle}`
        : config.siteTitle;

    let ogImageUrl = config.ogImage || config.logoUrl;
    if (!config.forceGlobalOgImage && currentAlbum) {
      if (config.folderCovers?.[currentAlbum.id]) {
        ogImageUrl = config.folderCovers[currentAlbum.id];
      } else if (currentAlbum.photos && currentAlbum.photos.length > 0) {
        ogImageUrl = currentAlbum.photos[0].fullLink || currentAlbum.photos[0].thumbnailLink;
      }
    }

    return {
      title: pageTitle,
      description: config.siteDescription || `Catálogo de productos de ${payload.tenant.name}`,
      icons: config.favicon ? [{ rel: 'icon', url: config.favicon }] : undefined,
      openGraph: {
        title: pageTitle,
        description: config.siteDescription || undefined,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: pageTitle,
        description: config.siteDescription || undefined,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
    };
  }

export default async function TenantCatalogPage({ params }: Props) {
  const { subdomain, slug = [] } = await params;
  const payload = await loadTenantCatalog(subdomain, slug);

  if (!payload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
          !
        </div>
        <h1 className="text-2xl font-extrabold mb-2">Catálogo No Encontrado</h1>
        <p className="text-gray-600 max-w-md mb-6">
          El catálogo con el subdominio <strong className="text-black">"{subdomain}"</strong> no existe o se encuentra temporalmente inactivo.
        </p>
        <a
          href="https://c4talogo.com"
          className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition"
        >
          Crear mi propio catálogo en c4talogo.com
        </a>
      </div>
    );
  }

  return (
    <CatalogView
      key={slug.join('/') || 'root'}
      data={payload.data}
      config={payload.config}
      initialPath={payload.initialPath}
      storefront={payload.storefront}
    />
  );
}
