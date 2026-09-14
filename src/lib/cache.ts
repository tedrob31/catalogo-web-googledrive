// Módulo de caché local deprecado.
// En la arquitectura SaaS Multi-Tenant, todos los datos residen en Supabase y fotos en Cloudflare R2.
export const CACHE_DIR = '';
export async function loadCache() { return null; }
export async function saveCache() {}
export async function ensureCacheDir() {}
export async function cleanOrphanedImages() {}
export async function isLocked() { return false; }
export async function setLock() {}
export async function releaseLock() {}
