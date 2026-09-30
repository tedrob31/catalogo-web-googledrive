import fs from 'fs';
import path from 'path';

export interface SystemSettings {
  active_landing: 'minimal' | 'classic';
  closed_beta_enabled: boolean;
  updated_at: string;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'system_settings.json');

const DEFAULT_SETTINGS: SystemSettings = {
  active_landing: 'minimal',
  closed_beta_enabled: true,
  updated_at: new Date().toISOString(),
};

/**
 * Lee la configuración global del sistema
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const content = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('[SystemSettings] Error leyendo configuración:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * Guarda la configuración global del sistema
 */
export async function updateSystemSettings(
  partial: Partial<SystemSettings>
): Promise<SystemSettings> {
  try {
    const current = await getSystemSettings();
    const updated: SystemSettings = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (error) {
    console.error('[SystemSettings] Error guardando configuración:', error);
    throw error;
  }
}
