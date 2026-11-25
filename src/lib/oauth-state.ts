import crypto from 'crypto';

export const OAUTH_STATE_COOKIE = 'c4t_google_oauth_state';
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

interface OAuthStatePayload {
  n: string;
  t: string;
  u: string;
  exp: number;
}

export interface VerifiedOAuthState {
  tenantId: string;
  userId: string;
}

export function getOAuthStateSecret(): string {
  const secret =
    process.env.OAUTH_STATE_SECRET ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.GOOGLE_CLIENT_SECRET;

  if (!secret || secret.trim().length < 16) {
    throw new Error(
      'Falta OAUTH_STATE_SECRET / TOKEN_ENCRYPTION_KEY / GOOGLE_CLIENT_SECRET para firmar el estado OAuth.'
    );
  }
  return secret.trim();
}

function signEncodedPayload(encodedPayload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Crea un parámetro `state` firmado con HMAC-SHA256 y un nonce aleatorio para vincularlo
 * a una cookie HttpOnly de un solo uso (protección anti-CSRF en OAuth 2.0 / RFC 6749 §10.12).
 */
export function createSignedOAuthState(params: {
  tenantId: string;
  userId: string;
  secret: string;
  now?: number;
}): { state: string; nonce: string } {
  const now = params.now ?? Date.now();
  const nonce = crypto.randomBytes(32).toString('hex');
  const payload: OAuthStatePayload = {
    n: nonce,
    t: params.tenantId,
    u: params.userId,
    exp: now + OAUTH_STATE_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signEncodedPayload(encoded, params.secret);
  return {
    state: `${encoded}.${signature}`,
    nonce,
  };
}

/**
 * Verifica firma HMAC, vigencia y coincidencia exacta contra el nonce guardado en la cookie HttpOnly.
 */
export function verifySignedOAuthState(params: {
  state: string | null | undefined;
  cookieNonce: string | null | undefined;
  secret: string;
  now?: number;
}): VerifiedOAuthState | null {
  const { state, cookieNonce, secret } = params;
  const now = params.now ?? Date.now();

  if (!state || !cookieNonce || typeof state !== 'string' || typeof cookieNonce !== 'string') {
    return null;
  }

  const parts = state.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encoded, providedSig] = parts;
  const expectedSig = signEncodedPayload(encoded, secret);
  if (!safeEqualString(providedSig, expectedSig)) {
    return null;
  }

  try {
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as Partial<OAuthStatePayload>;

    if (
      typeof parsed.n !== 'string' ||
      typeof parsed.t !== 'string' ||
      typeof parsed.u !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    if (!parsed.n || !parsed.t || !parsed.u || parsed.exp <= now) {
      return null;
    }

    if (!safeEqualString(parsed.n, cookieNonce)) {
      return null;
    }

    return {
      tenantId: parsed.t,
      userId: parsed.u,
    };
  } catch {
    return null;
  }
}

/**
 * Resuelve el origin seguro para redirecciones OAuth sin confiar ciegamente en X-Forwarded-Host.
 */
export function resolveSafeAppOrigin(options: {
  appUrlEnv?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
  forwardedProto?: string | null;
  baseDomain?: string | null;
}): string {
  const baseDomain = (options.baseDomain || 'c4talogo.com').toLowerCase().trim();

  if (options.appUrlEnv && options.appUrlEnv.trim()) {
    try {
      const parsed = new URL(options.appUrlEnv.trim());
      if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))) {
        return parsed.origin;
      }
    } catch {
      // Fallback a lista blanca
    }
  }

  const rawHost = (options.forwardedHost || options.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  if (rawHost) {
    const [hostname, port] = rawHost.split(':');
    const isAllowedLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const isAllowedPlatform =
      hostname === baseDomain ||
      hostname === `www.${baseDomain}` ||
      hostname === `app.${baseDomain}`;

    if (isAllowedLocal) {
      const proto = options.forwardedProto?.toLowerCase() === 'http' ? 'http' : 'https';
      return `${proto}://${hostname}${port && /^\d+$/.test(port) ? `:${port}` : ''}`;
    }

    if (isAllowedPlatform) {
      return `https://${hostname}`;
    }
  }

  return `https://${baseDomain}`;
}

/**
 * Valida que una ruta de redirección tras login sea estrictamente interna al origen actual.
 * Bloquea `https://evil.com`, `//evil.com`, `/\evil.com` y caracteres de control.
 */
export function sanitizeInternalRedirect(
  rawRedirect: string | null | undefined,
  fallback: string = '/dashboard'
): string {
  if (!rawRedirect || typeof rawRedirect !== 'string') {
    return fallback;
  }

  const trimmed = rawRedirect.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /[\x00-\x1f\x7f]/.test(trimmed)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, 'https://c4talogo.com');
    if (parsed.origin !== 'https://c4talogo.com') {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
