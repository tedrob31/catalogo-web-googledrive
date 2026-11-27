import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROBOTS_ROUTE = readFileSync(new URL('../src/app/robots.ts', import.meta.url), 'utf8');
const SITEMAP_ROUTE = readFileSync(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
const TENANT_PAGE = readFileSync(
  new URL('../src/app/t/[subdomain]/[[...slug]]/page.tsx', import.meta.url),
  'utf8'
);
const SYNC_ROUTE = readFileSync(new URL('../src/app/api/sync/route.ts', import.meta.url), 'utf8');
const CATALOG_DB = readFileSync(new URL('../src/lib/catalog-db.ts', import.meta.url), 'utf8');

test('robots.ts and sitemap.ts run dynamically per host and block app/invalid hosts', () => {
  assert.match(ROBOTS_ROUTE, /export const dynamic = 'force-dynamic'/);
  assert.match(ROBOTS_ROUTE, /classifyHostForSeo/);
  assert.match(ROBOTS_ROUTE, /loadTenantSeoMeta/);
  assert.doesNotMatch(ROBOTS_ROUTE, /loadTenantCatalog/);
  assert.match(ROBOTS_ROUTE, /disallow:\s*'\//);

  assert.match(SITEMAP_ROUTE, /export const dynamic = 'force-dynamic'/);
  assert.match(SITEMAP_ROUTE, /classifyHostForSeo/);
  assert.match(SITEMAP_ROUTE, /buildTenantSitemapEntries/);
  assert.match(SITEMAP_ROUTE, /getCanonicalStorefrontOrigin/);
});

test('catalog-db uses 12h TTL for active stores to minimize Supabase egress', () => {
  assert.match(CATALOG_DB, /CACHE_TTL_MS\s*=\s*12\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(CATALOG_DB, /export const loadTenantSeoMeta/);
});

test('tenant storefront metadata sets dynamic canonical URL and robots indexability', () => {
  assert.match(TENANT_PAGE, /getCanonicalStorefrontOrigin/);
  assert.match(TENANT_PAGE, /alternates:\s*\{\s*canonical:/);
  assert.match(TENANT_PAGE, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,?\s*\}/);
  assert.match(TENANT_PAGE, /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,?\s*\}/);
});

test('api/sync exposes DELETE handler to cancel in-flight syncs cleanly', () => {
  assert.match(SYNC_ROUTE, /export async function DELETE\(/);
  assert.match(SYNC_ROUTE, /Sincronización cancelada por el usuario/);
});
