import { createAdminClient } from '@/lib/supabase/admin';

export interface SystemSettings {
  active_landing: 'minimal' | 'classic';
  closed_beta_enabled: boolean;
  updated_at: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  active_landing: 'minimal',
  closed_beta_enabled: true,
  updated_at: new Date().toISOString(),
};

// Caché corta en memoria RAM (30s) para no consultar Supabase en cada visita a la landing
let cachedSettings: { data: SystemSettings; expiresAt: number } | null = null;
const SETTINGS_CACHE_TTL_MS = 30 * 1000;

/**
 * Lee la configuración global del sistema desde `public.system_settings` en Supabase.
 * Antes vivía en `system_settings.json` local, que se perdía en cada redeploy de Docker.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.data;
  }

  try {
    const adminSupabase = createAdminClient();
    const { data: rows, error } = await adminSupabase
      .from('system_settings')
      .select('key, value, updated_at')
      .in('key', ['active_landing', 'closed_beta_enabled']);

    if (error || !rows || rows.length === 0) {
      return DEFAULT_SETTINGS;
    }

    const next: SystemSettings = { ...DEFAULT_SETTINGS };
    let latestUpdated = DEFAULT_SETTINGS.updated_at;

    for (const row of rows) {
      if (row.key === 'active_landing') {
        const val = row.value === 'classic' ? 'classic' : 'minimal';
        next.active_landing = val;
      } else if (row.key === 'closed_beta_enabled') {
        next.closed_beta_enabled = row.value !== false && row.value !== 'false';
      }
      if (row.updated_at && row.updated_at > latestUpdated) {
        latestUpdated = row.updated_at;
      }
    }

    next.updated_at = latestUpdated;
    cachedSettings = { data: next, expiresAt: now + SETTINGS_CACHE_TTL_MS };
    return next;
  } catch (error) {
    console.error('[SystemSettings] Error leyendo configuración desde Supabase:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Guarda la configuración global del sistema en `public.system_settings` (Supabase).
 */
export async function updateSystemSettings(
  partial: Partial<SystemSettings>
): Promise<SystemSettings> {
  try {
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const rowsToUpsert: Array<{ key: string; value: unknown; updated_at: string }> = [];

    if (partial.active_landing !== undefined) {
      const landing = partial.active_landing === 'classic' ? 'classic' : 'minimal';
      rowsToUpsert.push({
        key: 'active_landing',
        value: landing,
        updated_at: nowIso,
      });
    }

    if (partial.closed_beta_enabled !== undefined) {
      rowsToUpsert.push({
        key: 'closed_beta_enabled',
        value: Boolean(partial.closed_beta_enabled),
        updated_at: nowIso,
      });
    }

    if (rowsToUpsert.length > 0) {
      const { error } = await adminSupabase
        .from('system_settings')
        .upsert(rowsToUpsert as any, { onConflict: 'key' });

      if (error) {
        throw error;
      }
    }

    cachedSettings = null;
    return await getSystemSettings();
  } catch (error) {
    console.error('[SystemSettings] Error guardando configuración en Supabase:', error);
    throw error;
  }
}
