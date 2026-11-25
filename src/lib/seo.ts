import type { Album } from './types';
import { slugify } from './utils';
import { tenantKeyFromHost } from './tenant-host';

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency: 'daily' | 'weekly';
  priority: number;
}

export function getCanonicalStorefrontOrigin(params: {
  subdomain?: string | null;
  customDomain?: string | null;
  customDomainEnabled?: boolean;
  redirectToCustomDomain?: boolean;
  accessedKey?: string | null;
  baseDomain?: string | null;
}): string {
  const baseDomain = (params.baseDomain || process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com')
    .toLowerCase()
    .trim();
  const custom = params.customDomain?.toLowerCase().trim() || null;
  const sub = params.subdomain?.toLowerCase().trim() || '';
  const accessed = params.accessedKey?.toLowerCase().trim() || '';

  if (custom && params.customDomainEnabled) {
    if (params.redirectToCustomDomain || accessed === custom) {
      return `https://${custom}`;
    }
  }

  return sub ? `https://${sub}.${baseDomain}` : `https://${baseDomain}`;
}

export function buildTenantSitemapEntries(params: {
  rootAlbum: Album;
  origin: string;
  lastSynced?: string;
  maxUrls?: number;
}): SitemapEntry[] {
  const { rootAlbum, origin, lastSynced, maxUrls = 5000 } = params;
  const cleanOrigin = origin.replace(/\/+$/, '');
  const lastModDate = lastSynced ? new Date(lastSynced) : undefined;
  const validLastMod =
    lastModDate && !Number.isNaN(lastModDate.getTime()) ? lastModDate : undefined;

  const entries: SitemapEntry[] = [
    {
      url: `${cleanOrigin}/`,
      lastModified: validLastMod,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  const visit = (albums: Album[], parentSlugs: string[], depth: number) => {
    for (const album of albums) {
      if (entries.length >= maxUrls) return;
      const seg = slugify(album.name);
      if (!seg) continue;

      const currentSlugs = [...parentSlugs, seg];
      entries.push({
        url: `${cleanOrigin}/${currentSlugs.join('/')}/`,
        lastModified: validLastMod,
        changeFrequency: 'daily',
        priority: depth === 1 ? 0.8 : 0.6,
      });

      if (album.subAlbums && album.subAlbums.length > 0) {
        visit(album.subAlbums, currentSlugs, depth + 1);
      }
    }
  };

  visit(rootAlbum.subAlbums || [], [], 1);
  return entries;
}

export function classifyHostForSeo(
  rawHost: string | null | undefined,
  rawBaseDomain?: string | null
):
  | { kind: 'root'; baseDomain: string }
  | { kind: 'tenant'; key: string; baseDomain: string }
  | { kind: 'blocked' } {
  const baseDomain = (rawBaseDomain || process.env.NEXT_PUBLIC_BASE_DOMAIN || 'c4talogo.com')
    .toLowerCase()
    .trim();
  const hostname = (rawHost || '').toLowerCase().split(':')[0].trim();

  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return { kind: 'root', baseDomain };
  }

  const tenantKey = tenantKeyFromHost(rawHost);
  if (tenantKey) {
    return { kind: 'tenant', key: tenantKey, baseDomain };
  }

  return { kind: 'blocked' };
}
