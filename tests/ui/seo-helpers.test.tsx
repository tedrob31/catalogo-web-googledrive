import { describe, expect, it } from 'vitest';
import {
  buildTenantSitemapEntries,
  classifyHostForSeo,
  getCanonicalStorefrontOrigin,
} from '@/lib/seo';

describe('SEO helpers', () => {
  it('classifies root domain, tenant subdomains/custom domains, and blocked hosts', () => {
    expect(classifyHostForSeo('c4talogo.com', 'c4talogo.com')).toEqual({
      kind: 'root',
      baseDomain: 'c4talogo.com',
    });
    expect(classifyHostForSeo('www.c4talogo.com:443', 'c4talogo.com')).toEqual({
      kind: 'root',
      baseDomain: 'c4talogo.com',
    });
    expect(classifyHostForSeo('tiendamia.c4talogo.com', 'c4talogo.com')).toEqual({
      kind: 'tenant',
      key: 'tiendamia',
      baseDomain: 'c4talogo.com',
    });
    expect(classifyHostForSeo('catalogodemoda.pe', 'c4talogo.com')).toEqual({
      kind: 'tenant',
      key: 'catalogodemoda.pe',
      baseDomain: 'c4talogo.com',
    });

    for (const blockedHost of ['app.c4talogo.com', '127.0.0.1', '', null, undefined, 'localhost']) {
      expect(classifyHostForSeo(blockedHost, 'c4talogo.com')).toEqual({
        kind: 'blocked',
      });
    }
  });

  it('computes canonical storefront origin respecting verified custom domain redirect and host access', () => {
    expect(
      getCanonicalStorefrontOrigin({
        subdomain: 'moda',
        customDomain: 'modaperu.com',
        customDomainEnabled: true,
        redirectToCustomDomain: true,
        accessedKey: 'moda',
        baseDomain: 'c4talogo.com',
      })
    ).toBe('https://modaperu.com');

    expect(
      getCanonicalStorefrontOrigin({
        subdomain: 'moda',
        customDomain: 'modaperu.com',
        customDomainEnabled: true,
        redirectToCustomDomain: false,
        accessedKey: 'modaperu.com',
        baseDomain: 'c4talogo.com',
      })
    ).toBe('https://modaperu.com');

    expect(
      getCanonicalStorefrontOrigin({
        subdomain: 'moda',
        customDomain: 'modaperu.com',
        customDomainEnabled: true,
        redirectToCustomDomain: false,
        accessedKey: 'moda',
        baseDomain: 'c4talogo.com',
      })
    ).toBe('https://moda.c4talogo.com');

    expect(
      getCanonicalStorefrontOrigin({
        subdomain: 'moda',
        customDomain: 'modaperu.com',
        customDomainEnabled: false,
        redirectToCustomDomain: true,
        accessedKey: 'modaperu.com',
        baseDomain: 'c4talogo.com',
      })
    ).toBe('https://moda.c4talogo.com');
  });

  it('builds nested trailing-slash album sitemap entries and enforces maxUrls', () => {
    const rootAlbum = {
      id: 'root',
      name: 'Root',
      photos: [],
      subAlbums: [
        {
          id: 'a1',
          name: 'Calzado Verano',
          photos: [],
          subAlbums: [
            {
              id: 'a1-1',
              name: 'Sandalias 2026',
              photos: [],
              subAlbums: [],
            },
          ],
        },
        {
          id: 'a2',
          name: 'Carteras',
          photos: [],
          subAlbums: [],
        },
      ],
    };

    const entries = buildTenantSitemapEntries({
      rootAlbum,
      origin: 'https://moda.c4talogo.com/',
      lastSynced: '2026-11-24T12:00:00.000Z',
    });

    expect(entries.map((entry) => ({ url: entry.url, priority: entry.priority }))).toEqual([
      { url: 'https://moda.c4talogo.com/', priority: 1.0 },
      { url: 'https://moda.c4talogo.com/calzado-verano/', priority: 0.8 },
      { url: 'https://moda.c4talogo.com/calzado-verano/sandalias-2026/', priority: 0.6 },
      { url: 'https://moda.c4talogo.com/carteras/', priority: 0.8 },
    ]);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(true);

    const capped = buildTenantSitemapEntries({
      rootAlbum,
      origin: 'https://moda.c4talogo.com',
      maxUrls: 2,
    });
    expect(capped).toHaveLength(2);
  });
});
