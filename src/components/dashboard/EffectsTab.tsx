'use client';

import { FaMagic } from 'react-icons/fa';

interface EffectsTabProps {
  configForm: any;
  setConfigForm: (updater: any) => void;
  savingConfig: boolean;
  onSaveConfig: (e?: React.FormEvent) => void;
}

export default function EffectsTab({
  configForm,
  setConfigForm,
  savingConfig,
  onSaveConfig,
}: EffectsTabProps) {
  return (
    <form onSubmit={onSaveConfig} className="space-y-6">
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FaMagic className="text-amber-400" />
          <span>Animaciones de Temporada (Efectos de Caída)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Caída:</label>
            <select
              value={configForm.seasonal_effect}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, seasonal_effect: e.target.value }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="none">Desactivado (Ninguno)</option>
              <option value="snow">Nieve (Copos invernales)</option>
              <option value="hearts">Corazones flotantes (San Valentín/Amor)</option>
              <option value="custom">Icono Personalizado (URL)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
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
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Usa 0 para que caiga permanentemente mientras el cliente navega.
            </p>
          </div>
        </div>

        {configForm.seasonal_effect === 'custom' && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              URL del Icono Personalizado (PNG transparente o SVG):
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={configForm.seasonal_custom_icon}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, seasonal_custom_icon: e.target.value }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        <h2 className="text-base font-bold text-white pt-4 border-t border-white/10">
          Efectos al Hacer Clic / Toque
        </h2>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Efecto de Explosión al Clic:
          </label>
          <select
            value={configForm.click_effect}
            onChange={(e) =>
              setConfigForm((prev: any) => ({ ...prev, click_effect: e.target.value }))
            }
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="none">Sin efecto de clic</option>
            <option value="stars">Chispas / Estrellas brillantes</option>
            <option value="hearts">Minicorazones</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            Genera una microanimación lúdica cada vez que un visitante toca la pantalla.
          </p>
        </div>

        <button
          type="submit"
          disabled={savingConfig}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow"
        >
          {savingConfig ? 'Guardando efectos...' : 'Guardar Efectos en Supabase'}
        </button>
      </div>
    </form>
  );
}
