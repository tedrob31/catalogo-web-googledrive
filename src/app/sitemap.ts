import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { loadTenantCatalog } from '@/lib/catalog-db';
import {
  buildTenantSitemapEntries,
  classifyHostForSeo,
  getCanonicalStorefrontOrigin,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const classified = classifyHostForSeo(host);

  if (classified.kind === 'root') {
    const origin = `https://${classified.baseDomain}`;
    return [
      {
        url: `${origin}/`,
        changeFrequency: 'weekly',
        priority: 1.0,
      },
      {
        url: `${origin}/privacy/`,
        changeFrequency: 'monthly',
        priority: 0.4,
      },
      {
        url: `${origin}/terms/`,
        changeFrequency: 'monthly',
        priority: 0.4,
      },
    ];
  }

  if (classified.kind === 'tenant') {
    const payload = await loadTenantCatalog(classified.key);
    if (!payload) {
      return [];
    }

    const canonicalOrigin = getCanonicalStorefrontOrigin({
      subdomain: payload.tenant.subdomain,
      customDomain: payload.tenant.custom_domain,
      customDomainEnabled: payload.tenant.custom_domain_enabled,
      redirectToCustomDomain: payload.config.redirectToCustomDomain,
      accessedKey: classified.key,
      baseDomain: classified.baseDomain,
    });

    return buildTenantSitemapEntries({
      rootAlbum: payload.data.root,
      origin: canonicalOrigin,
      lastSynced: payload.data.lastSynced,
    });
  }

  return [];
}
