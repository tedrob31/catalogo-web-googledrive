'use client';

import { FaPalette } from 'react-icons/fa';

interface DesignTabProps {
  configForm: any;
  setConfigForm: (updater: any) => void;
  savingConfig: boolean;
  onSaveConfig: (e?: React.FormEvent) => void;
}

export default function DesignTab({
  configForm,
  setConfigForm,
  savingConfig,
  onSaveConfig,
}: DesignTabProps) {
  return (
    <form onSubmit={onSaveConfig} className="space-y-6">
      <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FaPalette className="text-amber-400" />
          <span>Estructura de Grilla y Columnas</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Columnas en Pantallas de Escritorio (Desktop):
            </label>
            <select
              value={configForm.grid_columns}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, grid_columns: Number(e.target.value) }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value={2}>2 Columnas (Editorial grande)</option>
              <option value={3}>3 Columnas</option>
              <option value={4}>4 Columnas (Estándar)</option>
              <option value={5}>5 Columnas (Recomendado)</option>
              <option value={6}>6 Columnas (Compacto)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Columnas en Teléfonos Móviles:
            </label>
            <select
              value={configForm.mobile_grid_columns}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, mobile_grid_columns: Number(e.target.value) }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value={1}>1 Columna (Foto completa)</option>
              <option value={2}>2 Columnas (Estándar tipo Instagram)</option>
              <option value={3}>3 Columnas (Galería compacta)</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white">Ocultar Títulos de Álbumes</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Muestra las portadas como banners limpios de catálogo sin texto visible debajo de la foto.
            </div>
          </div>
          <input
            type="checkbox"
            checked={configForm.hide_album_titles}
            onChange={(e) =>
              setConfigForm((prev: any) => ({ ...prev, hide_album_titles: e.target.checked }))
            }
            className="w-5 h-5 rounded bg-slate-800 border-white/10 text-amber-500 focus:ring-amber-500 cursor-pointer"
          />
        </div>

        <h2 className="text-base font-bold text-white pt-4 border-t border-white/10">
          Paleta de Colores y Tarjetas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Color Primario (Encabezados/Botones):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.primary_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, primary_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.primary_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Color Secundario (Fondo/Superficies):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.secondary_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, secondary_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.secondary_color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Color de Textos:</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.text_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, text_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.text_color}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Grosor de Borde de Tarjetas (px):
            </label>
            <input
              type="number"
              min={0}
              max={8}
              value={configForm.card_border_width}
              onChange={(e) =>
                setConfigForm((prev: any) => ({ ...prev, card_border_width: Number(e.target.value) }))
              }
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Color del Borde de Tarjetas:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={configForm.card_border_color}
                onChange={(e) =>
                  setConfigForm((prev: any) => ({ ...prev, card_border_color: e.target.value }))
                }
                className="w-10 h-10 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
              />
              <span className="text-xs font-mono text-slate-300">{configForm.card_border_color}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingConfig}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow"
        >
          {savingConfig ? 'Guardando diseño...' : 'Guardar Diseño en Supabase'}
        </button>
      </div>
    </form>
  );
}
