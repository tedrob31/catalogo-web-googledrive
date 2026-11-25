import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { loadTenantCatalog } from '@/lib/catalog-db';
import { classifyHostForSeo, getCanonicalStorefrontOrigin } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const classified = classifyHostForSeo(host);

  if (classified.kind === 'root') {
    const origin = `https://${classified.baseDomain}`;
    return {
      rules: {
        userAgent: '*',
        allow: ['/', '/privacy/', '/terms/'],
        disallow: ['/dashboard/', '/superadmin/', '/api/', '/t/', '/login/'],
      },
      sitemap: `${origin}/sitemap.xml`,
    };
  }

  if (classified.kind === 'tenant') {
    const payload = await loadTenantCatalog(classified.key);
    if (!payload) {
      return {
        rules: {
          userAgent: '*',
          disallow: '/',
        },
      };
    }

    const canonicalOrigin = getCanonicalStorefrontOrigin({
      subdomain: payload.tenant.subdomain,
      customDomain: payload.tenant.custom_domain,
      customDomainEnabled: payload.tenant.custom_domain_enabled,
      redirectToCustomDomain: payload.config.redirectToCustomDomain,
      accessedKey: classified.key,
      baseDomain: classified.baseDomain,
    });

    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      sitemap: `${canonicalOrigin}/sitemap.xml`,
    };
  }

  // Bloquea indexación de app.c4talogo.com, IPs y dominios de infraestructura
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
