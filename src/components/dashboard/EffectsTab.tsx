'use client';

import { FaMagic } from 'react-icons/fa';

interface EffectsTabProps {
  configForm: any;
  setConfigForm: (updater: any) => void;
  savingConfig: boolean;
  onSaveConfig: (e?: React.FormEvent) => void;
  hasChanges?: boolean;
}

export default function EffectsTab({
  configForm,
  setConfigForm,
  savingConfig,
  onSaveConfig,
  hasChanges = false,
}: EffectsTabProps) {
  return (
    <form onSubmit={onSaveConfig} className="space-y-6">
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-6 backdrop-blur-sm shadow-sm">
        <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <FaMagic className="text-amber-400" />
          <span>Animaciones de Temporada (Efectos de Caída)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Tipo de Caída:</label>
            <select
              value={configForm.seasonal_effect}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, seasonal_effect: e.target.value }))
              }
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            >
              <option value="none">Desactivado (Ninguno)</option>
              <option value="snow">Nieve (Copos invernales)</option>
              <option value="hearts">Corazones flotantes (San Valentín/Amor)</option>
              <option value="custom">Icono Personalizado (URL)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Duración del Efecto (Segundos):
            </label>
            <input
              type="number"
              min={0}
              value={configForm.seasonal_duration}
              onChange={(e) =>
                setConfigForm((prev: any) => ({
                  ...prev,
                  seasonal_duration: Number(e.target.value),
                }))
              }
              placeholder="0 = Infinito"
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Usa 0 para que caiga permanentemente mientras el cliente navega.
            </p>
          </div>
        </div>

        {configForm.seasonal_effect === 'custom' && (
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              URL del Icono Personalizado (PNG transparente o SVG):
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={configForm.seasonal_custom_icon}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, seasonal_custom_icon: e.target.value }))
              }
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            />
          </div>
        )}

        <h2 className="text-base font-bold text-zinc-100 pt-4 border-t border-zinc-800/80">
          Efectos al Hacer Clic / Toque
        </h2>

        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Efecto de Explosión al Clic:
          </label>
          <select
            value={configForm.click_effect}
            onChange={(e) =>
              setConfigForm((prev: any) => ({ ...prev, click_effect: e.target.value }))
            }
            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
          >
            <option value="none">Sin efecto de clic</option>
            <option value="stars">Chispas / Estrellas brillantes</option>
            <option value="hearts">Minicorazones</option>
          </select>
          <p className="text-[11px] text-zinc-500 mt-1">
            Genera una microanimación lúdica cada vez que un visitante toca la pantalla.
          </p>
        </div>

        <button
          type="submit"
          disabled={!hasChanges || savingConfig}
          className={`w-full py-3 font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${
            hasChanges && !savingConfig
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-[0.99] cursor-pointer'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800/80 cursor-not-allowed opacity-60'
          }`}
        >
          {savingConfig ? 'Guardando efectos...' : hasChanges ? 'Guardar Efectos en Supabase' : 'Sin cambios por guardar'}
        </button>
      </div>
    </form>
  );
}
