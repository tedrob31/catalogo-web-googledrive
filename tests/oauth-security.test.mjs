/**
 * Regresiones de seguridad ADA-CASA:
 *   1. Estado firmado HMAC + nonce de cookie HttpOnly para OAuth 2.0 (anti-CSRF / vinculacion cruzada).
 *   2. Resolucion segura de App Origin (anti Host Header Injection / Open Redirect).
 *   3. Sanitizacion de redirecciones internas en /login (anti Open Redirect).
 *   4. Invariante de validacion de clave de tenant en catalog-db.ts (anti inyeccion PostgREST).
 *
 * Ejecutar: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createSignedOAuthState,
  verifySignedOAuthState,
  resolveSafeAppOrigin,
} from '../src/lib/oauth-state.ts';
import { sanitizeInternalRedirect, sanitizeSafeHref } from '../src/lib/safe-redirect.ts';
import { isValidTenantKey } from '../src/lib/tenant-host.ts';
import { checkRateLimit } from '../src/lib/rate-limit.ts';

const SECRET = '0123456789abcdef0123456789abcdef';
const CATALOG_DB = readFileSync(new URL('../src/lib/catalog-db.ts', import.meta.url), 'utf8');

test('createSignedOAuthState y verifySignedOAuthState validan ida y vuelta con cookie nonce', () => {
  const now = 1_700_000_000_000;
  const { state, nonce } = createSignedOAuthState({
    tenantId: 'tenant-uuid-123',
    userId: 'user-uuid-456',
    secret: SECRET,
    now,
  });

  const verified = verifySignedOAuthState({
    state,
    cookieNonce: nonce,
    secret: SECRET,
    now: now + 60_000,
  });

  assert.deepEqual(verified, {
    tenantId: 'tenant-uuid-123',
    userId: 'user-uuid-456',
  });
});

test('verifySignedOAuthState rechaza cookie ausente, nonce distinto, firma alterada o expiracion', () => {
  const now = 1_700_000_000_000;
  const { state, nonce } = createSignedOAuthState({
    tenantId: 'tenant-1',
    userId: 'user-1',
    secret: SECRET,
    now,
  });

  assert.equal(verifySignedOAuthState({ state, cookieNonce: null, secret: SECRET, now }), null);
  assert.equal(verifySignedOAuthState({ state, cookieNonce: 'otro-nonce', secret: SECRET, now }), null);
  assert.equal(verifySignedOAuthState({ state: `${state}x`, cookieNonce: nonce, secret: SECRET, now }), null);
  assert.equal(
    verifySignedOAuthState({ state, cookieNonce: nonce, secret: 'otra-clave-secreta-distinta-1234', now }),
    null
  );
  assert.equal(
    verifySignedOAuthState({ state, cookieNonce: nonce, secret: SECRET, now: now + 11 * 60 * 1000 }),
    null
  );
});

test('resolveSafeAppOrigin ignora hosts atacantes y respeta solo hosts permitidos o env', () => {
  assert.equal(
    resolveSafeAppOrigin({
      forwardedHost: 'evil.com',
      host: 'c4talogo.com',
      forwardedProto: 'https',
      baseDomain: 'c4talogo.com',
    }),
    'https://c4talogo.com'
  );

  assert.equal(
    resolveSafeAppOrigin({
      forwardedHost: 'app.c4talogo.com',
      forwardedProto: 'http',
      baseDomain: 'c4talogo.com',
    }),
    'https://app.c4talogo.com'
  );

  assert.equal(
    resolveSafeAppOrigin({
      appUrlEnv: 'https://c4talogo.com/',
      forwardedHost: 'evil.com',
      baseDomain: 'c4talogo.com',
    }),
    'https://c4talogo.com'
  );

  assert.equal(
    resolveSafeAppOrigin({
      host: 'localhost:3000',
      forwardedProto: 'http',
      baseDomain: 'c4talogo.com',
    }),
    'http://localhost:3000'
  );
});

test('sanitizeInternalRedirect solo permite rutas relativas seguras del mismo origen', () => {
  assert.equal(sanitizeInternalRedirect('/dashboard'), '/dashboard');
  assert.equal(sanitizeInternalRedirect('/dashboard?tab=drive#paso-1'), '/dashboard?tab=drive#paso-1');

  for (const evil of [
    'https://evil.com',
    'http://evil.com/dashboard',
    '//evil.com',
    '/\\evil.com',
    'javascript:alert(1)',
    '/dashboard\r\nLocation: https://evil.com',
    '',
    null,
  ]) {
    assert.equal(sanitizeInternalRedirect(evil, '/dashboard'), '/dashboard', `input: ${String(evil)}`);
  }
});

test('catalog-db valida isValidTenantKey antes de interpolar en PostgREST .or()', () => {
  assert.match(CATALOG_DB, /if\s*\(\s*!isValidTenantKey\(subdomain\)\s*\)\s*\{\s*return null;\s*\}/);
  assert.equal(isValidTenantKey('juanstore'), true);
  assert.equal(isValidTenantKey('catalogodemoda.pe'), true);
  assert.equal(isValidTenantKey('foo,status.eq.suspended'), false);
  assert.equal(isValidTenantKey('foo)(or(1=1)'), false);
});

test('sanitizeSafeHref bloquea esquemas XSS y acepta rutas relativas o http/https', () => {
  assert.equal(sanitizeSafeHref('/abrigos'), '/abrigos');
  assert.equal(sanitizeSafeHref('#catalogo'), '#catalogo');
  assert.equal(sanitizeSafeHref('https://c4talogo.com/oferta'), 'https://c4talogo.com/oferta');
  assert.equal(sanitizeSafeHref('http://ejemplo.com/x'), 'http://ejemplo.com/x');

  for (const xss of [
    'javascript:alert(1)',
    '  JaVaScRiPt:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.com/phishing',
    '/\\evil.com',
    'sin-esquema-ni-slash',
    '',
    null,
  ]) {
    assert.equal(sanitizeSafeHref(xss), null, `xss input should be rejected: ${String(xss)}`);
  }
});

test('checkRateLimit permite hasta el limite y bloquea excesos dentro de la ventana', () => {
  const key = 'test_bucket_unit';
  const t0 = 1_700_000_000_000;
  assert.equal(checkRateLimit(key, 2, 60_000, t0).allowed, true);
  assert.equal(checkRateLimit(key, 2, 60_000, t0 + 1000).allowed, true);
  const blocked = checkRateLimit(key, 2, 60_000, t0 + 2000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  assert.equal(checkRateLimit(key, 2, 60_000, t0 + 61_000).allowed, true);
});
