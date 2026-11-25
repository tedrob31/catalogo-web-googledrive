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

/**
 * Sanitiza enlaces editables en el Storefront Builder para bloquear esquemas XSS
 * como `javascript:`, `data:` o `vbscript:`. Solo permite rutas relativas (`/`, `#`)
 * o URLs `http:` / `https:`.
 */
export function sanitizeSafeHref(rawHref: string | null | undefined): string | null {
  if (!rawHref || typeof rawHref !== 'string') {
    return null;
  }

  const trimmed = rawHref.trim();
  if (!trimmed || /[\x00-\x1f\x7f]/.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('\\')) {
      return null;
    }
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}
